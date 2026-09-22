# DukaanAI - AWS Backend Foundation (Builder 2 Guide)

Welcome to the backend architecture for **DukaanAI** — an AI-powered assistant for Kirana store shopkeepers in India. It converts natural-language sales into structured billing, inventory deductions, and khata (credit ledger) entries.

---

## 1. Text Architecture Diagram

```
                             +-----------------------------------+
                             |     DukaanAI Frontend (Vite/React)|
                             +-----------------------------------+
                                            |               |
                         (1) Direct Media   |               | (2) REST / JSON
                             Upload via     |               |     API Requests
                             Presigned URL  |               v
                                            |     +-------------------------+
                                            |     | Amazon API Gateway      |
                                            |     | (HTTP API v2, Open CORS)|
                                            |     +-------------------------+
                                            |               |
                                            |               v
                                            |     +-------------------------+
                                            |     | AWS Lambda              |
                                            |     | (Python 3.10 Runtime)   |
                                            |     +-------------------------+
                                            |         /       |       \
                                            v        /        |        \
                         +--------------------+     /         |         \
                         | Amazon S3          |<---+          |          \
                         | (Voice Notes, Bills)               v           v
                         +--------------------+      +-------------+  +-------------------+
                                                     | DynamoDB    |  | Amazon CloudWatch |
                                                     | SingleTable |  | (/aws/lambda/...) |
                                                     +-------------+  +-------------------+
                                                            ^
                                                            |
                                            +-------------------------------+
                                            | Amazon Bedrock (Runtime)      |
                                            | Models: Claude 3 Haiku / Nova |
                                            +-------------------------------+
                                                            ^
                                                            | (Dev Credentials)
                                                    +---------------+
                                                    | Builder 1     |
                                                    | (Local AI Dev)|
                                                    +---------------+
```

---

## 2. Exact AWS Resources Created & Why Each Is Needed

| Resource | Logical Name | Physical / Configured Name | Why It Is Needed |
| :--- | :--- | :--- | :--- |
| **API Gateway (HTTP API v2)** | `HttpApi` | `dukaanai-dev-http-api` | Lightweight, sub-millisecond API proxy connecting frontend to Lambda with built-in CORS. ~70% cheaper and lower latency than REST APIs. |
| **AWS Lambda** | `BackendLambdaFunction` | `dukaanai-dev-backend` | Serverless compute layer executing sales processing, audio presigned URLs, inventory, khata, and Bedrock calls. |
| **Amazon DynamoDB** | `DukaanAITable` | `dukaanai-dev-table` | Single-table NoSQL database with On-Demand billing (pay-per-request, $0 idle cost) storing inventory (`PROD#`), khata (`CUST#`), and bills (`BILL#`). |
| **Amazon S3** | `DukaanAIMediaBucket` | `dukaanai-dev-media-<account>-<region>` | Encrypted private storage for shopkeeper voice notes (.webm, .wav) and bill receipts, accessed via presigned upload URLs. 30-day lifecycle auto-cleanup. |
| **Amazon Bedrock Access** | `BedrockInvocationPolicy` | IAM Policy on Lambda Execution Role | Allows the Lambda handler to call `bedrock:InvokeModel` for Claude 3 Haiku / Amazon Nova to parse voice/text into structured JSON. |
| **Builder 1 Bedrock Policy**| `Builder1BedrockPolicy` | `dukaanai-dev-builder1-bedrock-access` | Standalone managed policy that Builder 2 attaches to Builder 1's IAM User/Role for local testing and prompt engineering. |
| **Amazon CloudWatch** | `LambdaLogGroup` | `/aws/lambda/dukaanai-dev-backend` | Centralized log group with 14-day retention to capture execution logs, debug tracebacks, and monitor latency without runaway storage costs. |

---

## 3. Environment Strategy & Configuration

All resources use **`us-east-1`** consistently for immediate Bedrock model availability.

### Configuration Template (`backend/.env.example`)
```bash
AWS_REGION=us-east-1
ENVIRONMENT=dev
DYNAMODB_TABLE=dukaanai-dev-table
MEDIA_BUCKET=dukaanai-dev-media-<account-id>-us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
STACK_NAME=dukaanai-dev-stack
```

