"""
DukaanAI - Production-ready MVP Sales Flow
Atomic multi-item billing, inventory deduction, and customer khata updates.
Backend is the authoritative source of truth.
"""
import os
import time
import uuid
import logging
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError

# Configure structured CloudWatch logger
logger = logging.getLogger("dukaanai.sales")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter('{"time":"%(asctime)s", "level":"%(levelname)s", "logger":"%(name)s", "message":%(message)s}')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "dukaanai-dev-table")
REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)
dynamo_client = dynamodb.meta.client


class SalesValidationError(Exception):
    def __init__(self, message: str, status_code: int = 400, error_type: str = "VALIDATION_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type


def normalize_key(name: str) -> str:
    """Normalize string for consistent PK/SK lookups (lowercase, stripped)."""
    return name.strip().lower()


def get_shop_product(shop_id: str, product_name: str) -> dict:
    """
    Finds a product belonging strictly to the specified shop.
    Guarantees tenant isolation: PK = SHOP#<shopId>, SK = PROD#<normalizedName>.
    """
    prod_key = normalize_key(product_name)
    response = table.get_item(
        Key={
            "PK": f"SHOP#{shop_id}",
            "SK": f"PROD#{prod_key}",
        }
    )
    return response.get("Item")


def create_sale(payload: dict) -> dict:
    """
    Executes the createSale flow with atomic DynamoDB transactions.
    
    Validates:
    1. shopId is provided and non-empty.
    2. customer object and name are provided.
    3. items list is non-empty.
    4. Each product belongs to shopId and exists in DB.
    5. Each item quantity > 0.
    6. Sufficient inventory exists (stock >= quantity) to prevent negative stock.
    7. Calculates actualTotalAmount = sum(item.quantity * product.unitPrice).
    8. Calculates outstandingAmount = actualTotalAmount - receivedAmount (never trust client outstanding).
    9. Atomically executes TransactWriteItems:
       - Deduct inventory with ConditionExpression 'attribute_exists(PK) AND stock >= :qty'
       - Upsert customer khata balance atomically
       - Insert sale record
       - Insert payment record / transaction audit log
    """
    now = int(time.time())

    # 1. Validate shopId
    shop_id = (payload.get("shopId") or "").strip()
    if not shop_id:
        raise SalesValidationError("shopId is required and cannot be empty", 400, "MISSING_SHOP_ID")

    # 2. Validate Customer
    customer = payload.get("customer") or {}
    customer_name = (customer.get("name") or "").strip()
    if not customer_name:
        raise SalesValidationError("customer.name is required", 400, "MISSING_CUSTOMER_NAME")

    # 3. Validate Items
    items = payload.get("items")
    if not items or not isinstance(items, list):
        raise SalesValidationError("items must be a non-empty list", 400, "INVALID_ITEMS")

    # 4. Validate Payment
    payment = payload.get("payment") or {}
    received_amount = payment.get("receivedAmount")
    payment_method = (payment.get("method") or "CASH").upper()

    if received_amount is None or received_amount < 0:
        raise SalesValidationError("payment.receivedAmount must be a non-negative number", 400, "INVALID_PAYMENT")

    # Fetch and validate all products against DB (tenant isolated by shopId)
    calculated_total_amount = Decimal("0")
    inventory_updates = []
    transact_items = []
    inventory_response = []

    for idx, item in enumerate(items):
        prod_name = (item.get("productName") or "").strip()
        if not prod_name:
            raise SalesValidationError(f"items[{idx}].productName is required", 400, "MISSING_PRODUCT_NAME")

        quantity = item.get("quantity")
        if quantity is None or quantity <= 0:
            raise SalesValidationError(
                f"Invalid quantity for '{prod_name}'. Quantity must be greater than 0, got: {quantity}",
                400,
                "INVALID_QUANTITY"
            )

        # Look up product in shop catalog
        prod_item = get_shop_product(shop_id, prod_name)
        if not prod_item:
            raise SalesValidationError(
                f"Product '{prod_name}' not found for shop '{shop_id}'. Cannot sell items from another shop.",
                404,
                "PRODUCT_NOT_FOUND"
            )

        current_stock = Decimal(str(prod_item.get("stock", 0)))
        unit_price = Decimal(str(prod_item.get("unitPrice", prod_item.get("price", 0))))
        unit = item.get("unit") or prod_item.get("unit", "pcs")
        requested_qty = Decimal(str(quantity))

        # Check inventory availability (Do not allow negative stock)
        if current_stock < requested_qty:
            raise SalesValidationError(
                f"Insufficient inventory for '{prod_name}'. Requested: {quantity} {unit}, Available: {current_stock} {unit}.",
                400,
                "INSUFFICIENT_INVENTORY"
            )

        line_total = requested_qty * unit_price
        calculated_total_amount += line_total

        new_stock = current_stock - requested_qty
        inventory_response.append({
            "productName": prod_name,
            "previousQuantity": int(current_stock) if current_stock % 1 == 0 else float(current_stock),
            "newQuantity": int(new_stock) if new_stock % 1 == 0 else float(new_stock),
            "unit": unit,
        })

        # Add Inventory Deduction to Transaction
        prod_key = normalize_key(prod_name)
        transact_items.append({
            "Update": {
                "TableName": TABLE_NAME,
                "Key": {
                    "PK": {"S": f"SHOP#{shop_id}"},
                    "SK": {"S": f"PROD#{prod_key}"},
                },
                "UpdateExpression": "SET stock = stock - :qty, updatedAt = :now",
                "ConditionExpression": "attribute_exists(PK) AND stock >= :qty",
                "ExpressionAttributeValues": {
                    ":qty": {"N": str(requested_qty)},
                    ":now": {"N": str(now)},
                },
            }
        })

    # 5. Backend Authoritative Calculation of Outstanding Khata Amount
    received_amount_dec = Decimal(str(received_amount))
    outstanding_amount_dec = calculated_total_amount - received_amount_dec

    # Log authoritative calculation
    logger.info(f'{{"action":"sale_calculation", "shopId":"{shop_id}", "calculatedTotal":{float(calculated_total_amount)}, "received":{float(received_amount_dec)}, "outstanding":{float(outstanding_amount_dec)}}}')

    # 6. Generate Unique Sale ID
    sale_id = f"sale_{now}_{uuid.uuid4().hex[:6]}"
    cust_key = normalize_key(customer_name)
    cust_id = customer.get("id") or f"cust_{cust_key}"

    # 7. Add Khata Update to Transaction (Upsert customer balance)
    transact_items.append({
        "Update": {
            "TableName": TABLE_NAME,
            "Key": {
                "PK": {"S": f"SHOP#{shop_id}"},
                "SK": {"S": f"CUST#{cust_key}"},
            },
            "UpdateExpression": "SET balance = if_not_exists(balance, :zero) + :outstanding, #cname = if_not_exists(#cname, :name_val), customerId = if_not_exists(customerId, :cid), updatedAt = :now",
            "ExpressionAttributeNames": {
                "#cname": "name",
            },
            "ExpressionAttributeValues": {
                ":zero": {"N": "0"},
                ":outstanding": {"N": str(outstanding_amount_dec)},
                ":name_val": {"S": customer_name},
                ":cid": {"S": cust_id},
                ":now": {"N": str(now)},
            },
        }
    })

    # 8. Add Sale Record to Transaction
    sale_item_db = {
        "PK": {"S": f"SHOP#{shop_id}"},
        "SK": {"S": f"SALE#{sale_id}"},
        "GSI1PK": {"S": f"SHOP#{shop_id}"},
        "GSI1SK": {"S": f"SALE#{now}"},
        "saleId": {"S": sale_id},
        "shopId": {"S": shop_id},
        "customerId": {"S": cust_id},
        "customerName": {"S": customer_name},
        "totalAmount": {"N": str(calculated_total_amount)},
        "receivedAmount": {"N": str(received_amount_dec)},
        "outstandingAmount": {"N": str(outstanding_amount_dec)},
        "paymentMethod": {"S": payment_method},
        "createdAt": {"N": str(now)},
    }
    transact_items.append({
        "Put": {
            "TableName": TABLE_NAME,
            "Item": sale_item_db,
            "ConditionExpression": "attribute_not_exists(PK)",
        }
    })

    # 9. Add Payment Record to Transaction
    payment_id = f"pay_{now}_{uuid.uuid4().hex[:6]}"
    payment_item_db = {
        "PK": {"S": f"SHOP#{shop_id}"},
        "SK": {"S": f"PAY#{sale_id}"},
        "paymentId": {"S": payment_id},
        "saleId": {"S": sale_id},
        "shopId": {"S": shop_id},
        "customerName": {"S": customer_name},
        "receivedAmount": {"N": str(received_amount_dec)},
        "method": {"S": payment_method},
        "createdAt": {"N": str(now)},
    }
    transact_items.append({
        "Put": {
            "TableName": TABLE_NAME,
            "Item": payment_item_db,
            "ConditionExpression": "attribute_not_exists(PK)",
        }
    })

    # 10. Execute Atomic DynamoDB Transaction
    try:
        dynamo_client.transact_write_items(TransactItems=transact_items)
        logger.info(f'{{"action":"sale_transaction_committed", "shopId":"{shop_id}", "saleId":"{sale_id}", "itemsCount":{len(items)}, "outstanding":{float(outstanding_amount_dec)}}}')
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code")
        if code == "TransactionCanceledException":
            cancellation_reasons = e.response.get("CancellationReasons", [])
            logger.error(f'{{"action":"sale_transaction_canceled", "shopId":"{shop_id}", "reasons":{cancellation_reasons}}}')
            # Check if inventory condition check failed during concurrent purchase
            raise SalesValidationError(
                "Transaction failed due to concurrent update or inventory stock condition failure. Please retry.",
                409,
                "CONCURRENT_CONFLICT"
            )
        else:
            logger.error(f'{{"action":"dynamodb_error", "error":"{str(e)}"}}')
            raise

    # 11. Format Exact Expected Response
    return {
        "success": True,
        "sale": {
            "saleId": sale_id,
            "totalAmount": int(calculated_total_amount) if calculated_total_amount % 1 == 0 else float(calculated_total_amount),
        },
        "inventory": inventory_response,
        "payment": {
            "receivedAmount": int(received_amount_dec) if received_amount_dec % 1 == 0 else float(received_amount_dec),
        },
        "khata": {
            "outstandingAmount": int(outstanding_amount_dec) if outstanding_amount_dec % 1 == 0 else float(outstanding_amount_dec),
        },
    }
