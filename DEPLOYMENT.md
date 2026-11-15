# AapdaWatch AI — Production & Cloud Deployment Guide

This guide details how to build, run, and deploy AapdaWatch AI locally via Docker Compose or to cloud platforms (Railway, Render, AWS, GCP).

---

## Architecture Overview

AapdaWatch AI operates as a unified multi-service system:
1. **Frontend**: Next.js 16 Web Application with Warm Organic Frosted Glass UI (Port `3000`).
2. **ML Microservice**: Python FastAPI service serving the trained BiLSTM neural network + Hugging Face Multilingual Indic NLP engine (Port `8001`).
3. **Database**: PostgreSQL 16 + PostGIS 3.4 Spatial Database (Port `5432`).
4. **WebSocket Stream**: Real-time live prediction broadcast feed (`/ws/live-feed`).

---

## 1. Local Production Deployment (Docker Compose)

To start the full production stack on your local machine with Docker:

```bash
# Build and run all services in detached mode
docker compose -f docker-compose.prod.yml up --build -d
```

### Verification:
- **Frontend Dashboard**: Open `http://localhost:3000`
- **FastAPI ML & Hugging Face Docs**: Open `http://localhost:8001/docs`
- **Health Check**: `curl http://localhost:8001/health`
- **WebSocket Feed**: `ws://localhost:8001/ws/live-feed`

To view container logs:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

To stop containers:
```bash
docker compose -f docker-compose.prod.yml down
```

---

## 2. 1-Click Cloud Deployment

### A. Deploy to Render
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), click **New** → **Blueprint**.
3. Connect your repository. Render will automatically read `render.yaml` and provision:
   - `aapdawatch-frontend` (Next.js Node environment)
   - `aapdawatch-ml-service` (Python FastAPI environment with BiLSTM & Hugging Face)
4. Click **Apply**.

### B. Deploy to Railway
1. Push your repository to GitHub.
2. In [Railway Dashboard](https://railway.app/), click **New Project** → **Deploy from GitHub repo**.
3. Railway automatically detects `railway.json` and builds the production Docker container.

---

## 3. Local Development Mode

If running without Docker in development:

```powershell
# 1. Start Python FastAPI ML Microservice (Terminal 1)
cd backend/ml-service
.\.venv\Scripts\python.exe server.py

# 2. Start Next.js Frontend (Terminal 2)
cd ../..
pnpm dev
```
Open `http://localhost:3000` in your browser.

