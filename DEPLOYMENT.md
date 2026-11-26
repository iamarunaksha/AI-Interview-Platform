# Cloud Deployment Guide (Hyperscalers & Containers)

InterviewAI is containerized with multi-stage production Dockerfiles, automatic TypeORM schema migrations, health/readiness probes, and security hardening so it can be deployed directly to any cloud provider.

---

## 1. Container Images

| Service | Dockerfile | Runtime Port | Health Probes |
| :--- | :--- | :--- | :--- |
| **API (`@interviewai/api`)** | [`apps/api/Dockerfile`](apps/api/Dockerfile) | `4000` | `GET /health/live` (liveness), `GET /health/ready` / `GET /health` (readiness, returns `503` if PostgreSQL is down) |
| **Web (`@interviewai/web`)** | [`apps/web/Dockerfile`](apps/web/Dockerfile) | `3000` | `GET /` (Next.js standalone server) |

Build commands (from repository root):

```bash
# Build API image
docker build -f apps/api/Dockerfile -t interviewai-api:latest .

# Build Web image (bake public API/WS URLs into the client bundle)
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com \
  -t interviewai-web:latest .
```

> **Note:** Next.js inlines `NEXT_PUBLIC_*` variables at build time. Always pass `--build-arg NEXT_PUBLIC_API_URL` and `--build-arg NEXT_PUBLIC_WS_URL` matching your production API domain when building the Web image.

---

## 2. Required Production Environment Variables (API)

```env
NODE_ENV=production
PORT=4000

# PostgreSQL (RDS / Cloud SQL / Azure Flexible Server / Supabase)
DATABASE_URL=postgresql://user:password@db-host:5432/interviewai
DATABASE_SSL=true
DATABASE_POOL_MAX=20
DB_SYNCHRONIZE=false
DB_MIGRATIONS_RUN=true

# Cryptographically secure JWT secrets (>= 32 chars each, distinct!)
# Generate with: openssl rand -base64 48
JWT_SECRET=<your-secure-access-secret>
JWT_REFRESH_SECRET=<your-secure-refresh-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Comma-separated allowed frontend origins
CORS_ORIGIN=https://app.yourdomain.com

# AI & Voice Providers
REALTIME_PROVIDER=gemini
LLM_PROVIDER=gemini
STT_PROVIDER=deepgram
TTS_PROVIDER=deepgram
EVALUATION_PROVIDER=gemini
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-3.1-flash-lite
DEEPGRAM_API_KEY=<your-deepgram-api-key>
```

> Startup enforces security checks in `NODE_ENV=production`: weak/placeholder JWT secrets, identical access/refresh secrets, or `DB_SYNCHRONIZE=true` will immediately fail fast on boot. On startup with `DB_MIGRATIONS_RUN=true`, TypeORM runs `InitialSchema` idempotently and `TracksService` seeds competencies & questions automatically.

---

## 3. Deploying to Hyperscalers

### Option A: Docker Compose (VM / EC2 / Compute Engine / DigitalOcean Droplet)

```bash
export DATABASE_PASSWORD="<strong-postgres-password>"
export JWT_SECRET="$(openssl rand -base64 48)"
export JWT_REFRESH_SECRET="$(openssl rand -base64 48)"
export GEMINI_API_KEY="<your-key>"
export DEEPGRAM_API_KEY="<your-key>"
export CORS_ORIGIN="https://app.yourdomain.com"
export NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
export NEXT_PUBLIC_WS_URL="wss://api.yourdomain.com"

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Option B: Google Cloud Run + Cloud SQL (PostgreSQL)

1. Push both images to Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/<PROJECT_ID>/interviewai-api -f apps/api/Dockerfile .
   gcloud builds submit --tag gcr.io/<PROJECT_ID>/interviewai-web -f apps/web/Dockerfile .
   ```
2. Deploy API service with session affinity (required for Socket.IO WebSockets), WebSockets enabled, and min instances >= 1 (if avoiding cold starts), pointing to Cloud SQL:
   ```bash
   gcloud run deploy interviewai-api \
     --image gcr.io/<PROJECT_ID>/interviewai-api \
     --port 4000 \
     --session-affinity \
     --timeout 3600 \
     --set-env-vars "NODE_ENV=production,DB_MIGRATIONS_RUN=true,DATABASE_SSL=false,CORS_ORIGIN=https://web-url" \
     --set-secrets "DATABASE_URL=...,JWT_SECRET=...,JWT_REFRESH_SECRET=...,GEMINI_API_KEY=...,DEEPGRAM_API_KEY=..."
   ```
3. Deploy Web service on port `3000`.

### Option C: AWS ECS Fargate / App Runner + Amazon RDS (PostgreSQL)

1. Push `interviewai-api` and `interviewai-web` images to **Amazon ECR**.
2. Provision an **RDS PostgreSQL 17** instance (set `DATABASE_SSL=true`).
3. Create an **Application Load Balancer (ALB)** with:
   - Target Group 1 -> `api` (`4000`), health check path `/health/ready`, **Sticky Sessions enabled** (for Socket.IO polling fallback + WebSocket upgrade).
   - Target Group 2 -> `web` (`3000`), health check path `/`.
4. Inject `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY`, and `DEEPGRAM_API_KEY` from **AWS Secrets Manager**.

### Option D: Azure Container Apps + Azure Database for PostgreSQL

1. Push images to **Azure Container Registry (ACR)**.
2. Create Container Apps for `api` (target port `4000`, ingress external, sticky sessions enabled for WebSockets) and `web` (target port `3000`, ingress external).
3. Configure Azure Flexible Server Postgres with `DATABASE_SSL=true`.
4. Attach health probes pointing to `/health/live` (liveness) and `/health/ready` (readiness).

---

## 4. Production Checklist

- [ ] TLS/HTTPS terminated at ALB / Cloud Run / Nginx / Cloudflare (`wss://` automatically used by frontend over HTTPS)
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` generated uniquely (`openssl rand -base64 48`)
- [ ] `DB_SYNCHRONIZE=false` and `DB_MIGRATIONS_RUN=true`
- [ ] `CORS_ORIGIN` restricted to your production frontend domain(s)
- [ ] Sticky sessions / session affinity enabled on load balancer if running `> 1` API replica (for Socket.IO rooms)
