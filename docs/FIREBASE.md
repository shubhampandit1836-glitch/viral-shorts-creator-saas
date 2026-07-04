# Firebase Setup

## 1. Client (Next.js)

Credentials are in `apps/web/.env.local` (from your Firebase web app config).

Enable in [Firebase Console](https://console.firebase.google.com/project/ai-clip-finder-8e055):
- **Authentication** → Email/Password + Google
- **Firestore** → Create database (production mode)

Deploy security rules:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 2. Service Account (Lambdas only)

`apps/web/firestore-service-account.json` is for **server-side use only** — never import in client code.

- Added to `.gitignore` — do not commit
- For Lambdas: store in AWS Secrets Manager as `acf-staging/firebase-sa`
- Set env var `FIREBASE_SERVICE_ACCOUNT_JSON` on pipeline Lambdas

## 3. Collections

| Collection | Written by |
|------------|-----------|
| users | Client (on signup) |
| videos | Client (upload) + Lambdas (status) |
| jobs | Client + Lambdas (progress) |
| clips | Lambdas (Admin SDK) |
| transcripts | Lambdas (Admin SDK) |
