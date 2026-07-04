"""Load OpenAI credentials from env or AWS Secrets Manager."""
import json
import os

import boto3

_client = None


def get_openai_api_key() -> str:
    key = os.environ.get("OPENAI_API_KEY")
    if key and key not in ("placeholder", "changeme", "your-key-here"):
        return key

    secret_arn = os.environ.get("OPENAI_SECRET_ARN")
    if not secret_arn:
        raise RuntimeError("OPENAI_API_KEY or OPENAI_SECRET_ARN must be set")

    sm = boto3.client("secretsmanager")
    resp = sm.get_secret_value(SecretId=secret_arn)
    raw = resp["SecretString"]
    try:
        data = json.loads(raw)
        return data.get("OPENAI_API_KEY") or data.get("api_key") or raw
    except json.JSONDecodeError:
        return raw


def get_openai_client():
    global _client
    if _client is None:
        from openai import OpenAI

        _client = OpenAI(api_key=get_openai_api_key())
    return _client
