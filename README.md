# 🛡️ AapdaWatch AI — Disaster Intelligence & Neural NLP Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.163-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Keras 3 / PyTorch](https://img.shields.io/badge/Keras%203-PyTorch%20Backend-EE4C2C?style=for-the-badge&logo=pytorch)](https://keras.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**AapdaWatch AI** is a real-time Disaster Intelligence and Information Classification platform designed for emergency responders, disaster management authorities, and humanitarian relief teams. It combines deep Bidirectional LSTM (BiLSTM) neural networks and multilingual Hugging Face NLP models with a warm glassmorphic tactical command dashboard.

---

## 🌟 Key Capabilities

### 🧠 1. Dual Neural Inference Engine (BiLSTM + Indic NLP)
- **AapdaWatch BiLSTM Architecture:** 2-layer Bidirectional LSTM with 128 units, SpatialDropout1D, GlobalMaxPooling, and high-recall sigmoid threshold (`0.35`) tuned for disaster safety.
- **Multilingual & Indic NLP Support:** Classifies English, Hindi (हिन्दी), Marathi (मराठी), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), and colloquial Hinglish (e.g., *"Auraiya mai bhaut barish ho rhi hai"*).
- **Automated Hazard & Geolocation Tagging:** Classifies hazards into *Flood*, *Earthquake*, *Fire*, *Cyclone*, *Landslide*, and resolves Indian districts/cities to exact geographic coordinates.

### ⚡ 2. Real-Time Live WebSocket Feed
- Instant bidirectional WebSocket streaming (`/ws/live-feed`) built on FastAPI and Uvicorn.
- Broadcasts incoming alerts and model predictions across active analyst terminals with automatic reconnection.

### 🗺️ 3. Tactical Live Incident Map
- Multi-mode geospatial visualization featuring an interactive SVG India map.
- Real-time incident density clusters, severity filtering (Critical, High, Medium, Low), and click-to-focus triage.

### 📋 4. Human-in-the-Loop Verification Center
- Disaster analysts can review borderline predictions and dispatch verified incidents to field teams.
- Ergonomic keyboard shortcuts for rapid review: `V` (Verify), `F` (False Positive), `D` (Duplicate).

### 🎨 5. Warm Organic Glassmorphic Interface
- Bespoke glass design system with dual floating docks (Left Rail capsule and Bottom Pill dock).
- Interactive **Adjust Glass Modal** providing real-time sliders for blur, opacity, saturation, tint, and edge glow.

---

## 📁 Repository Structure

```text
aapdawatch-ai/
├── backend/
│   └── ml-service/                  # FastAPI Machine Learning Microservice
│       ├── app/
│       │   ├── main.py              # FastAPI app & WebSocket manager
│       │   ├── multilingual_hf.py   # Indic & Hinglish NLP engine
│       │   ├── model_loader.py      # Keras 3 model loader (PyTorch backend)
│       │   ├── tokenizer.py         # 10,000-token tokenizer
│       │   ├── inference.py         # Single & batch prediction logic
│       │   └── schemas.py           # Pydantic validation schemas
│       ├── artifacts/               # Serialized BiLSTM weights & vocabs
│       ├── Dockerfile               # Production container for ML service
│       ├── requirements.txt         # Python dependencies (Torch, Keras, FastAPI)
│       └── server.py                # Service entrypoint
├── src/
│   ├── app/                         # Next.js App Router Pages
│   │   ├── page.tsx                 # Overview Command Center
│   │   ├── analyze/                 # Single Text, CSV Batch, & URL analysis
│   │   ├── map/                     # Geospatial Incident Map
│   │   ├── verification/            # Human-in-the-Loop review queue
│   │   ├── incidents/               # Active Incident Folders
│   │   ├── analytics/               # Confusion matrix & model diagnostics
│   │   └── reports/                 # Filterable audit reports & CSV export
│   ├── components/
│   │   ├── layout/                  # Topbar, AppShell, Navigation docks
│   │   ├── map/                     # IncidentMap SVG component
│   │   └── ui/                      # GlassCard, GlassModal, Glass sliders
│   ├── context/
│   │   ├── AppContext.tsx           # Global state & offline sync
│   │   └── GlassContext.tsx         # Glass styling context & presets
│   ├── services/
│   │   ├── analysis.service.ts      # Client NLP fallback & API client
│   │   ├── api.client.ts            # REST API connector
│   │   └── websocket.service.ts     # Resilient WebSocket streaming client
│   └── types/                       # Shared TypeScript interfaces
├── Dockerfile                       # Multi-stage production container (Next.js)
├── docker-compose.prod.yml          # Production multi-container composition
├── render.yaml                      # Render Blueprint deployment config
├── railway.json                     # Railway deployment config
├── DEPLOYMENT.md                    # Step-by-step deployment playbook
└── package.json
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js:** v18.17+ or v20+
- **Package Manager:** `pnpm` (recommended), `npm`, or `yarn`
- **Python:** 3.10, 3.11, or 3.12 (for ML service)

### 1. Start the Machine Learning Microservice

```powershell
cd backend/ml-service

