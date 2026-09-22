"""
DukaanAI - Amazon Bedrock AI Integration Layer
Dedicated for Builder 1 to power natural-language Kirana speech/text parsing
and intelligent shop queries using Claude 3 Haiku or Amazon Nova.
"""
import os
import json
import boto3

REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-east-1"))
DEFAULT_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")

# Initialize Bedrock Runtime client
bedrock_runtime = boto3.client("bedrock-runtime", region_name=REGION)


def invoke_bedrock_chat(prompt: str, system_prompt: str = "", model_id: str = None, max_tokens: int = 1000) -> str:
    """
    Generic invoker supporting Anthropic Claude 3 and Amazon Nova models on Bedrock.
    """
    model = model_id or DEFAULT_MODEL_ID

    # Anthropic Claude 3 format (Messages API)
    if "anthropic.claude" in model:
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2, # Lower temperature for structured extraction
        }
        if system_prompt:
            body["system"] = system_prompt

        response = bedrock_runtime.invoke_model(
            modelId=model,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body)
        )
        response_body = json.loads(response["body"].read().decode("utf-8"))
        return response_body["content"][0]["text"]

    # Amazon Nova format
    elif "amazon.nova" in model:
        body = {
            "messages": [
                {"role": "user", "content": [{"text": prompt}]}
            ],
            "inferenceConfig": {
                "max_new_tokens": max_tokens,
                "temperature": 0.2
            }
        }
        if system_prompt:
            body["system"] = [{"text": system_prompt}]

        response = bedrock_runtime.invoke_model(
            modelId=model,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body)
        )
        response_body = json.loads(response["body"].read().decode("utf-8"))
        return response_body["output"]["message"]["content"][0]["text"]

    else:
        raise ValueError(f"Unsupported model ID format: {model}")


def parse_kirana_sale_nlp(natural_text: str) -> dict:
    """
    Extracts structured billing, inventory updates, and khata from natural Hinglish/Hindi/English kirana speech.
    Example: 'Ramesh ko 2 kg cheeni aur 1 packet surf excel diya, 180 rupaye khata me likh do'
    """
    system_prompt = (
        "You are DukaanAI, an AI Kirana Store assistant in India. "
        "Your job is to parse natural speech/text from a shopkeeper (in Hindi, Hinglish, or English) "
        "into strict structured JSON for billing, inventory, and khata credit ledger.\n\n"
        "Return ONLY valid JSON matching this schema:\n"
        "{\n"
        '  "customerName": "string or null",\n'
        '  "paymentMode": "cash" | "upi" | "khata" | "split",\n'
        '  "items": [\n'
        '    {"name": "Item name in English", "quantity": 1, "unit": "kg|pcs|pack|litres", "estimatedPrice": 0}\n'
        "  ],\n"
        '  "totalAmount": 0,\n'
        '  "amountPaid": 0,\n'
        '  "amountCredit": 0,\n'
        '  "confidenceScore": 0.95\n'
        "}\n"
        "DO NOT output markdown ticks (```json) or conversational text. Output pure JSON only."
    )

    raw_response = invoke_bedrock_chat(prompt=f"Kirana shop input: {natural_text}", system_prompt=system_prompt)
    
    # Clean possible markdown ticks if model included them
    cleaned = raw_response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "error": "Failed to parse structured JSON from Bedrock response",
            "raw": raw_response
        }
