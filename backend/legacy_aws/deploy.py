"""
DukaanAI - AWS Foundation Deployment Script
Deploys CloudFormation stack and updates Lambda code using native Python + boto3.
Zero extra CLI dependencies required.
"""
import os
import sys
import time
import zipfile
import io
import boto3
from botocore.exceptions import ClientError

DEFAULT_REGION = "us-east-1"
STACK_NAME = "dukaanai-dev-stack"
ENVIRONMENT = "dev"
TEMPLATE_FILE = os.path.join(os.path.dirname(__file__), "infra", "cloudformation.yaml")
APP_DIR = os.path.join(os.path.dirname(__file__), "app")


def build_lambda_zip() -> bytes:
    """Pack backend/app files into an in-memory zip for Lambda upload."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(APP_DIR):
            for file in files:
                if file.endswith((".py", ".txt", ".json")) and not file.startswith("."):
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, APP_DIR)
                    z.write(file_path, arcname)
    buffer.seek(0)
    return buffer.read()


def deploy():
    region = os.environ.get("AWS_REGION", DEFAULT_REGION)
    print(f"=== DukaanAI AWS Foundation Deployment ===")
    print(f"Target Region: {region}")
    print(f"Stack Name:    {STACK_NAME}")
    print(f"Environment:   {ENVIRONMENT}")

    # Check AWS credentials
    session = boto3.Session(region_name=region)
    creds = session.get_credentials()
    if not creds:
        print("\n[!] ERROR: No AWS credentials found.")
        print("Please configure AWS credentials via:")
        print("  1. Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION")
        print("  2. Or run: aws configure (if AWS CLI is installed)")
        print("  3. Or create ~/.aws/credentials file")
        sys.exit(1)

    cf_client = session.client("cloudformation", region_name=region)
    lambda_client = session.client("lambda", region_name=region)

    with open(TEMPLATE_FILE, "r", encoding="utf-8") as f:
        template_body = f.read()

    # Check if stack exists
    stack_exists = False
    try:
        cf_client.describe_stacks(StackName=STACK_NAME)
        stack_exists = True
        print(f"\n[*] Stack '{STACK_NAME}' found. Triggering CloudFormation update...")
    except ClientError as e:
        if "does not exist" in str(e):
            print(f"\n[*] Creating new CloudFormation stack '{STACK_NAME}'...")
        else:
            raise

    params = [
        {"ParameterKey": "Environment", "ParameterValue": ENVIRONMENT},
        {"ParameterKey": "BedrockModelId", "ParameterValue": "anthropic.claude-3-haiku-20240307-v1:0"},
    ]

    capabilities = ["CAPABILITY_NAMED_IAM"]

    try:
        if stack_exists:
            try:
                cf_client.update_stack(
                    StackName=STACK_NAME,
                    TemplateBody=template_body,
                    Parameters=params,
                    Capabilities=capabilities,
                )
                waiter = cf_client.get_waiter("stack_update_complete")
            except ClientError as e:
                if "No updates are to be performed" in str(e):
                    print("[i] CloudFormation template has no changes.")
                    waiter = None
                else:
                    raise
        else:
            cf_client.create_stack(
                StackName=STACK_NAME,
                TemplateBody=template_body,
                Parameters=params,
                Capabilities=capabilities,
            )
            waiter = cf_client.get_waiter("stack_create_complete")

        if waiter:
            print("[*] Waiting for CloudFormation resources to deploy (this may take 1-2 minutes)...")
            waiter.wait(StackName=STACK_NAME)
            print("[+] CloudFormation stack successfully created/updated!")

    except Exception as e:
        print(f"\n[!] Deployment failed: {e}")
        sys.exit(1)

    # Fetch outputs
    stack_desc = cf_client.describe_stacks(StackName=STACK_NAME)
    outputs = {o["OutputKey"]: o["OutputValue"] for o in stack_desc["Stacks"][0].get("Outputs", [])}

    lambda_name = outputs.get("LambdaFunctionName")
    api_url = outputs.get("ApiEndpoint")
    health_url = outputs.get("ApiHealthUrl")
    table_name = outputs.get("DynamoDBTableName")
    bucket_name = outputs.get("MediaBucketName")
    builder1_policy = outputs.get("Builder1ManagedPolicyArn")

    # Update Lambda with local app code
    if lambda_name:
        print(f"\n[*] Packaging and uploading latest application code to Lambda '{lambda_name}'...")
        zip_bytes = build_lambda_zip()
        lambda_client.update_function_code(
            FunctionName=lambda_name,
            ZipFile=zip_bytes,
        )
        print("[+] Lambda code updated successfully!")

    print("\n=======================================================")
    print("           DUKAANAI AWS FOUNDATION ACTIVE              ")
    print("=======================================================")
    print(f"Region:            {region}")
    print(f"API Endpoint:      {api_url}")
    print(f"Health Check:      {health_url}")
    print(f"DynamoDB Table:    {table_name}")
    print(f"S3 Media Bucket:   {bucket_name}")
    print(f"Builder 1 Policy:  {builder1_policy}")
    print("=======================================================\n")


if __name__ == "__main__":
    deploy()
