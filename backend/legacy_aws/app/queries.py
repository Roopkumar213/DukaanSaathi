"""
DukaanAI - Read APIs & AI Query Layer
Provides fast, tenant-isolated, zero-full-table-scan DynamoDB Query operations for:
- GET /inventory?shopId=...
- GET /customers?shopId=...
- GET /customers/:id/khata?shopId=...
- GET /sales?shopId=...&date=today
Authoritative source of truth for Builder 1's AI query system.
"""
import os
import time
import datetime
import logging
import json
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError

# Configure structured CloudWatch logger
logger = logging.getLogger("dukaanai.queries")
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


class QueryValidationError(Exception):
    def __init__(self, message: str, status_code: int = 400, error_type: str = "VALIDATION_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type


def _normalize(val: str) -> str:
    """Normalize string for consistent PK/SK lookups."""
    return val.strip().lower() if val else ""


def _num(val, default=0):
    """Convert DynamoDB Decimal to int/float."""
    if val is None:
        return default
    if isinstance(val, Decimal):
        return int(val) if val % 1 == 0 else float(val)
    if isinstance(val, (int, float)):
        return val
    try:
        f = float(val)
        return int(f) if f % 1 == 0 else f
    except (ValueError, TypeError):
        return default


# ==============================================================================
# 1. GET /inventory?shopId=shop_001
# ==============================================================================
def get_inventory(shop_id: str, product_name: str = None) -> dict:
    """
    Returns current inventory for a shop using direct Partition Key Query (Zero Scan).
    Tenant isolated: strictly queries PK = SHOP#<shopId>.
    """
    shop_id = (shop_id or "").strip()
    if not shop_id:
        raise QueryValidationError("shopId query parameter is required and cannot be empty", 400, "MISSING_SHOP_ID")

    if product_name:
        prod_key = _normalize(product_name)
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"SHOP#{shop_id}") & Key("SK").eq(f"PROD#{prod_key}")
        )
    else:
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"SHOP#{shop_id}") & Key("SK").begins_with("PROD#")
        )

    raw_items = response.get("Items", [])
    inventory = []

    for item in raw_items:
        prod_name = item.get("productName") or item.get("name", "Unknown")
        stock_qty = _num(item.get("stock", 0))
        unit_price = _num(item.get("unitPrice", item.get("price", 0)))
        unit = item.get("unit", "pcs")
        prod_id = item.get("productId") or item.get("id") or f"prod_{_normalize(prod_name)}"

        inventory.append({
            "productId": prod_id,
            "productName": prod_name,
            "quantity": stock_qty,
            "unit": unit,
            "unitPrice": unit_price,
            "status": "AVAILABLE" if stock_qty > 0 else "OUT_OF_STOCK"
        })

    logger.info(f'{{"action":"get_inventory", "shopId":"{shop_id}", "productFilter":"{product_name or "ALL"}", "itemCount":{len(inventory)}}}')

    return {
        "success": True,
        "inventory": inventory
    }


# ==============================================================================
# 2. GET /customers?shopId=shop_001
# ==============================================================================
def get_customers(shop_id: str, has_debt_only: bool = False) -> dict:
    """
    Returns customers belonging strictly to the shop using Partition Key Query (Zero Scan).
    Tenant isolated: strictly queries PK = SHOP#<shopId>.
    Supports filtering by customers with outstanding Khata debt (for "Who owes me money?").
    """
    shop_id = (shop_id or "").strip()
    if not shop_id:
        raise QueryValidationError("shopId query parameter is required and cannot be empty", 400, "MISSING_SHOP_ID")

    response = table.query(
        KeyConditionExpression=Key("PK").eq(f"SHOP#{shop_id}") & Key("SK").begins_with("CUST#")
    )

    raw_items = response.get("Items", [])
    customers = []

    for item in raw_items:
        cust_name = item.get("name") or item.get("customerName", "Unknown")
        outstanding = _num(item.get("balance", item.get("outstandingAmount", 0)))
        cust_id = item.get("customerId") or item.get("id") or f"cust_{_normalize(cust_name)}"
        phone = item.get("phone", None)
        created_at = item.get("createdAt") or item.get("updatedAt", int(time.time()))
        updated_at = item.get("updatedAt", int(time.time()))

        if has_debt_only and outstanding <= 0:
            continue

        customers.append({
            "customerId": cust_id,
            "name": cust_name,
            "phone": phone,
            "outstandingAmount": outstanding,
            "createdAt": created_at,
            "updatedAt": updated_at
        })

    logger.info(f'{{"action":"get_customers", "shopId":"{shop_id}", "hasDebtOnly":{str(has_debt_only).lower()}, "customerCount":{len(customers)}}}')

    return {
        "success": True,
        "customers": customers
    }


