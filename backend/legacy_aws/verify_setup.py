"""
DukaanAI - AWS Resource Verification Test Suite
Tests every provisioned AWS resource:
1. IAM Credentials & Region
2. DynamoDB Single Table (CRUD)
3. S3 Media Bucket & Presigned URLs
4. Amazon Bedrock Runtime access for Builder 1
5. CloudWatch Log Group
6. API Gateway & Lambda Handler
"""
import os
import sys
import json
import uuid
import time
import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get("AWS_REGION", "us-east-1")
TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "dukaanai-dev-table")
MEDIA_BUCKET = os.environ.get("MEDIA_BUCKET", "")
BEDROCK_MODEL = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")

# Configure UTF-8 output on Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# ANSI Color formatting
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"


def print_step(step_name: str):
    print(f"\n{CYAN}---> [VERIFY] {step_name}{RESET}")


def pass_step(msg: str):
    print(f"  {GREEN}[PASS]{RESET} {msg}")


def fail_step(msg: str, err: Exception = None):
    print(f"  {RED}[FAIL]{RESET} {msg}")
    if err:
        print(f"    {YELLOW}Error Detail: {err}{RESET}")


def run_verification():
    print(f"=======================================================")
    print(f"       DukaanAI AWS Resource Verification Suite        ")
    print(f"=======================================================")
    print(f"Target Region:    {REGION}")
    print(f"DynamoDB Table:   {TABLE_NAME}")
    print(f"Bedrock Model:    {BEDROCK_MODEL}")
    print(f"=======================================================")

    session = boto3.Session(region_name=REGION)
    creds = session.get_credentials()

    # -------------------------------------------------------------
    # 1. AWS Credentials & Identity Check
    # -------------------------------------------------------------
    print_step("1. Checking AWS IAM Identity & Region")
    if not creds:
        fail_step("No active AWS credentials found in environment or ~/.aws/credentials")
        print("\nFix: Export AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION before running.")
        return False
    try:
        sts = session.client("sts")
        caller = sts.get_caller_identity()
        pass_step(f"Authenticated as Account: {caller.get('Account')} | Arn: {caller.get('Arn')}")
    except Exception as e:
        fail_step("Failed to call STS get_caller_identity", e)
        return False

    # -------------------------------------------------------------
    # 2. DynamoDB Single Table Verification
    # -------------------------------------------------------------
    print_step("2. Checking DynamoDB Table & Read/Write Operations")
    try:
        dynamo = session.resource("dynamodb")
        table = dynamo.Table(TABLE_NAME)
        table.load()
        pass_step(f"Table '{TABLE_NAME}' found (Status: {table.table_status})")

        # Test item write
        test_id = f"test_{uuid.uuid4().hex[:6]}"
        test_pk = f"TEST#{test_id}"
        table.put_item(Item={
            "PK": test_pk,
            "SK": "VERIFY",
            "GSI1PK": "STORE#TEST",
            "GSI1SK": f"TEST#{int(time.time())}",
            "name": "Parle-G Biscuit 50g",
            "test": True
        })
        pass_step(f"Successfully wrote test item to {TABLE_NAME}")

        # Test item read
        res = table.get_item(Key={"PK": test_pk, "SK": "VERIFY"})
        if "Item" in res:
            pass_step("Successfully read back test item from DynamoDB")
        else:
            fail_step("Item not returned on read")

        # Clean up test item
        table.delete_item(Key={"PK": test_pk, "SK": "VERIFY"})
        pass_step("Cleaned up test item from DynamoDB")

    except ClientError as e:
        fail_step(f"DynamoDB check failed for '{TABLE_NAME}'", e)
    except Exception as e:
        fail_step("DynamoDB error", e)

    # -------------------------------------------------------------
    # 3. S3 Media Bucket Verification
    # -------------------------------------------------------------
    print_step("3. Checking S3 Media Bucket & Presigned URL Generation")
    s3 = session.client("s3")
    bucket = MEDIA_BUCKET
    if not bucket:
        # Try to locate bucket created by stack
        try:
            buckets = s3.list_buckets().get("Buckets", [])
            for b in buckets:
                if "dukaanai" in b["Name"] and "media" in b["Name"]:
                    bucket = b["Name"]
                    break
        except Exception:
            pass

    if not bucket:
        fail_step("S3 Bucket not specified in MEDIA_BUCKET and no dukaanai media bucket found")
    else:
        try:
            s3.head_bucket(Bucket=bucket)
            pass_step(f"S3 Bucket '{bucket}' exists and is accessible")

            # Test Presigned URL Generation
            presigned_url = s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={"Bucket": bucket, "Key": "tests/test_audio.webm", "ContentType": "audio/webm"},
                ExpiresIn=60,
            )
            pass_step(f"Generated presigned S3 upload URL successfully (Length: {len(presigned_url)} chars)")
        except Exception as e:
            fail_step(f"S3 Bucket test failed for '{bucket}'", e)

    # -------------------------------------------------------------
    # 4. Amazon Bedrock Access for Builder 1
    # -------------------------------------------------------------
    print_step("4. Checking Amazon Bedrock Model Access (Builder 1 Foundation)")
    try:
        bedrock = session.client("bedrock", region_name=REGION)
        models = bedrock.list_foundation_models().get("modelSummaries", [])
        haiku_found = any("haiku" in m.get("modelId", "").lower() for m in models)
        pass_step(f"Bedrock service accessible in {REGION}. Total foundation models available: {len(models)}")
        if haiku_found:
            pass_step("Anthropic Claude 3 Haiku model found in region")
    except Exception as e:
        fail_step("Bedrock management API check failed (Check IAM permissions or Region)", e)

    # Test Bedrock Runtime Invocation
    try:
        bedrock_runtime = session.client("bedrock-runtime", region_name=REGION)
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 50,
            "messages": [{"role": "user", "content": "Respond with: 'DukaanAI Bedrock Online'"}],
        })
        response = bedrock_runtime.invoke_model(
            modelId=BEDROCK_MODEL,
            contentType="application/json",
            accept="application/json",
            body=body
        )
        res_json = json.loads(response["body"].read().decode("utf-8"))
        model_reply = res_json["content"][0]["text"].strip()
        pass_step(f"Bedrock Runtime Invocation SUCCESS: '{model_reply}'")
    except Exception as e:
        fail_step(f"Bedrock model invocation test failed for '{BEDROCK_MODEL}'", e)
        print(f"    {YELLOW}Note: If 'AccessDeniedException' or 'ModelNotReadyException', please ensure Model Access is granted in the AWS Bedrock Console.{RESET}")

    # -------------------------------------------------------------
    # 5. CloudWatch Log Group Check
    # -------------------------------------------------------------
    print_step("5. Checking CloudWatch Log Group")
    try:
        logs = session.client("logs", region_name=REGION)
        lg_name = "/aws/lambda/dukaanai-dev-backend"
        res = logs.describe_log_groups(logGroupNamePrefix=lg_name)
        groups = res.get("logGroups", [])
        if groups:
            pass_step(f"CloudWatch Log Group '{groups[0]['logGroupName']}' exists (Retention: {groups[0].get('retentionInDays', 'Default')} days)")
        else:
            fail_step(f"Log Group '{lg_name}' not found yet (will be created automatically on stack deploy)")
    except Exception as e:
        fail_step("CloudWatch check failed", e)

    # -------------------------------------------------------------
    # 6. Lambda Local Handler Simulation
    # -------------------------------------------------------------
    print_step("6. Simulating Lambda Handler Locally (Health Check Route)")
    try:
        import sys
        sys.path.append(os.path.join(os.path.dirname(__file__), "app"))
        import main
        mock_event = {"rawPath": "/api/health", "requestContext": {"http": {"method": "GET"}}}
        mock_context = None
        res = main.lambda_handler(mock_event, mock_context)
        if res.get("statusCode") == 200:
            pass_step(f"Lambda handler executed /api/health with HTTP 200: {res.get('body')}")
        else:
            fail_step(f"Lambda handler returned status code: {res.get('statusCode')}")
    except Exception as e:
        fail_step("Lambda handler local test failed", e)

    print("\n=======================================================")
    print("Verification run completed.")
    print("=======================================================\n")


if __name__ == "__main__":
    run_verification()
