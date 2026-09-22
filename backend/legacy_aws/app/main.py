"""
DukaanAI - Core AWS Lambda Backend Handler
Integrates API Gateway, DynamoDB Single-Table, S3 Media Storage, and Amazon Bedrock.
"""
import os
import json
import uuid
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError
import db
import bedrock
import sales
import queries

REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))
MEDIA_BUCKET = os.environ.get("MEDIA_BUCKET", "")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "dev")

s3_client = boto3.client("s3", region_name=REGION)


def _decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def build_response(status_code: int, body_dict: dict) -> dict:
    """Helper to return consistent CORS-enabled HTTP response for API Gateway."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        },
        "body": json.dumps(body_dict, default=_decimal_default),
    }


def generate_presigned_upload_url(file_name: str, content_type: str = "audio/webm") -> dict:
    """
    Generates a secure S3 Pre-Signed PUT URL for the frontend to upload
    voice notes or bill receipts directly to S3 without sending raw bytes through Lambda.
    """
    if not MEDIA_BUCKET:
        raise ValueError("MEDIA_BUCKET environment variable is not configured")

    file_ext = file_name.split(".")[-1] if "." in file_name else "bin"
    unique_key = f"uploads/{ENVIRONMENT}/{uuid.uuid4().hex[:12]}.{file_ext}"

    presigned_url = s3_client.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": MEDIA_BUCKET,
            "Key": unique_key,
            "ContentType": content_type,
        },
        ExpiresIn=300, # 5 minutes expiry
    )

    return {
        "uploadUrl": presigned_url,
        "fileKey": unique_key,
        "bucket": MEDIA_BUCKET,
        "region": REGION,
    }


def lambda_handler(event: dict, context) -> dict:
    """Main entry point for API Gateway HTTP API v2 and REST API requests."""
    # 1. Normalize Path and Method across API Gateway v1/v2
    raw_path = event.get("rawPath") or event.get("path") or "/"
    http_context = event.get("requestContext", {}).get("http", {})
    method = http_context.get("method") or event.get("httpMethod") or "GET"

    # Normalize trailing slash
    path = raw_path.rstrip("/")
    if not path:
        path = "/"

    # 2. Handle CORS preflight OPTIONS request
    if method == "OPTIONS":
        return build_response(200, {"message": "CORS OK"})

    # 3. Parse JSON Body if present
    body = {}
    raw_body = event.get("body")
    if raw_body:
        try:
            body = json.loads(raw_body)
        except Exception:
            return build_response(400, {"error": "Invalid JSON body"})

    # Parse Query Parameters
    query_params = event.get("queryStringParameters") or {}
    shop_id = query_params.get("shopId") or (body.get("shopId") if isinstance(body, dict) else None)

    try:
        # Route: Health Check
        if path in ["/health", "/api/health"]:
            return build_response(200, {
                "status": "healthy",
                "service": "DukaanAI Backend API",
                "environment": ENVIRONMENT,
                "region": REGION,
                "dynamoTable": db.TABLE_NAME,
                "mediaBucket": MEDIA_BUCKET,
                "bedrockModel": bedrock.DEFAULT_MODEL_ID,
            })

        # Route: Generate S3 Presigned Upload URL for audio or receipt photos
        elif path == "/api/media/upload-url" and method == "POST":
            file_name = body.get("fileName", "audio_note.webm")
            content_type = body.get("contentType", "audio/webm")
            res = generate_presigned_upload_url(file_name, content_type)
            return build_response(200, res)

        # Route: Process Natural-Language Kirana Sale (Bedrock + DynamoDB update)
        elif path == "/api/sales/process" and method == "POST":
            speech_text = body.get("text", "").strip()
            
            # If natural text is provided, pass through Bedrock parser
            if speech_text:
                parsed_data = bedrock.parse_kirana_sale_nlp(speech_text)
            else:
                parsed_data = body

            # Save sale in DynamoDB
            sale_record = db.record_sale({
                "items": parsed_data.get("items", []),
                "totalAmount": parsed_data.get("totalAmount", 0),
                "paymentMode": parsed_data.get("paymentMode", "cash"),
                "customerName": parsed_data.get("customerName"),
                "rawSpeechText": speech_text,
            })

            # If Khata / Udhar, update customer's ledger balance
            if parsed_data.get("paymentMode") == "khata" and parsed_data.get("customerName"):
                db.put_customer({
                    "name": parsed_data["customerName"],
                    "balance": parsed_data.get("totalAmount", 0),
                })

            return build_response(200, {
                "message": "Sale processed successfully",
                "sale": sale_record,
                "parsed": parsed_data,
            })

        # Route: Production-ready MVP Create Sale (Authoritative backend calculation & atomic transaction)
        elif path in ["/sales", "/api/sales"] and method == "POST":
            try:
                sale_result = sales.create_sale(body)
                return build_response(200, sale_result)
            except sales.SalesValidationError as ve:
                return build_response(ve.status_code, {
                    "success": False,
                    "error": ve.error_type,
                    "message": ve.message,
                })

        # Route: GET /sales (Shop isolated with optional date=today & customer filter)
        elif path in ["/sales", "/api/sales"] and method == "GET":
            if not shop_id:
                return build_response(400, {
                    "success": False,
                    "error": "MISSING_SHOP_ID",
                    "message": "shopId query parameter is required"
                })
            date_param = query_params.get("date")
            cust_param = query_params.get("customer")
            sales_result = queries.get_sales(shop_id, date_filter=date_param, customer_filter=cust_param)
            return build_response(200, sales_result)

        # Route: GET /inventory (Shop isolated with optional productName filter)
        elif path in ["/inventory", "/api/inventory"] and method == "GET":
            if not shop_id:
                return build_response(400, {
                    "success": False,
                    "error": "MISSING_SHOP_ID",
                    "message": "shopId query parameter is required"
                })
            prod_name_param = query_params.get("productName")
            inventory_result = queries.get_inventory(shop_id, product_name=prod_name_param)
            return build_response(200, inventory_result)

        elif path in ["/inventory", "/api/inventory"] and method == "POST":
            shop_id_val = body.get("shopId") or query_params.get("shopId")
            prod_name = body.get("productName") or body.get("name", "Unnamed Item")
            stock_val = body.get("stock", 0)
            price_val = body.get("unitPrice") if body.get("unitPrice") is not None else body.get("price", 0)
            unit_val = body.get("unit", "pcs")
            if shop_id_val:
                product = db.put_shop_product(shop_id_val, prod_name, stock_val, price_val, unit_val)
            else:
                product = db.put_product(body)
            return build_response(201, {"success": True, "message": "Product saved", "product": product})

        # Route: GET /customers (Shop isolated with optional hasDebt filter)
        elif path in ["/customers", "/api/customers"] and method == "GET":
            if not shop_id:
                return build_response(400, {
                    "success": False,
                    "error": "MISSING_SHOP_ID",
                    "message": "shopId query parameter is required"
                })
            has_debt = query_params.get("hasDebt") in ["true", "1", "True"]
            customers_result = queries.get_customers(shop_id, has_debt_only=has_debt)
            return build_response(200, customers_result)

        # Route: GET /customers/:id/khata (Shop isolated customer ledger inquiry)
        elif ("/customers/" in path and path.endswith("/khata")) and method == "GET":
            parts = [p for p in path.split("/") if p and p != "api"]
            # Expected pattern: ['customers', '<customer_id>', 'khata']
            if len(parts) >= 3 and parts[0] == "customers" and parts[-1] == "khata":
                customer_identifier = parts[1]
                khata_result = queries.get_customer_khata(shop_id, customer_identifier)
                return build_response(200, khata_result)
            return build_response(400, {"success": False, "error": "INVALID_PATH", "message": "Invalid customer khata path"})

        # Route: Structured AI Query Dispatcher (Builder 1 Voice/Chat Assistant)
        elif path in ["/ai/query", "/api/ai/query"]:
            question = body.get("question") or body.get("prompt") or query_params.get("q")
            if not question:
                return build_response(400, {"success": False, "error": "MISSING_QUESTION", "message": "question is required"})
            ai_data = queries.execute_ai_query(shop_id, question)
            return build_response(200, ai_data)

        # Route: Khata / Ledger (Legacy Fallback)
        elif path == "/api/khata":
            if method == "GET":
                customers = db.get_all_customers()
                return build_response(200, {"customers": customers})
            elif method == "POST":
                customer = db.put_customer(body)
                return build_response(201, {"message": "Customer ledger updated", "customer": customer})

        # Route: Kirana Assistant AI Ask (Direct Bedrock query)
        elif path == "/api/ai/ask" and method == "POST":
            prompt = body.get("prompt", "")
            if not prompt:
                return build_response(400, {"error": "Missing prompt"})
            
            system_instruction = (
                "You are DukaanAI, an intelligent, friendly kirana store assistant. "
                "Help the shopkeeper with inventory checks, daily profit calculations, "
                "customer khata reminders, and business insights. Keep responses concise and practical."
            )
            ai_reply = bedrock.invoke_bedrock_chat(prompt=prompt, system_prompt=system_instruction)
            return build_response(200, {"reply": ai_reply})

        else:
            return build_response(404, {"error": f"Endpoint not found: {method} {path}"})

    except queries.QueryValidationError as qe:
        return build_response(qe.status_code, {
            "success": False,
            "error": qe.error_type,
            "message": qe.message
        })
    except Exception as e:
        return build_response(500, {
            "success": False,
            "error": "INTERNAL_SERVER_ERROR",
            "message": str(e),
        })