# ==============================================================================
# 3. GET /customers/:id/khata?shopId=shop_001
# ==============================================================================
def get_customer_khata(shop_id: str, customer_identifier: str) -> dict:
    """
    Returns a customer's outstanding balance and details.
    Enforces shop isolation: Customer must belong strictly to shop_id.
    """
    shop_id = (shop_id or "").strip()
    if not shop_id:
        raise QueryValidationError("shopId query parameter is required and cannot be empty", 400, "MISSING_SHOP_ID")

    customer_identifier = (customer_identifier or "").strip()
    if not customer_identifier:
        raise QueryValidationError("Customer identifier is required", 400, "MISSING_CUSTOMER_ID")

    key_normalized = _normalize(customer_identifier)

    # 1. Try exact SK match (e.g. CUST#ramesh)
    item = table.get_item(Key={"PK": f"SHOP#{shop_id}", "SK": f"CUST#{key_normalized}"}).get("Item")

    # 2. Try stripped prefix if passed as "cust_ramesh" -> "ramesh"
    if not item and key_normalized.startswith("cust_"):
        alt_key = key_normalized[5:]
        item = table.get_item(Key={"PK": f"SHOP#{shop_id}", "SK": f"CUST#{alt_key}"}).get("Item")

    # 3. If still not found, query customers of that shop and match customerId or normalized name
    if not item:
        query_res = table.query(
            KeyConditionExpression=Key("PK").eq(f"SHOP#{shop_id}") & Key("SK").begins_with("CUST#")
        )
        for c in query_res.get("Items", []):
            cid = c.get("customerId") or c.get("id") or ""
            cname = c.get("name") or c.get("customerName") or ""
            if cid == customer_identifier or _normalize(cname) == key_normalized:
                item = c
                break

    if not item:
        raise QueryValidationError(
            f"Customer '{customer_identifier}' not found for shop '{shop_id}'. Cannot access another shop's customer.",
            404,
            "CUSTOMER_NOT_FOUND"
        )

    cust_name = item.get("name") or item.get("customerName", customer_identifier)
    cust_id = item.get("customerId") or item.get("id") or f"cust_{_normalize(cust_name)}"
    outstanding = _num(item.get("balance", item.get("outstandingAmount", 0)))

    logger.info(f'{{"action":"get_customer_khata", "shopId":"{shop_id}", "customerId":"{cust_id}", "outstanding":{outstanding}}}')

    return {
        "success": True,
        "customer": {
            "customerId": cust_id,
            "name": cust_name
        },
        "khata": {
            "outstandingAmount": outstanding
        }
    }


# ==============================================================================
# 4. GET /sales?shopId=shop_001[&date=today][&customer=Ramesh]
# ==============================================================================
def get_sales(shop_id: str, date_filter: str = None, customer_filter: str = None) -> dict:
    """
    Returns sales for a shop using GSI1 query (Zero Scan).
    For 'today' sales: queries GSI1PK = SHOP#<shopId> AND GSI1SK >= SALE#<today_start_epoch>.
    This avoids scanning the entire table and leverages the stored epoch index.
    """
    shop_id = (shop_id or "").strip()
    if not shop_id:
        raise QueryValidationError("shopId query parameter is required and cannot be empty", 400, "MISSING_SHOP_ID")

    # GSI1 Query construction
    if date_filter and date_filter.lower() == "today":
        # Calculate start of today (midnight UTC / 00:00:00)
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        today_start_dt = now_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        today_start_epoch = int(today_start_dt.timestamp())

        response = table.query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1PK").eq(f"SHOP#{shop_id}") & Key("GSI1SK").gte(f"SALE#{today_start_epoch}"),
            ScanIndexForward=False  # Newest first
        )
    else:
        response = table.query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1PK").eq(f"SHOP#{shop_id}") & Key("GSI1SK").begins_with("SALE#"),
            ScanIndexForward=False  # Newest first
        )

    raw_items = response.get("Items", [])
    sales_list = []
    total_sales_amount = 0

    for item in raw_items:
        cust_name = item.get("customerName", "Walk-in")
        
        # Optional customer filter (for "How much did Ramesh buy?")
        if customer_filter and _normalize(customer_filter) not in _normalize(cust_name):
            continue

        sale_total = _num(item.get("totalAmount", 0))
        received_amt = _num(item.get("receivedAmount", 0))
        outstanding_amt = _num(item.get("outstandingAmount", 0))
        total_sales_amount += sale_total

        sales_list.append({
            "saleId": item.get("saleId", item.get("SK", "").replace("SALE#", "")),
            "customerName": cust_name,
            "items": item.get("items", []),
            "totalAmount": sale_total,
            "receivedAmount": received_amt,
            "outstandingAmount": outstanding_amt,
            "paymentMethod": item.get("paymentMethod", "CASH"),
            "createdAt": item.get("createdAt", int(time.time()))
        })

    logger.info(f'{{"action":"get_sales", "shopId":"{shop_id}", "dateFilter":"{date_filter or "ALL"}", "salesCount":{len(sales_list)}, "totalAmount":{total_sales_amount}}}')

    return {
        "success": True,
        "sales": sales_list,
        "summary": {
            "totalSales": total_sales_amount,
            "transactionCount": len(sales_list)
        }
    }


