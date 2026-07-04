"""Firestore helpers for Python pipeline Lambdas."""
import json
import os
from datetime import datetime, timezone

import boto3

_db = None


def _init_firebase():
    import firebase_admin
    from firebase_admin import credentials

    secret_arn = os.environ.get("FIREBASE_SECRET_ARN")
    if not secret_arn:
        raise RuntimeError("FIREBASE_SECRET_ARN not set")
    sm = boto3.client("secretsmanager")
    sa = json.loads(sm.get_secret_value(SecretId=secret_arn)["SecretString"])
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(sa))


def get_db():
    global _db
    if _db is None:
        _init_firebase()
        from firebase_admin import firestore

        _db = firestore.client()
    return _db


def _now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def update_video_status(video_id: str, status: str, **extra):
    get_db().collection("videos").document(video_id).set(
        {"status": status, "updatedAt": _now_iso(), **extra},
        merge=True,
    )


def append_job_log(job_id: str, step: str, message: str, progress: int, status: str | None = None):
    from firebase_admin import firestore

    data = {
        "currentStep": step,
        "progress": progress,
        "updatedAt": _now_iso(),
        "logs": firestore.ArrayUnion(
            [{"step": step, "message": message, "timestamp": _now_iso()}]
        ),
    }
    if status:
        data["status"] = status
    get_db().collection("jobs").document(job_id).set(data, merge=True)
