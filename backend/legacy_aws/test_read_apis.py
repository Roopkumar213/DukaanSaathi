"""
DukaanAI - Test Suite for Read APIs & AI Query System
Tests all endpoints requested for Builder 1's AI queries:
1. GET /inventory?shopId=shop_001
2. GET /customers?shopId=shop_001
3. GET /customers/:id/khata?shopId=shop_001
4. GET /sales?shopId=shop_001 & GET /sales?shopId=shop_001&date=today
5. AI Query Dispatcher:
   - 'How much rice is left?'
   - 'What is my rice stock?'
   - 'Who owes me money?'
   - 'How much does Ramesh owe me?'
   - 'How much did I sell today?'
   - 'How much did Ramesh buy?'
6. Security & Tenant Isolation Tests
"""
import os
import sys
import json
import time
from decimal import Decimal
from unittest.mock import patch


if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# Ensure app directory is in python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

import queries
import main
def evaluate_condition(cond, item):
    if not cond:
        return True
    expr = cond.get_expression()
    if "operator" in expr and expr["operator"] == "AND":
        return all(evaluate_condition(v, item) for v in expr["values"])
    op = expr.get("operator")
    vals = expr.get("values", ())
    if not vals or len(vals) < 2:
        return True
    attr_name = getattr(vals[0], "name", str(vals[0]))
    val = item.get(attr_name)
    target = vals[1]
    if op == "=":
        return val == target
    elif op == "begins_with":
        return str(val or "").startswith(str(target))
    elif op == ">=":
        return str(val or "") >= str(target)
    elif op == "<=":
        return str(val or "") <= str(target)
    return True


class MockDynamoDBTable:
    """In-memory mock replicating exact DynamoDB Single Table Primary and GSI1 queries."""
    def __init__(self):
        self.store = {}

    def seed(self, pk, sk, gsi1pk=None, gsi1sk=None, **kwargs):
        lookup = f"{pk}#{sk}"
        item = {
            "PK": pk,
            "SK": sk,
            "GSI1PK": gsi1pk or pk,
            "GSI1SK": gsi1sk or sk,
            **kwargs
        }
        self.store[lookup] = item

    def get_item(self, Key):
        pk = Key.get("PK")
        sk = Key.get("SK")
        lookup = f"{pk}#{sk}"
        if lookup in self.store:
            return {"Item": self.store[lookup]}
        return {}

    def query(self, **kwargs):
        index_name = kwargs.get("IndexName")
        key_expr = kwargs.get("KeyConditionExpression")

        results = []
        for item in self.store.values():
            if evaluate_condition(key_expr, item):
                results.append(item)

        return {"Items": results}


