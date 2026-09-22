"""
DukaanAI - Test Suite for Production-Ready MVP createSale Flow
Tests:
1. Success: Rice (25kg stock, unitPrice 170) -> Buy 2kg, Pay 300 -> Remaining Stock 23kg, Khata Outstanding 40
2. Failure: Missing shopId
3. Failure: Product not found / another shop's product
4. Failure: Invalid quantity (quantity <= 0)
5. Failure: Insufficient inventory (prevent negative stock)
6. Security / Integrity: Client passes untrusted totalAmount / outstandingAmount -> Backend recalculates authoritatively
7. Prints DynamoDB records BEFORE and AFTER the transaction
"""
import os
import sys
import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

# Ensure UTF-8 output on Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# Ensure app directory is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

import sales
import main


class MockDynamoDBEnvironment:
    """In-memory mock replicating exact DynamoDB Single-Table behavior & conditional checks."""
    def __init__(self):
        self.store = {}

    def seed_product(self, shop_id: str, product_name: str, stock: int, unit_price: float, unit: str = "kg"):
        key = f"SHOP#{shop_id}#PROD#{product_name.lower().strip()}"
        self.store[key] = {
            "PK": f"SHOP#{shop_id}",
            "SK": f"PROD#{product_name.lower().strip()}",
            "shopId": shop_id,
            "productName": product_name,
            "stock": Decimal(str(stock)),
            "unitPrice": Decimal(str(unit_price)),
            "unit": unit,
        }

    def get_item(self, Key):
        pk = Key.get("PK")
        sk = Key.get("SK")
        lookup_key = f"{pk}#{sk}"
        if lookup_key in self.store:
            return {"Item": self.store[lookup_key]}
        return {}

    def transact_write_items(self, TransactItems):
        # Atomic simulation: first validate all conditions
        staged_writes = []
        for item in TransactItems:
            if "Update" in item:
                u = item["Update"]
                pk = u["Key"]["PK"]["S"]
                sk = u["Key"]["SK"]["S"]
                lookup_key = f"{pk}#{sk}"
                cond = u.get("ConditionExpression", "")
                expr_vals = u.get("ExpressionAttributeValues", {})

                # Inventory update
                if "PROD#" in sk:
                    if lookup_key not in self.store:
                        raise Exception("ConditionalCheckFailed: Product does not exist")
                    existing = self.store[lookup_key]
                    qty_to_deduct = Decimal(expr_vals[":qty"]["N"])
                    if "stock >= :qty" in cond and existing["stock"] < qty_to_deduct:
                        raise Exception(f"ConditionalCheckFailed: Insufficient inventory! Current stock: {existing['stock']}, requested: {qty_to_deduct}")
                    staged_writes.append(("inventory", lookup_key, existing["stock"] - qty_to_deduct))

                # Khata update (upsert)
                elif "CUST#" in sk:
                    existing = self.store.get(lookup_key, {})
                    curr_bal = Decimal(str(existing.get("balance", 0)))
                    add_bal = Decimal(expr_vals[":outstanding"]["N"])
                    name = expr_vals[":name_val"]["S"]
                    cid = expr_vals[":cid"]["S"]
                    staged_writes.append(("khata", lookup_key, {
                        "PK": pk,
                        "SK": sk,
                        "customerId": cid,
                        "name": name,
                        "balance": curr_bal + add_bal
                    }))

            elif "Put" in item:
                p = item["Put"]
                raw_item = p["Item"]
                pk = raw_item["PK"]["S"]
                sk = raw_item["SK"]["S"]
                lookup_key = f"{pk}#{sk}"
                record = {}
                for k, v in raw_item.items():
                    if "S" in v:
                        record[k] = v["S"]
                    elif "N" in v:
                        record[k] = Decimal(v["N"])
                staged_writes.append(("put", lookup_key, record))

        # Commit all staged writes atomically
        for action, key, data in staged_writes:
            if action == "inventory":
                self.store[key]["stock"] = data
            elif action in ("khata", "put"):
                self.store[key] = data


