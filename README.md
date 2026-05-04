# Attune — Tune Into Your Body's Signals

Upload your Oura Ring data. Get science-backed nutrition, movement, and recovery plans — personalized to what your body is actually telling you.

## Architecture

Attune is a fully serverless application built on AWS, managed with Terraform.

```
React Native App
       │
       ▼
API Gateway + Cognito (auth, rate limiting)
       │
       ▼
Lambda Functions (parse, recommend, track)
       │
 ┌─────┼─────┐
 ▼     ▼     ▼
S3   DynamoDB  Claude API
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native (Expo) |
| API | AWS API Gateway (HTTP) |
| Auth | AWS Cognito |
| Compute | AWS Lambda (Python 3.12) |
| Storage | AWS S3 (uploads), DynamoDB (users, metrics, recs) |
| AI Engine | Anthropic Claude API |
| IaC | Terraform |
| CI/CD | GitHub Actions |

### Lambda Functions

- **Parser** — Triggered by S3 upload. Parses Oura JSON/CSV exports into normalized metrics and writes to DynamoDB.
- **Recommender** — Called via API Gateway. Reads recent metrics, calls Claude API with science-backed prompt, returns personalized nutrition/workout/recovery plans with DOI citations.
- **Tracker** — Logs user actions on recommendations (followed, skipped, modified) for trend analysis.

## Data Flow

1. User exports Oura Ring data (JSON/CSV) from the Oura app
2. User uploads export through the Attune mobile app
3. File lands in S3 → triggers Parser Lambda
4. Parser extracts sleep, readiness, and activity metrics → writes to DynamoDB
5. User requests recommendations → Recommender Lambda reads metrics
6. Recommender calls Claude API with biometric data + science-backed prompt
7. Claude returns personalized nutrition, workout, and recovery plans with DOI citations
8. Recommendations displayed in app; user actions tracked for trend analysis
