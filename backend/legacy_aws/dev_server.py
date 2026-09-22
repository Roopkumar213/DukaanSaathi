"""
DukaanAI - Full Local Development Server & API Gateway Simulator
Zero AWS Account or Console required!
Simulates DynamoDB Single-Table, API Gateway HTTP API v2, and CloudWatch logging locally.
Allows Builder 1 (AI) and Frontend (React/Vite) to work seamlessly offline.
"""
import os
import sys
import json
import time
from decimal import Decimal
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from unittest.mock import patch

# Ensure UTF-8 output on Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# Add app to path
APP_DIR = os.path.join(os.path.dirname(__file__), "app")
sys.path.insert(0, APP_DIR)

import db
import sales
import queries
import main


class LocalSingleTableDB:
    """In-memory persistent single-table simulator matching DynamoDB semantics."""
    def __init__(self):
        self.items = {}

    def put_item(self, Item):
        pk = Item.get("PK")
        sk = Item.get("SK")
        self.items[f"{pk}#{sk}"] = dict(Item)
        return {}

    def get_item(self, Key):
        pk = Key.get("PK")
        sk = Key.get("SK")
        item = self.items.get(f"{pk}#{sk}")
        return {"Item": dict(item)} if item else {}

    def query(self, **kwargs):
        index_name = kwargs.get("IndexName")
        key_expr = kwargs.get("KeyConditionExpression")

        results = []
        for item in self.items.values():
            if self._eval_cond(key_expr, item):
                results.append(dict(item))
        return {"Items": results}

    def _eval_cond(self, cond, item):
        if not cond:
            return True
        expr = cond.get_expression()
        if "operator" in expr and expr["operator"] == "AND":
            return all(self._eval_cond(v, item) for v in expr["values"])
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

    def transact_write_items(self, TransactItems):
        staged = []
        for ti in TransactItems:
            if "Update" in ti:
                u = ti["Update"]
                pk = u["Key"]["PK"]["S"]
                sk = u["Key"]["SK"]["S"]
                lookup = f"{pk}#{sk}"
                cond = u.get("ConditionExpression", "")
                vals = u.get("ExpressionAttributeValues", {})

                if "PROD#" in sk:
                    if lookup not in self.items:
                        raise Exception("ConditionalCheckFailed")
                    existing = self.items[lookup]
                    qty = Decimal(vals[":qty"]["N"])
                    if existing.get("stock", 0) < qty:
                        raise Exception("ConditionalCheckFailed: Insufficient inventory")
                    staged.append(("inv", lookup, existing.get("stock", 0) - qty))

                elif "CUST#" in sk:
                    existing = self.items.get(lookup, {})
                    bal = Decimal(str(existing.get("balance", 0)))
                    add_bal = Decimal(vals[":outstanding"]["N"])
                    name = vals[":name_val"]["S"]
                    cid = vals[":cid"]["S"]
                    staged.append(("cust", lookup, {
                        "PK": pk,
                        "SK": sk,
                        "name": name,
                        "customerId": cid,
                        "balance": bal + add_bal,
                        "updatedAt": int(time.time())
                    }))

            elif "Put" in ti:
                p = ti["Put"]["Item"]
                pk = p["PK"]["S"]
                sk = p["SK"]["S"]
                lookup = f"{pk}#{sk}"
                rec = {}
                for k, v in p.items():
                    if "S" in v:
                        rec[k] = v["S"]
                    elif "N" in v:
                        rec[k] = Decimal(v["N"])
                staged.append(("put", lookup, rec))

        for action, key, data in staged:
            if action == "inv":
                self.items[key]["stock"] = data
            elif action in ("cust", "put"):
                self.items[key] = data
        return {}


# Global in-memory DB
local_db = LocalSingleTableDB()

# Seed initial Rice for shop_001
local_db.put_item({
    "PK": "SHOP#shop_001",
    "SK": "PROD#rice",
    "GSI1PK": "SHOP#shop_001",
    "GSI1SK": "PROD#rice",
    "shopId": "shop_001",
    "productName": "Rice",
    "stock": Decimal("25"),
    "unitPrice": Decimal("170"),
    "price": Decimal("170"),
    "unit": "kg",
    "updatedAt": int(time.time())
})


class LocalGatewayHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Clean request logging
        pass

    def do_OPTIONS(self):
        self._serve("OPTIONS")

    def do_GET(self):
        self._serve("GET")

    def do_POST(self):
        self._serve("POST")

    def do_PUT(self):
        self._serve("PUT")

    def do_DELETE(self):
        self._serve("DELETE")

    def _serve(self, method: str):
        parsed = urlparse(self.path)
        raw_path = parsed.path
        query_dict = {k: v[0] for k, v in parse_qs(parsed.query).items()}

        body_str = None
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            body_bytes = self.rfile.read(content_length)
            body_str = body_bytes.decode("utf-8")

        event = {
            "rawPath": raw_path,
            "path": raw_path,
            "queryStringParameters": query_dict,
            "requestContext": {
                "http": {
                    "method": method,
                    "path": raw_path,
                }
            },
            "headers": dict(self.headers),
            "body": body_str
        }

        # Route through Lambda with mocked DB
        with patch.object(sales.table, "get_item", side_effect=local_db.get_item), \
             patch.object(sales.table, "put_item", side_effect=local_db.put_item), \
             patch.object(sales.dynamo_client, "transact_write_items", side_effect=local_db.transact_write_items), \
             patch.object(queries.table, "query", side_effect=local_db.query), \
             patch.object(queries.table, "get_item", side_effect=local_db.get_item), \
             patch.object(db.table, "put_item", side_effect=local_db.put_item), \
             patch.object(db.table, "get_item", side_effect=local_db.get_item), \
             patch.object(db.table, "query", side_effect=local_db.query):

            response = main.lambda_handler(event, None)

        status_code = response.get("statusCode", 200)
        headers = response.get("headers", {})
        body = response.get("body", "")

        self.send_response(status_code)
        for k, v in headers.items():
            self.send_header(k, v)
        self.end_headers()

        if body:
            self.wfile.write(body.encode("utf-8"))


def run(port=8000):
    server = HTTPServer(("127.0.0.1", port), LocalGatewayHandler)
    print("=" * 70)
    print(f"[*] DukaanAI Local Backend running on http://127.0.0.1:{port}")
    print(f"[*] Zero AWS Console required! Ready for Frontend & AI tests.")
    print("=" * 70)
    server.serve_forever()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run(port)