> **Security Rule**: Never commit `.env` or hardcode credentials into source files. Lambda automatically retrieves temporary STS credentials from its IAM execution role. Local scripts use environment variables or `~/.aws/credentials`.

---

## 4. IAM Roles & Least-Privilege Policies

### A. Lambda Execution Role (`dukaanai-dev-lambda-role`)
- **Trust Relationship**: Allows `lambda.amazonaws.com` to assume the role.
- **`CloudWatchLoggingPolicy`**: Restricted to `logs:CreateLogStream` and `logs:PutLogEvents` solely on `/aws/lambda/dukaanai-dev-backend`.
- **`DynamoDBCRUDPolicy`**: Restricted to CRUD actions (`GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `Scan`, `BatchWriteItem`) on `arn:aws:dynamodb:...:table/dukaanai-dev-table` and its `GSI1` index.
- **`S3MediaStoragePolicy`**: Restricted to `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::dukaanai-dev-media-.../*`.
- **`BedrockInvocationPolicy`**: Restricted to `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` on foundation models.

### B. Builder 1 Managed Policy (`dukaanai-dev-builder1-bedrock-access`)
- Standalone managed policy created by CloudFormation.
- Grants Builder 1 permission to:
  1. List and invoke Bedrock models (`bedrock:InvokeModel`, `bedrock:ListFoundationModels`).
  2. Read/write to the `dukaanai-dev-table` DynamoDB table and S3 media bucket during local development.

---

## 5. Deployment Guide

### Option 1: One-Click Deploy via Python (Recommended)
No AWS CLI installation required:
```bash
# Set your temporary AWS credentials in terminal:
set AWS_ACCESS_KEY_ID=your_access_key
set AWS_SECRET_ACCESS_KEY=your_secret_key
set AWS_REGION=us-east-1

# Run deployment script:
python backend/deploy.py
```

### Option 2: CloudFormation Console
1. Open [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation/home?region=us-east-1).
2. Click **Create stack** -> **With new resources (standard)**.
3. Upload `backend/infra/cloudformation.yaml`.
4. Name the stack `dukaanai-dev-stack` and check **"I acknowledge that AWS CloudFormation might create IAM resources"**.
5. Click **Submit**.

---

## 6. How to Verify Every Resource Works

Run the included automated verification script:
```bash
python backend/verify_setup.py
```
This script validates:
1. **IAM Identity**: Validates active AWS credentials and caller account.
2. **DynamoDB**: Performs a real write, read, and cleanup of a test item in `dukaanai-dev-table`.
3. **S3 Media Bucket**: Verifies bucket accessibility and tests presigned URL generation.
4. **Amazon Bedrock**: Queries model availability and performs a live invocation test against Claude 3 Haiku.
5. **CloudWatch**: Validates `/aws/lambda/dukaanai-dev-backend` log group exists with retention configured.
6. **API Gateway / Lambda**: Tests health endpoint route `/api/health`.

You can also test the live API in browser or curl:
```bash
curl https://<api-id>.execute-api.us-east-1.amazonaws.com/api/health
```

---

## 7. Manual Configuration Checklist in AWS Console

While the CloudFormation template automates 99% of the infrastructure, AWS requires **one manual compliance action** for Amazon Bedrock:

1. **Enable Bedrock Model Access (Required for Builder 1)**:
   - Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/home?region=us-east-1) in `us-east-1`.
   - On the left sidebar, scroll to the bottom and click **"Model access"**.
   - Click the orange **"Enable specific models"** button.
   - Select **Anthropic Claude 3 Haiku** (and optionally **Claude 3.5 Sonnet** and **Amazon Nova**).
   - If prompted for use case details, enter: "Hackathon project DukaanAI for Kirana store invoice processing".
   - Click **Submit**. Access is granted immediately.

2. **Attach Policy to Builder 1 IAM User**:
   - Go to [AWS IAM Console](https://console.aws.amazon.com/iam/home).
   - Open **Users** -> Click Builder 1's user.
   - Click **Add permissions** -> **Attach policies directly**.
   - Search for `dukaanai-dev-builder1-bedrock-access` and attach it.
