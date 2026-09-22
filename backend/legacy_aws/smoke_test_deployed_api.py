"""
DukaanAI - Production Smoke Test Script against Live API Gateway
Executes the exact end-to-end verification scenario against a deployed AWS endpoint:
1. POST /sales (Ramesh buys 2kg Rice @ Rs.170, pays Rs.300 cash -> Rs.40 debt)
2. GET /inventory?shopId=shop_001
3. GET /customers?shopId=shop_001
4. GET /customers/cust_ramesh/khata?shopId=shop_001
5. GET /sales?shopId=shop_001&date=today
6. POST /ai/query:
   - "How much rice is left?"
   - "Who owes me money?"
   - "How much did I sell today?"
7. Security Tests:
   - shop_002 cross-tenant inventory block
   - shop_002 cross-tenant khata block
   - Missing shopId -> 400
   - Non-existent customer -> 404
   - Non-existent product -> 404
8. CORS preflight check
"""
import os
import sys
import json
import urllib.request
import urllib.error

# Ensure UTF-8 output on Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


def make_request(url: str, method: str = "GET", data: dict = None, headers: dict = None):
    headers = headers or {}
    if data is not None:
        payload = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    else:
        payload = None

    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body_bytes = response.read()
            body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
            resp_headers = dict(response.info())
            return status, body, resp_headers
    except urllib.error.HTTPError as e:
        status = e.code
        body_bytes = e.read()
        try:
            body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            body = {"raw": body_bytes.decode("utf-8", errors="replace")}
        resp_headers = dict(e.headers)
        return status, body, resp_headers
    except Exception as e:
        return 0, {"error": "NETWORK_OR_CONNECTION_ERROR", "message": str(e)}, {}