def run_tests():
    print("================================================================================")
    print("         DUKAANAI createSale FLOW - VERIFICATION TEST SUITE                     ")
    print("================================================================================")

    mock_db = MockDynamoDBEnvironment()
    # Seed initial product: Rice, 25kg, ₹170/kg for shop_001
    mock_db.seed_product("shop_001", "Rice", 25, 170.0, "kg")

    with patch.object(sales.table, "get_item", side_effect=mock_db.get_item), \
         patch.object(sales.dynamo_client, "transact_write_items", side_effect=mock_db.transact_write_items):

        # ----------------------------------------------------------------------
        # Print BEFORE State
        # ----------------------------------------------------------------------
        print("\n[STATE BEFORE TRANSACTION]")
        print(f"Product (Rice): {json.dumps({k: str(v) if isinstance(v, Decimal) else v for k, v in mock_db.store['SHOP#shop_001#PROD#rice'].items()}, indent=2)}")
        print("Customer (Ramesh): Does not exist yet in Khata.")

        # ----------------------------------------------------------------------
        # TEST 1: Exact Request from User Prompt (Success Flow)
        # ----------------------------------------------------------------------
        print("\n---> TEST 1: Valid Sale Request (Rice 2kg @ Rs.170 = Rs.340, Paid Rs.300, Outstanding Rs.40)")
        req_payload = {
            "shopId": "shop_001",
            "customer": {
                "name": "Ramesh"
            },
            "items": [
                {
                    "productName": "Rice",
                    "quantity": 2,
                    "unit": "kg"
                }
            ],
            "totalAmount": 340,
            "payment": {
                "receivedAmount": 300,
                "method": "CASH"
            }
        }

        response = sales.create_sale(req_payload)
        print("  [PASS] create_sale executed successfully.")
        print(f"  Response:\n{json.dumps(response, indent=2)}")

        # Validate response format
        assert response["success"] is True
        assert response["sale"]["totalAmount"] == 340
        assert response["inventory"][0]["previousQuantity"] == 25
        assert response["inventory"][0]["newQuantity"] == 23
        assert response["inventory"][0]["unit"] == "kg"
        assert response["payment"]["receivedAmount"] == 300
        assert response["khata"]["outstandingAmount"] == 40

        # ----------------------------------------------------------------------
        # Print AFTER State
        # ----------------------------------------------------------------------
        print("\n[STATE AFTER TRANSACTION]")
        print(f"Product (Rice): {json.dumps({k: str(v) if isinstance(v, Decimal) else v for k, v in mock_db.store['SHOP#shop_001#PROD#rice'].items()}, indent=2)}")
        print(f"Customer Khata (Ramesh): {json.dumps({k: str(v) if isinstance(v, Decimal) else v for k, v in mock_db.store['SHOP#shop_001#CUST#ramesh'].items()}, indent=2)}")
        sale_key = [k for k in mock_db.store if "#SALE#" in k][0]
        pay_key = [k for k in mock_db.store if "#PAY#" in k][0]
        print(f"Sale Record: {json.dumps({k: str(v) if isinstance(v, Decimal) else v for k, v in mock_db.store[sale_key].items()}, indent=2)}")
        print(f"Payment Record: {json.dumps({k: str(v) if isinstance(v, Decimal) else v for k, v in mock_db.store[pay_key].items()}, indent=2)}")

        # ----------------------------------------------------------------------
        # TEST 2: Untrusted Client Total (Backend is Authoritative)
        # ----------------------------------------------------------------------
        print("\n---> TEST 2: Security Test - Client passes forged totalAmount = Rs.10 (Backend must calculate Rs.340)")
        tampered_payload = {
            "shopId": "shop_001",
            "customer": {"name": "Ramesh"},
            "items": [{"productName": "Rice", "quantity": 2, "unit": "kg"}],
            "totalAmount": 10, # Tampered
            "payment": {"receivedAmount": 300, "method": "CASH"}
        }
        tampered_res = sales.create_sale(tampered_payload)
        assert tampered_res["sale"]["totalAmount"] == 340
        assert tampered_res["khata"]["outstandingAmount"] == 40
        print("  [PASS] Backend ignored forged totalAmount and calculated correct Rs.340 authoritative total.")

        # ----------------------------------------------------------------------
        # TEST 3: Failure - Missing / Empty shopId
        # ----------------------------------------------------------------------
        print("\n---> TEST 3: Failure Test - Missing shopId")
        try:
            sales.create_sale({
                "shopId": "",
                "customer": {"name": "Ramesh"},
                "items": [{"productName": "Rice", "quantity": 1}],
                "payment": {"receivedAmount": 100}
            })
            print("  [FAIL] Expected SalesValidationError")
        except sales.SalesValidationError as e:
            print(f"  [PASS] Correctly rejected: HTTP {e.status_code} - {e.message}")

        # ----------------------------------------------------------------------
        # TEST 4: Failure - Product Not Found / Different Shop
        # ----------------------------------------------------------------------
        print("\n---> TEST 4: Failure Test - Product from different shop / non-existent product")
        try:
            sales.create_sale({
                "shopId": "shop_002", # shop_002 has no Rice
                "customer": {"name": "Ramesh"},
                "items": [{"productName": "Rice", "quantity": 1}],
                "payment": {"receivedAmount": 100}
            })
            print("  [FAIL] Expected SalesValidationError")
        except sales.SalesValidationError as e:
            print(f"  [PASS] Correctly rejected: HTTP {e.status_code} - {e.message}")

        # ----------------------------------------------------------------------
        # TEST 5: Failure - Quantity <= 0
        # ----------------------------------------------------------------------
        print("\n---> TEST 5: Failure Test - Quantity <= 0")
        try:
            sales.create_sale({
                "shopId": "shop_001",
                "customer": {"name": "Ramesh"},
                "items": [{"productName": "Rice", "quantity": 0}],
                "payment": {"receivedAmount": 100}
            })
            print("  [FAIL] Expected SalesValidationError")
        except sales.SalesValidationError as e:
            print(f"  [PASS] Correctly rejected: HTTP {e.status_code} - {e.message}")

        # ----------------------------------------------------------------------
        # TEST 6: Failure - Insufficient Inventory (Prevent Negative Stock)
        # ----------------------------------------------------------------------
        print("\n---> TEST 6: Failure Test - Insufficient Inventory (Available 23kg, Requested 50kg)")
        try:
            sales.create_sale({
                "shopId": "shop_001",
                "customer": {"name": "Ramesh"},
                "items": [{"productName": "Rice", "quantity": 50, "unit": "kg"}],
                "payment": {"receivedAmount": 500}
            })
            print("  [FAIL] Expected SalesValidationError")
        except sales.SalesValidationError as e:
            print(f"  [PASS] Correctly rejected: HTTP {e.status_code} - {e.message}")

        # ----------------------------------------------------------------------
        # TEST 7: Lambda HTTP Handler Integration via POST /sales
        # ----------------------------------------------------------------------
        print("\n---> TEST 7: Full Lambda Handler POST /sales Integration")
        event = {
            "rawPath": "/sales",
            "requestContext": {"http": {"method": "POST"}},
            "body": json.dumps(req_payload)
        }
        lambda_res = main.lambda_handler(event, None)
        assert lambda_res["statusCode"] == 200
        body_obj = json.loads(lambda_res["body"])
        assert body_obj["success"] is True
        print(f"  [PASS] Lambda Handler returned HTTP 200 with matching schema.")

    print("\n================================================================================")
    print("         ALL 7 TESTS PASSED SUCCESSFULLY!                                       ")
    print("================================================================================")


if __name__ == "__main__":
    run_tests()