# Create virtual environment (first time only)
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # On Linux/macOS: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8001
python server.py
```
> The ML service runs at `http://localhost:8001`. You can access interactive Swagger docs at `http://localhost:8001/docs`.

### 2. Start the Next.js Frontend

Open a second terminal window:

```bash
# In project root
pnpm install

# Start Next.js development server
pnpm dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔌 API Reference

### `POST /predict`
Evaluates disaster probability of a text message using the BiLSTM or Multilingual engine:

**Request:**
```json
{
  "text": "Auraiya mai bhaut barish ho rhi hai, pani chhat tak bhar gaya hai"
}
```

**Response:**
```json
{
  "prediction": "DISASTER_RELATED",
  "probability": 0.84,
  "confidence": 0.84,
  "decision_threshold": 0.35,
  "model_name": "HuggingFace_Indic_Multilingual",
  "model_version": "1.1.0",
  "inference_status": "SUCCESS",
  "sequence_length": 12,
  "tokens": ["auraiya", "mai", "bhaut", "barish", "ho", "rhi", "hai", "..."]
}
```

### `WS /ws/live-feed`
WebSocket stream broadcasting live disaster alerts to all connected analysts in real-time.

---

## 🚢 Production Deployment

For in-depth production deployment instructions across cloud providers, refer to the [DEPLOYMENT.md](DEPLOYMENT.md) playbook.

### 🌐 Deploying Frontend on Vercel
1. Push this repository to your GitHub account (`https://github.com/OMKAR580/AapdaWatch-AI`).
2. Go to [Vercel Dashboard](https://vercel.com/new) and click **"Add New Project"**.
3. Import your `AapdaWatch-AI` repository.
4. Set the Environment Variables:
   ```env
   NEXT_PUBLIC_ML_SERVICE_URL=https://your-ml-service.onrender.com/predict
   NEXT_PUBLIC_WS_URL=wss://your-ml-service.onrender.com/ws/live-feed
   ```
5. Click **Deploy**. Vercel will build and host the Next.js application with edge caching!

### ⚙️ Deploying ML Microservice on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** ➔ **Web Service**.
2. Connect your GitHub repository `OMKAR580/AapdaWatch-AI`.
3. Configure the service:
   - **Root Directory:** `backend/ml-service`
   - **Environment:** `Python 3` (or Docker using `backend/ml-service/Dockerfile`)
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python server.py`
4. Set Environment Variables:
   ```env
   KERAS_BACKEND=torch
   PORT=8001
   ```
5. Click **Create Web Service**. Render gives you a public URL (e.g., `https://aapdawatch-ml.onrender.com`).

---

## 🛡️ License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