def run_smoke_test(base_url: str):
    base_url = base_url.rstrip("/")
    print("=" * 80)
    print("         DUKAANAI LIVE API GATEWAY SMOKE TEST SUITE                             ")
    print("=" * 80)
    print(f"Target API Base URL: {base_url}\n")

    results = []

    def record(name, passed, status, expected_status, details):
        results.append({
            "name": name,
            "passed": passed,
            "status": status,
            "expected_status": expected_status,
            "details": details
        })
        icon = "[PASS]" if passed else "[FAIL]"
        print(f"{icon} {name} (HTTP {status} vs Expected {expected_status})")
        if not passed:
            print(f"       Details: {json.dumps(details)}")

    # -------------------------------------------------------------
    # 0. Health Check & Environment Verification
    # -------------------------------------------------------------
    status, body, _ = make_request(f"{base_url}/health")
    if status != 200:
        status, body, _ = make_request(f"{base_url}/api/health")
    record("0. GET /health (Config Verification)", status == 200, status, 200, body)

    # -------------------------------------------------------------
    # 1. CORS Preflight Check
    # -------------------------------------------------------------
    status, body, headers = make_request(f"{base_url}/sales", method="OPTIONS", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST"
    })
    cors_allowed = headers.get("Access-Control-Allow-Origin") in ["*", "http://localhost:5173"]
    record("1. CORS OPTIONS /sales Preflight", status == 200 and cors_allowed, status, 200, headers)

    # -------------------------------------------------------------
    # 2. Seed Initial Inventory (Rice: 25 kg @ Rs. 170)
    # -------------------------------------------------------------
    status, body, _ = make_request(f"{base_url}/inventory", method="POST", data={
        "shopId": "shop_001",
        "productName": "Rice",
        "stock": 25,
        "price": 170,
        "unitPrice": 170,
        "unit": "kg"
    })
    record("2. Setup Initial Product (Rice: 25kg @ Rs.170)", status in [200, 201], status, 201, body)

    # -------------------------------------------------------------
    # 3. Create Sale Transaction: Ramesh buys 2kg Rice
    # -------------------------------------------------------------
    sale_payload = {
        "shopId": "shop_001",
        "customer": {"name": "Ramesh"},
        "items": [{"productName": "Rice", "quantity": 2, "unit": "kg"}],
        "totalAmount": 340,
        "payment": {"receivedAmount": 300, "method": "CASH"}
    }
    status, body, _ = make_request(f"{base_url}/sales", method="POST", data=sale_payload)
    sale_data = body.get("sale", {})
    khata_data = body.get("khata", {})
    payment_data = body.get("payment", {})
    inv_data = body.get("inventory", [{}])[0]

    valid_sale = (
        status == 200 and
        sale_data.get("totalAmount") == 340 and
        payment_data.get("receivedAmount") == 300 and
        khata_data.get("outstandingAmount") == 40 and
        inv_data.get("previousQuantity") == 25 and
        inv_data.get("newQuantity") == 23
    )
    record("3. POST /sales (Ramesh buys 2kg -> Rs.40 Khata, 23kg left)", valid_sale, status, 200, body)

    # -------------------------------------------------------------
    # 4. Verify Inventory: GET /inventory?shopId=shop_001
    # -------------------------------------------------------------
    status, body, _ = make_request(f"{base_url}/inventory?shopId=shop_001")
    items = body.get("inventory", [])
    rice_item = next((i for i in items if i.get("productName") == "Rice"), {})
    valid_inv = (status == 200 and rice_item.get("quantity") == 23)
    record("4. GET /inventory?shopId=shop_001 (Rice = 23kg)", valid_inv, status, 200, rice_item)

    # -------------------------------------------------------------
    # 5. Verify Customers: GET /customers?shopId=shop_001
    # -------------------------------------------------------------
    status, body, _ = make_request(f"{base_url}/customers?shopId=shop_001")
    cust_list = body.get("customers", [])
    ramesh_cust = next((c for c in cust_list if c.get("name") == "Ramesh"), {})
    valid_cust = (status == 200 and ramesh_cust.get("outstandingAmount") == 40)
    record("5. GET /customers?shopId=shop_001 (Ramesh owes Rs.40)", valid_cust, status, 200, ramesh_cust)

    # -------------------------------------------------------------
    # 6. Verify Customer Khata: GET /customers/cust_ramesh/khata
    # -------------------------------------------------------------
    status, body, _ = make_request(f"{base_url}/customers/cust_ramesh/khata?shopId=shop_001")
    khata_obj = body.get("khata", {})
    valid_khata = (status == 200 and khata_obj.get("outstandingAmount") == 40)
    record("6. GET /customers/cust_ramesh/khata (Debt = Rs.40)", valid_khata, status, 200, body)

    # -------------------------------------------------------------
    # 7. Verify Sales: GET /sales?shopId=shop_001&date=today
    # -------------------------------------------------------------
    status, body, _ = make_request(f"{base_url}/sales?shopId=shop_001&date=today")
    summary = body.get("summary", {})
    valid_today = (status == 200 and summary.get("totalSales") == 340 and summary.get("transactionCount") >= 1)
    record("7. GET /sales?shopId=shop_001&date=today (Sales = Rs.340)", valid_today, status, 200, summary)

    # -------------------------------------------------------------
    # 8. AI Queries
    # -------------------------------------------------------------
    # Q1: How much rice is left?
    status, body, _ = make_request(f"{base_url}/ai/query", method="POST", data={
        "shopId": "shop_001",
        "question": "How much rice is left?"
    })
    q1_data = body.get("data", {})
    valid_q1 = (status == 200 and q1_data.get("productName") == "Rice" and q1_data.get("quantity") == 23)
    record("8a. POST /ai/query: 'How much rice is left?'", valid_q1, status, 200, q1_data)

    # Q2: Who owes me money?
    status, body, _ = make_request(f"{base_url}/ai/query", method="POST", data={
        "shopId": "shop_001",
        "question": "Who owes me money?"
    })
    q2_list = body.get("data", [])
    valid_q2 = (status == 200 and any(d.get("customerName") == "Ramesh" and d.get("outstandingAmount") == 40 for d in q2_list))
    record("8b. POST /ai/query: 'Who owes me money?'", valid_q2, status, 200, q2_list)

    # Q3: How much did I sell today?
    status, body, _ = make_request(f"{base_url}/ai/query", method="POST", data={
        "shopId": "shop_001",
        "question": "How much did I sell today?"
    })
    q3_data = body.get("data", {})
    valid_q3 = (status == 200 and q3_data.get("totalSales") == 340)
    record("8c. POST /ai/query: 'How much did I sell today?'", valid_q3, status, 200, q3_data)

    # -------------------------------------------------------------
    # 9. Security Tests
    # -------------------------------------------------------------
    # Sec 1: shop_002 must not see shop_001 inventory
    status, body, _ = make_request(f"{base_url}/inventory?shopId=shop_002")
    inv_002 = body.get("inventory", [])
    has_shop1_rice = any(i.get("productName") == "Rice" for i in inv_002)
    record("9a. Security: shop_002 cannot access shop_001 inventory", status == 200 and not has_shop1_rice, status, 200, inv_002)

    # Sec 2: shop_002 must not access Ramesh's Khata
    status, body, _ = make_request(f"{base_url}/customers/cust_ramesh/khata?shopId=shop_002")
    record("9b. Security: shop_002 cannot access Ramesh Khata (404 expected)", status == 404, status, 404, body)

    # Sec 3: Missing shopId returns clean 400
    status, body, _ = make_request(f"{base_url}/inventory")
    record("9c. Security: Missing shopId returns 400", status == 400, status, 400, body)

    # Sec 4: Non-existent customer returns clean 404
    status, body, _ = make_request(f"{base_url}/customers/non_existent_cust/khata?shopId=shop_001")
    record("9d. Security: Non-existent customer returns 404", status == 404, status, 404, body)

    # Sec 5: Sale of non-existent product returns clean 404
    status, body, _ = make_request(f"{base_url}/sales", method="POST", data={
        "shopId": "shop_001",
        "customer": {"name": "Ramesh"},
        "items": [{"productName": "NonExistentGoldBar", "quantity": 1}],
        "payment": {"receivedAmount": 100}
    })
    record("9e. Security: Sale of non-existent product returns 404", status == 404, status, 404, body)

    print("\n" + "=" * 80)
    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    print(f"Summary: {passed_count}/{total} smoke tests passed.")
    print("=" * 80)
    return passed_count == total


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("API_URL", "")
    if not url:
        print("Usage: python backend/smoke_test_deployed_api.py <YOUR_API_GATEWAY_URL>")
        print("Example: python backend/smoke_test_deployed_api.py https://abc123xyz.execute-api.us-east-1.amazonaws.com")
        sys.exit(1)

    if "<api-id>" in url or "<" in url or ">" in url:
        print("\n" + "=" * 80)
        print("[!] ERROR: '<api-id>' is a placeholder text, not a real AWS API URL.")
        print("=" * 80)
        print("To run against live AWS, replace '<api-id>' with your real API Gateway ID.")
        print("\nHow to get your real API URL:")
        print("  1. In AWS Console -> API Gateway -> HTTP APIs -> Copy the 'Invoke URL'")
        print("  2. It will look like: https://a1b2c3d4e5.execute-api.us-east-1.amazonaws.com")
        print("\nThen run:")
        print("  python backend/smoke_test_deployed_api.py https://a1b2c3d4e5.execute-api.us-east-1.amazonaws.com")
        print("=" * 80 + "\n")
        sys.exit(1)

    success = run_smoke_test(url)
    sys.exit(0 if success else 1)