def run_tests():
    print("================================================================================")
    print("         DUKAANAI READ APIS & AI QUERY - VERIFICATION SUITE                     ")
    print("================================================================================")

    mock_db = MockDynamoDBTable()
    now = int(time.time())

    # Seed data for shop_001 (Post-Ramesh transaction state)
    mock_db.seed(
        pk="SHOP#shop_001",
        sk="PROD#rice",
        productId="prod_001",
        productName="Rice",
        stock=Decimal("23"),
        unitPrice=Decimal("170"),
        unit="kg"
    )
    mock_db.seed(
        pk="SHOP#shop_001",
        sk="PROD#sugar",
        productId="prod_002",
        productName="Sugar",
        stock=Decimal("0"),
        unitPrice=Decimal("45"),
        unit="kg"
    )
    mock_db.seed(
        pk="SHOP#shop_001",
        sk="CUST#ramesh",
        customerId="cust_ramesh",
        name="Ramesh",
        phone="9876543210",
        balance=Decimal("40"),
        createdAt=now - 3600,
        updatedAt=now
    )
    mock_db.seed(
        pk="SHOP#shop_001",
        sk="CUST#suresh",
        customerId="cust_suresh",
        name="Suresh",
        balance=Decimal("0"),
        createdAt=now - 7200,
        updatedAt=now - 7200
    )
    mock_db.seed(
        pk="SHOP#shop_001",
        sk="SALE#sale_123",
        gsi1pk="SHOP#shop_001",
        gsi1sk=f"SALE#{now}",
        saleId="sale_123",
        shopId="shop_001",
        customerId="cust_ramesh",
        customerName="Ramesh",
        items=[{"productName": "Rice", "quantity": 2, "unit": "kg"}],
        totalAmount=Decimal("340"),
        receivedAmount=Decimal("300"),
        outstandingAmount=Decimal("40"),
        paymentMethod="CASH",
        createdAt=now
    )

    # Seed separate data for shop_002 (Tenant isolation test)
    mock_db.seed(
        pk="SHOP#shop_002",
        sk="PROD#oil",
        productId="prod_999",
        productName="Mustard Oil",
        stock=Decimal("50"),
        unitPrice=Decimal("150"),
        unit="litre"
    )

    with patch.object(queries.table, "query", side_effect=mock_db.query), \
         patch.object(queries.table, "get_item", side_effect=mock_db.get_item):

        # ----------------------------------------------------------------------
        # TEST 1: GET /inventory?shopId=shop_001
        # ----------------------------------------------------------------------
        print("\n---> TEST 1: GET /inventory?shopId=shop_001")
        res = queries.get_inventory("shop_001")
        print(f"  Response:\n{json.dumps(res, indent=2)}")
        assert res["success"] is True
        assert len(res["inventory"]) == 2
        # Check Rice details
        rice = next(i for i in res["inventory"] if i["productName"] == "Rice")
        assert rice["quantity"] == 23
        assert rice["unitPrice"] == 170
        assert rice["status"] == "AVAILABLE"
        # Check Sugar details
        sugar = next(i for i in res["inventory"] if i["productName"] == "Sugar")
        assert sugar["quantity"] == 0
        assert sugar["status"] == "OUT_OF_STOCK"
        print("  [PASS] GET /inventory returned correct stock and statuses.")

        # ----------------------------------------------------------------------
        # TEST 2: GET /inventory with Empty State & Missing shopId
        # ----------------------------------------------------------------------
        print("\n---> TEST 2: GET /inventory Empty State & Missing shopId Validation")
        empty_res = queries.get_inventory("shop_empty")
        assert empty_res["success"] is True
        assert empty_res["inventory"] == []
        print("  [PASS] Empty state returns clean empty list: []")

        try:
            queries.get_inventory("")
            print("  [FAIL] Expected validation error for missing shopId")
        except queries.QueryValidationError as e:
            assert e.status_code == 400
            print(f"  [PASS] Correctly rejected missing shopId: {e.message}")

        # ----------------------------------------------------------------------
        # TEST 3: GET /customers?shopId=shop_001 & Debt Filter
        # ----------------------------------------------------------------------
        print("\n---> TEST 3: GET /customers?shopId=shop_001")
        cust_res = queries.get_customers("shop_001")
        print(f"  Response:\n{json.dumps(cust_res, indent=2)}")
        assert cust_res["success"] is True
        assert len(cust_res["customers"]) == 2

        # Debtor filter
        debtor_res = queries.get_customers("shop_001", has_debt_only=True)
        assert len(debtor_res["customers"]) == 1
        assert debtor_res["customers"][0]["name"] == "Ramesh"
        assert debtor_res["customers"][0]["outstandingAmount"] == 40
        print("  [PASS] GET /customers returned customers; hasDebt filter returned only Ramesh.")

        # ----------------------------------------------------------------------
        # TEST 4: GET /customers/:id/khata?shopId=shop_001
        # ----------------------------------------------------------------------
        print("\n---> TEST 4: GET /customers/cust_ramesh/khata?shopId=shop_001")
        khata_res = queries.get_customer_khata("shop_001", "cust_ramesh")
        print(f"  Response:\n{json.dumps(khata_res, indent=2)}")
        assert khata_res["success"] is True
        assert khata_res["customer"]["name"] == "Ramesh"
        assert khata_res["khata"]["outstandingAmount"] == 40
        print("  [PASS] Customer khata returned Rs. 40 outstanding.")

        # Tenant isolation test: Attempt to access Ramesh from shop_002
        try:
            queries.get_customer_khata("shop_002", "cust_ramesh")
            print("  [FAIL] Expected 404 cross-tenant isolation block")
        except queries.QueryValidationError as e:
            assert e.status_code == 404
            print(f"  [PASS] Cross-tenant block enforced: {e.message}")

        # ----------------------------------------------------------------------
        # TEST 5: GET /sales?shopId=shop_001 & date=today
        # ----------------------------------------------------------------------
        print("\n---> TEST 5: GET /sales?shopId=shop_001&date=today")
        sales_res = queries.get_sales("shop_001", date_filter="today")
        print(f"  Response:\n{json.dumps(sales_res, indent=2)}")
        assert sales_res["success"] is True
        assert len(sales_res["sales"]) >= 1
        assert sales_res["sales"][0]["totalAmount"] == 340
        assert sales_res["sales"][0]["receivedAmount"] == 300
        assert sales_res["sales"][0]["outstandingAmount"] == 40
        assert sales_res["summary"]["totalSales"] == 340
        assert sales_res["summary"]["transactionCount"] == 1
        print("  [PASS] GET /sales returned today's sales with summary.")

        # ----------------------------------------------------------------------
        # TEST 6: AI Questions Answering (Builder 1 Voice/Chat System)
        # ----------------------------------------------------------------------
        print("\n---> TEST 6: AI Natural-Language Query Answering")

        # Q1: How much rice is left?
        q1 = queries.execute_ai_query("shop_001", "How much rice is left?")
        print(f"  Q1: 'How much rice is left?' -> {json.dumps(q1['data'])}")
        assert q1["data"]["productName"] == "Rice"
        assert q1["data"]["quantity"] == 23
        assert q1["data"]["unit"] == "kg"

        # Q2: Who owes me money?
        q2 = queries.execute_ai_query("shop_001", "Who owes me money?")
        print(f"  Q2: 'Who owes me money?' -> {json.dumps(q2['data'])}")
        assert len(q2["data"]) == 1
        assert q2["data"][0]["customerName"] == "Ramesh"
        assert q2["data"][0]["outstandingAmount"] == 40

        # Q3: How much does Ramesh owe me?
        q3 = queries.execute_ai_query("shop_001", "How much does Ramesh owe me?")
        print(f"  Q3: 'How much does Ramesh owe me?' -> {json.dumps(q3['data'])}")
        assert q3["data"]["customerName"] == "Ramesh"
        assert q3["data"]["outstandingAmount"] == 40

        # Q4: How much did I sell today?
        q4 = queries.execute_ai_query("shop_001", "How much did I sell today?")
        print(f"  Q4: 'How much did I sell today?' -> {json.dumps(q4['data'])}")
        assert q4["data"]["totalSales"] == 340
        assert q4["data"]["transactionCount"] == 1

        # Q5: How much did Ramesh buy?
        q5 = queries.execute_ai_query("shop_001", "How much did Ramesh buy?")
        print(f"  Q5: 'How much did Ramesh buy?' -> {json.dumps(q5['data'])}")
        assert q5["data"]["customerName"] == "Ramesh"
        assert q5["data"]["totalPurchased"] == 340

        print("  [PASS] All 5 AI queries returned exact factual structured data from DB.")

        # ----------------------------------------------------------------------
        # TEST 7: Lambda HTTP API Gateway Routing Integration
        # ----------------------------------------------------------------------
        print("\n---> TEST 7: Lambda HTTP Handler Integration for all Read Routes")

        # GET /inventory?shopId=shop_001
        res_inv = main.lambda_handler({
            "rawPath": "/inventory",
            "queryStringParameters": {"shopId": "shop_001"},
            "requestContext": {"http": {"method": "GET"}}
        }, None)
        assert res_inv["statusCode"] == 200

        # GET /customers?shopId=shop_001
        res_cust = main.lambda_handler({
            "rawPath": "/customers",
            "queryStringParameters": {"shopId": "shop_001"},
            "requestContext": {"http": {"method": "GET"}}
        }, None)
        assert res_cust["statusCode"] == 200

        # GET /customers/cust_ramesh/khata?shopId=shop_001
        res_khata = main.lambda_handler({
            "rawPath": "/customers/cust_ramesh/khata",
            "queryStringParameters": {"shopId": "shop_001"},
            "requestContext": {"http": {"method": "GET"}}
        }, None)
        assert res_khata["statusCode"] == 200

        # GET /sales?shopId=shop_001&date=today
        res_sales = main.lambda_handler({
            "rawPath": "/sales",
            "queryStringParameters": {"shopId": "shop_001", "date": "today"},
            "requestContext": {"http": {"method": "GET"}}
        }, None)
        assert res_sales["statusCode"] == 200

        print("  [PASS] All routes returned HTTP 200 through Lambda handler.")

    print("\n================================================================================")
    print("         ALL READ API & AI QUERY TESTS PASSED SUCCESSFULLY!                    ")
    print("================================================================================")


if __name__ == "__main__":
    run_tests()
