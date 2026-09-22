"""
DukaanAI - DynamoDB Client Layer (Single Table Architecture)
Clean, hackathon-friendly utilities for Kirana inventory, khata, and sales.
"""
import os
import time
import uuid
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "dukaanai-dev-table")
REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)


def _convert_float_to_decimal(obj):
    """DynamoDB rejects raw Python floats; convert to Decimal."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: _convert_float_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_float_to_decimal(v) for v in obj]
    return obj


def _convert_decimal_to_float(obj):
    """Convert DynamoDB Decimals back to standard JSON numbers/floats."""
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    elif isinstance(obj, dict):
        return {k: _convert_decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_decimal_to_float(v) for v in obj]
    return obj


# ==============================================================================
# INVENTORY / PRODUCTS
# PK: PROD#<id> | SK: METADATA
# GSI1PK: STORE#MAIN | GSI1SK: PROD#<name>
# ==============================================================================
def put_product(product_data: dict) -> dict:
    item_id = product_data.get("id") or f"prod_{uuid.uuid4().hex[:8]}"
    name = product_data.get("name", "Unnamed Item")
    item = {
        "PK": f"PROD#{item_id}",
        "SK": "METADATA",
        "GSI1PK": "STORE#MAIN",
        "GSI1SK": f"PROD#{name.lower()}",
        "id": item_id,
        "name": name,
        "category": product_data.get("category", "General"),
        "price": product_data.get("price", 0),
        "stock": product_data.get("stock", 0),
        "unit": product_data.get("unit", "pcs"),
        "minStock": product_data.get("minStock", 5),
        "updatedAt": int(time.time()),
    }
    table.put_item(Item=_convert_float_to_decimal(item))
    return _convert_decimal_to_float(item)


def get_all_products() -> list:
    response = table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("GSI1PK").eq("STORE#MAIN") & Key("GSI1SK").begins_with("PROD#")
    )
    items = response.get("Items", [])
    return _convert_decimal_to_float(items)


def adjust_stock(product_id: str, quantity_delta: int) -> dict:
    """Adjust product stock (negative delta reduces stock on sale)."""
    response = table.update_item(
        Key={"PK": f"PROD#{product_id}", "SK": "METADATA"},
        UpdateExpression="SET stock = stock + :delta, updatedAt = :time",
        ExpressionAttributeValues={
            ":delta": Decimal(str(quantity_delta)),
            ":time": int(time.time()),
        },
        ReturnValues="ALL_NEW",
    )
    return _convert_decimal_to_float(response.get("Attributes", {}))


# ==============================================================================
# KHATA / CUSTOMER CREDIT LEDGER
# PK: CUST#<phone_or_id> | SK: PROFILE
# GSI1PK: STORE#MAIN | GSI1SK: CUST#<name>
# ==============================================================================
def put_customer(customer_data: dict) -> dict:
    cust_id = customer_data.get("id") or customer_data.get("phone") or f"cust_{uuid.uuid4().hex[:8]}"
    name = customer_data.get("name", "Unknown Customer")
    item = {
        "PK": f"CUST#{cust_id}",
        "SK": "PROFILE",
        "GSI1PK": "STORE#MAIN",
        "GSI1SK": f"CUST#{name.lower()}",
        "id": cust_id,
        "name": name,
        "phone": customer_data.get("phone", ""),
        "balance": customer_data.get("balance", 0), # Positive balance = customer owes money (Udhar)
        "creditLimit": customer_data.get("creditLimit", 5000),
        "updatedAt": int(time.time()),
    }
    table.put_item(Item=_convert_float_to_decimal(item))
    return _convert_decimal_to_float(item)


def get_all_customers() -> list:
    response = table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("GSI1PK").eq("STORE#MAIN") & Key("GSI1SK").begins_with("CUST#")
    )
    items = response.get("Items", [])
    return _convert_decimal_to_float(items)


def update_khata_balance(cust_id: str, amount_delta: float) -> dict:
    """Add or reduce customer khata balance (positive adds to udhar, negative records repayment)."""
    response = table.update_item(
        Key={"PK": f"CUST#{cust_id}", "SK": "PROFILE"},
        UpdateExpression="SET balance = balance + :delta, updatedAt = :time",
        ExpressionAttributeValues={
            ":delta": Decimal(str(amount_delta)),
            ":time": int(time.time()),
        },
        ReturnValues="ALL_NEW",
    )
    return _convert_decimal_to_float(response.get("Attributes", {}))


# ==============================================================================
# SALES & BILLING
# PK: BILL#<id> | SK: METADATA
# GSI1PK: STORE#MAIN | GSI1SK: BILL#<timestamp>
# ==============================================================================
def record_sale(sale_data: dict) -> dict:
    bill_id = sale_data.get("id") or f"bill_{uuid.uuid4().hex[:8]}"
    now = int(time.time())
    item = {
        "PK": f"BILL#{bill_id}",
        "SK": "METADATA",
        "GSI1PK": "STORE#MAIN",
        "GSI1SK": f"BILL#{now}",
        "id": bill_id,
        "items": sale_data.get("items", []),
        "totalAmount": sale_data.get("totalAmount", 0),
        "paymentMode": sale_data.get("paymentMode", "cash"), # cash, upi, khata, split
        "customerId": sale_data.get("customerId"),
        "customerName": sale_data.get("customerName"),
        "rawSpeechText": sale_data.get("rawSpeechText"),
        "createdAt": now,
    }
    table.put_item(Item=_convert_float_to_decimal(item))
    return _convert_decimal_to_float(item)


def get_recent_sales(limit: int = 20) -> list:
    response = table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("GSI1PK").eq("STORE#MAIN") & Key("GSI1SK").begins_with("BILL#"),
        ScanIndexForward=False, # Newest first
        Limit=limit
    )
    return _convert_decimal_to_float(response.get("Items", []))


# ==============================================================================
# SHOP-ISOLATED HELPERS (Tenant Isolation by shopId)
# ==============================================================================
def put_shop_product(shop_id: str, product_name: str, stock: int, unit_price: float, unit: str = "kg", category: str = "Groceries") -> dict:
    prod_key = product_name.strip().lower()
    item = {
        "PK": f"SHOP#{shop_id}",
        "SK": f"PROD#{prod_key}",
        "GSI1PK": f"SHOP#{shop_id}",
        "GSI1SK": f"PROD#{prod_key}",
        "shopId": shop_id,
        "productName": product_name,
        "unitPrice": unit_price,
        "price": unit_price,
        "stock": stock,
        "unit": unit,
        "category": category,
        "updatedAt": int(time.time()),
    }
    table.put_item(Item=_convert_float_to_decimal(item))
    return _convert_decimal_to_float(item)


def get_shop_product(shop_id: str, product_name: str) -> dict:
    prod_key = product_name.strip().lower()
    res = table.get_item(Key={"PK": f"SHOP#{shop_id}", "SK": f"PROD#{prod_key}"})
    item = res.get("Item")
    return _convert_decimal_to_float(item) if item else None


def get_shop_customer(shop_id: str, customer_name: str) -> dict:
    cust_key = customer_name.strip().lower()
    res = table.get_item(Key={"PK": f"SHOP#{shop_id}", "SK": f"CUST#{cust_key}"})
    item = res.get("Item")
    return _convert_decimal_to_float(item) if item else None


def get_shop_sale(shop_id: str, sale_id: str) -> dict:
    res = table.get_item(Key={"PK": f"SHOP#{shop_id}", "SK": f"SALE#{sale_id}"})
    item = res.get("Item")
    return _convert_decimal_to_float(item) if item else None