# ==============================================================================
# 5. STRUCTURED AI QUERY DISPATCHER (Builder 1 Assistant Integration)
# ==============================================================================
def execute_ai_query(shop_id: str, question: str) -> dict:
    """
    Translates common shopkeeper questions into authoritative, structured DB data:
    - 'How much rice is left?' / 'What is my rice stock?'
    - 'Who owes me money?'
    - 'How much does Ramesh owe me?'
    - 'How much did I sell today?'
    - 'How much did Ramesh buy?'
    Returns structured factual data directly from DynamoDB.
    """
    shop_id = (shop_id or "").strip()
    if not shop_id:
        raise QueryValidationError("shopId is required", 400, "MISSING_SHOP_ID")

    q_lower = (question or "").strip().lower()

    # 1. Stock / Inventory inquiry: "rice stock", "how much rice is left"
    if "stock" in q_lower or "left" in q_lower or "inventory" in q_lower:
        # Extract product keyword if possible (e.g. rice, dal, sugar, oil)
        inv = get_inventory(shop_id)["inventory"]
        for prod in inv:
            if prod["productName"].lower() in q_lower:
                return {
                    "success": True,
                    "queryType": "INVENTORY_CHECK",
                    "data": {
                        "productName": prod["productName"],
                        "quantity": prod["quantity"],
                        "unit": prod["unit"],
                        "status": prod["status"]
                    }
                }
        # Fallback to all inventory if no single item matched
        return {
            "success": True,
            "queryType": "INVENTORY_LIST",
            "data": inv
        }

    # 2. General Debt inquiry: "Who owes me money?", "who owes"
    elif "who owes" in q_lower or "owes me money" in q_lower or "udhar" in q_lower and "who" in q_lower:
        debtors = get_customers(shop_id, has_debt_only=True)["customers"]
        data = [{"customerName": d["name"], "outstandingAmount": d["outstandingAmount"]} for d in debtors]
        return {
            "success": True,
            "queryType": "DEBTOR_LIST",
            "data": data
        }

    # 3. Individual customer debt inquiry: "How much does Ramesh owe me?"
    elif "owe" in q_lower or "khata" in q_lower:
        customers = get_customers(shop_id)["customers"]
        for c in customers:
            if c["name"].lower() in q_lower:
                khata = get_customer_khata(shop_id, c["name"])
                return {
                    "success": True,
                    "queryType": "CUSTOMER_KHATA",
                    "data": {
                        "customerName": khata["customer"]["name"],
                        "outstandingAmount": khata["khata"]["outstandingAmount"]
                    }
                }

    # 4. Today's sales inquiry: "How much did I sell today?", "today sales"
    if "today" in q_lower and ("sell" in q_lower or "sales" in q_lower or "revenue" in q_lower or "kamai" in q_lower):
        sales_data = get_sales(shop_id, date_filter="today")
        return {
            "success": True,
            "queryType": "TODAY_SALES_SUMMARY",
            "data": {
                "totalSales": sales_data["summary"]["totalSales"],
                "transactionCount": sales_data["summary"]["transactionCount"]
            }
        }

    # 5. Customer purchase inquiry: "How much did Ramesh buy?"
    if "buy" in q_lower or "bought" in q_lower or "purchase" in q_lower:
        customers = get_customers(shop_id)["customers"]
        for c in customers:
            if c["name"].lower() in q_lower:
                cust_sales = get_sales(shop_id, customer_filter=c["name"])
                return {
                    "success": True,
                    "queryType": "CUSTOMER_PURCHASES",
                    "data": {
                        "customerName": c["name"],
                        "totalPurchased": cust_sales["summary"]["totalSales"],
                        "ordersCount": cust_sales["summary"]["transactionCount"]
                    }
                }

    # Fallback to general shop status
    inv = get_inventory(shop_id)["inventory"]
    today_sales = get_sales(shop_id, date_filter="today")
    return {
        "success": True,
        "queryType": "GENERAL_SUMMARY",
        "data": {
            "todaySales": today_sales["summary"]["totalSales"],
            "todayTransactions": today_sales["summary"]["transactionCount"],
            "totalProducts": len(inv)
        }
    }
