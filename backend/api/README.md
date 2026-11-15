# AapdaWatch AI — Backend API Documentation
## Phase 2.0: Backend Foundation, Database Architecture & Prisma Schema

---

## 1. Architecture Overview

AapdaWatch AI is an AI-powered Disaster Information Classification and Incident Intelligence Platform. The backend is designed with a clean, modular NestJS architecture backed by PostgreSQL and PostGIS spatial extensions, managed through Prisma ORM.

### Conceptual Separation of Concerns
The system maintains strict operational separation between three fundamental concepts:
1. **Classification (ML Inference):** Automated prediction of whether a message indicates disaster conditions. (Phase 3 integration boundary).
2. **Correlation (Incident Grouping):** Algorithmic and contextual association of multiple incoming dispatches referring to the same underlying physical event.
3. **Verification (Human-in-the-Loop):** Official verification verdict rendered by human emergency operators based on ground truth and multi-source corroboration.

---

## 2. Folder Structure

```
backend/api/
├── prisma/
│   ├── migrations/
│   │   ├── 20261115000000_init_foundation_and_postgis/
│   │   │   └── migration.sql       # Initial SQL migration with PostGIS & triggers
│   │   └── migration_lock.toml     # Prisma migration engine lock
│   ├── schema.prisma               # Prisma schema (10 entities, 14 enums, spatial geometry)
│   └── seed.ts                     # Idempotent development seed script
├── scripts/
│   └── run-backend-tests.mjs       # Automated backend test suite
├── src/
│   ├── common/
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts   # Global exception filter (strips stack traces in prod)
│   │   └── interceptors/
│   │       ├── logging.interceptor.ts     # HTTP request/response timing logger
│   │       └── transform.interceptor.ts   # Standard API envelope: { success, data, timestamp }
│   ├── config/
│   │   ├── configuration.ts        # Typed configuration factory
│   │   └── validation.ts           # Class-validator environment schema validation
│   ├── database/
│   │   ├── database.module.ts      # Global Database module
│   │   └── prisma.service.ts       # Prisma Client wrapper with safe connectivity checks
│   ├── health/
│   │   ├── health.controller.ts    # GET /api/v1/health endpoint
│   │   ├── health.module.ts        # Health module
│   │   └── health.service.ts       # DB probe and memory diagnostics
│   ├── auth/auth.module.ts         # Authentication foundation
│   ├── users/users.module.ts       # User management module
│   ├── reports/reports.module.ts   # Ingested disaster reports module
│   ├── incidents/incidents.module.ts # Incident folders and lifecycle module
│   ├── analysis/analysis.module.ts # Model inference tracking module
│   ├── verification/verification.module.ts # Human review workflow module
│   ├── correlation/correlation.module.ts # Incident grouping suggestion module
│   ├── audit/audit.module.ts       # Append-only audit trail module
│   ├── analytics/analytics.module.ts # Operational intelligence analytics module
│   ├── batch-jobs/batch-jobs.module.ts # Batch CSV processing preparation module
│   ├── app.module.ts               # Root application module
│   └── main.ts                     # NestJS bootstrap entrypoint
├── .env.example                    # Template environment variables
├── .env                            # Local development configuration (untracked)
├── Dockerfile                      # Multi-stage production container build
├── nest-cli.json                   # NestJS CLI configuration
├── package.json                    # Dependencies & scripts
└── tsconfig.json                   # TypeScript compiler configuration
```

---

## 3. Technology Stack & Choices

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | NestJS | `^10.4.15` | Modular, dependency-injected TypeScript enterprise framework |
| **Language** | TypeScript | `^5.6.3` | Type-safety, decorator metadata, and compile-time validation |
| **Database** | PostgreSQL | `16-alpine` | ACID-compliant relational storage |
| **Spatial Engine**| PostGIS | `3.4` | Geospatial indexing (GiST) & coordinate processing |
| **ORM** | Prisma | `^5.22.0` | Type-safe query builder, schema modeling, and migrations |
| **Validation** | class-validator | `^0.14.1` | Declarative DTO and environment validation |
| **Docs** | Swagger / OpenAPI | `^7.4.2` | Interactive API documentation at `/api/v1/docs` |

---

## 4. Prerequisites

- **Node.js:** `v20+` or `v24+`
- **pnpm:** `v12+`
- **Docker & Docker Compose:** Optional for local PostgreSQL + PostGIS containerization.

---

## 5. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key environment variables:
```ini
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1
DATABASE_URL="postgresql://aapdawatch_admin:aapdawatch_secure_pass@localhost:5432/aapdawatch_db?schema=public"
FRONTEND_ORIGIN="http://localhost:3000"
LOG_LEVEL=debug
```

---

## 6. Database Operations

### 6.1 Start Database with Docker Compose
From the root workspace directory (`aapdawatch-ai`):
```bash
docker compose up -d postgres
```
This spins up `postgis/postgis:16-3.4-alpine` on port `5432` with health checks.

### 6.2 Generate Prisma Client
```bash
cd backend/api
pnpm prisma:generate
```

### 6.3 Apply Database Migrations
```bash
cd backend/api
pnpm prisma:migrate:deploy
```
*(In development with a live database: `pnpm prisma:migrate:dev`)*

### 6.4 Seed Development Data
```bash
cd backend/api
pnpm prisma:seed
```
*The seed script is idempotent (`upsert`) and safely creates test operators, incidents, reports, analyses, reviews, and audit logs.*

---

## 7. Health Endpoint

### `GET /api/v1/health`
Monitors system vitality, process memory, and database connectivity.

**Sample Response (Database Connected):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "timestamp": "2026-11-15T02:15:00.000Z",
    "uptimeSeconds": 128,
    "environment": "development",
    "database": {
      "status": "connected",
      "provider": "PostgreSQL / PostGIS"
    },
    "memory": {
      "heapUsedMb": 38.45,
      "heapTotalMb": 64.21,
      "rssMb": 88.12
    }
  },
  "timestamp": "2026-11-15T02:15:00.000Z"
}
```

**Degraded Mode:**
If the database connection is interrupted, the endpoint returns `status: "degraded"` and `database.status: "disconnected"` without leaking database credentials or throwing unhandled 500 exceptions.

---

## 8. PostGIS Spatial Configuration & Prisma Integration

### Spatial Columns & SRID
All geographical locations use **SRID 4326 (WGS 84 GPS standard)**.
`DisasterReport` and `Incident` feature dual coordinate representation:
- Explicit floats: `latitude` and `longitude` (accessible via standard Prisma CRUD).
- Spatial Point geometry: `locationGeom Unsupported("geometry(Point, 4326)")?` (indexed via GiST).

### Automated Coordinate Synchronization
To prevent coordinate divergence, the migration includes a PostgreSQL trigger function (`sync_location_geom()`):
```sql
CREATE OR REPLACE FUNCTION sync_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW."locationGeom" := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW."locationGeom" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
Whenever `latitude` or `longitude` are written or updated, `locationGeom` is automatically updated and indexed.

### Safe Spatial Queries with Prisma
Because Prisma does not natively abstract spatial functions, future geospatial proximity queries (e.g., finding reports within 10km of an incident) must use parameterized raw queries:
```typescript
// Example: Find reports within radius (meters) using PostGIS ST_DWithin
const nearbyReports = await prisma.$queryRaw<DisasterReport[]>`
  SELECT id, "originalText", latitude, longitude
  FROM "DisasterReport"
  WHERE ST_DWithin(
    "locationGeom",
    ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
    ${radiusInMeters}
  );
`;
```
*Never concatenate user input directly into SQL strings.*

---

## 9. Security & Hardening Features

1. **Zero Stack Traces in Production:** Global `HttpExceptionFilter` strips internal call stacks and system paths from client responses when `NODE_ENV === 'production'`.
2. **Whitelist DTO Validation:** Global `ValidationPipe` drops unknown payload attributes (`whitelist: true`) and rejects unexpected fields (`forbidNonWhitelisted: true`).
3. **CORS Restrictions:** Restricted to approved frontend origins (`FRONTEND_ORIGIN`).
4. **Credential Masking:** Health checks, logs, and database errors never expose database passwords or connection URLs.
5. **Non-Root Container:** Production Docker container runs as the unprivileged `node` user.

---

## 10. Future ML Inference Boundary (Phase 3 Contract)

In Phase 3, an internal Python FastAPI service hosting the trained Bi-LSTM neural model will be connected. The interface contract is planned as follows:

```http
POST /predict
Content-Type: application/json

{
  "requestId": "req_uuid_12345",
  "text": "Severe waterlogging near Dadar station circle. BEST buses halted."
}
```

**Planned Response:**
```json
{
  "requestId": "req_uuid_12345",
  "predictedLabel": "DISASTER_RELATED",
  "probability": 0.9418,
  "decisionThreshold": 0.35,
  "modelVersion": "1.0.0",
  "preprocessingVersion": "1.0.0",
  "suggestedCategory": "FLOOD"
}
```
*Notice: This contract is documented for architectural clarity only. No FastAPI code or .pkl deserialization is active in Phase 2.0.*

---

## 11. Running Automated Tests

Execute the backend foundation test suite:
```bash
cd backend/api
pnpm test
```
Verifies PrismaClient model delegates, enum exports, connection failure resilience, health status masking, and migration SQL integrity.

