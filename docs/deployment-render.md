# RentSphere API — Render Cloud Deployment Runbook

Comprehensive operational guide for deploying the **RentSphere Backend API** to [Render](https://render.com) in strict accordance with **Section 73 (Production Hosting)**, **Section 74 (Free-Tier Constraints)**, and **Section 86 (Production Configuration)** of the project specification.

---

## 1. Cloud Architecture Overview

| Component | Provider | Tier | Role |
|---|---|---|---|
| **Backend API** | Render | Free Web Service | Express REST API runtime on Node.js 20 |
| **Database** | Neon | Free Serverless | Managed PostgreSQL with connection pooling |
| **Media CDN** | Cloudinary | Free Tier | Equipment photo uploads and transformations |
| **Frontend** | Vercel | Free Tier | Angular 18 SPA client (`https://rentsphere.vercel.app`) |

---

## 2. Deployment Methods

### Method A: Blueprint Deployment (Recommended Infrastructure-as-Code)
RentSphere includes a root [`render.yaml`](../render.yaml) Blueprint that provisions the complete web service with a single click:

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository (`anukrit01/rent-sphere` or `rent-sphere-api`).
4. Render automatically parses [`render.yaml`](../render.yaml) and creates the service `rentsphere-api`.
5. Enter values for variables marked `sync: false` (see Environment Variables section below).
6. Click **Apply**. Render will trigger the initial build and deploy.

---

### Method B: Manual Web Service Setup
If deploying without the Blueprint:

1. In the Render Dashboard, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the following service settings:
   - **Name**: `rentsphere-api`
   - **Language / Runtime**: `Node`
   - **Region**: `Oregon (US West)` (or closest to your Neon DB region)
   - **Branch**: `main`
   - **Root Directory**: `rent-sphere-api` (if deploying from a monorepo, otherwise leave blank)
   - **Build Command**: `npm run render-build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
   - **Health Check Path**: `/health`
4. Add the Environment Variables listed below.
5. Click **Create Web Service**.

---

## 3. Production Environment Variables Reference

| Variable | Required | Source / Value | Description |
|---|---|---|---|
| `NODE_ENV` | **Yes** | `production` | Activates production security, disables stack traces, configures secure cookies |
| `PORT` | **Yes** | `10000` | Standard Render ingress port |
| `CORS_ORIGIN` | **Yes** | `https://rentsphere.vercel.app` | Allowed frontend client origin(s) |
| `DATABASE_URL` | **Yes** | Neon Console | Pooled PostgreSQL connection string with `?sslmode=require` |
| `JWT_ACCESS_SECRET` | **Yes** | Render / Generated | Minimum 32-character cryptographically random secret |
| `JWT_REFRESH_SECRET` | **Yes** | Render / Generated | Minimum 32-character cryptographically random secret (distinct from access key) |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` (default) | Access token lifespan |
| `JWT_REFRESH_EXPIRES_IN`| No | `7d` (default) | Refresh token lifespan |
| `CLOUDINARY_CLOUD_NAME`| **Yes** | Cloudinary Console | Cloudinary cloud account identifier |
| `CLOUDINARY_API_KEY` | **Yes** | Cloudinary Console | Cloudinary API public key |
| `CLOUDINARY_API_SECRET`| **Yes** | Cloudinary Console | Cloudinary API secret |
| `RATE_LIMIT_WINDOW_MS`| No | `900000` (15 mins) | Rate limiting evaluation window |
| `RATE_LIMIT_MAX` | No | `100` (default) | Max requests allowed per IP per window |
| `LOG_LEVEL` | No | `info` | Production logging verbosity (structured JSON) |

---

## 4. Database Migrations on Render

Before the backend can serve traffic against a newly created Neon database, the schema migrations must be applied:

### Option 1: Via Render Shell (Recommended)
1. In the Render Dashboard, open your `rentsphere-api` service.
2. Navigate to the **Shell** tab.
3. Run:
   ```bash
   npx prisma migrate deploy
   ```
4. (Optional) To seed initial machinery categories and demo data:
   ```bash
   npm run db:seed
   ```

### Option 2: Automated Pre-Deploy Command
In Render Service Settings > **Pre-Deploy Command**, enter:
```bash
npx prisma migrate deploy
```
Render will run this migration step before every new deployment is routed to live traffic.

---

## 5. Free-Tier Characteristics & Cold Starts

In accordance with **Section 74 (Free-Tier Constraints)**:
- **Idle Sleep**: Render's free tier spins down the container after 15 minutes without incoming HTTP traffic.
- **Cold-Start Latency**: The first request after an idle period takes ~30–50 seconds to wake the service.
- **Liveness Health Check**: The health check endpoint `/health` returns `200 OK` immediately upon Node.js startup without blocking on backing services, ensuring Render does not terminate the deploy prematurely during cold starts.
- **Ephemeral Storage**: All uploaded media is stored in Cloudinary; local disks on Render are ephemeral and wiped on restart.

---

## 6. Live Deployment Verification & Smoke Testing

Once deployment completes, verify the following endpoints:

1. **Liveness Probe**:
   ```bash
   curl -i https://rentsphere-api.onrender.com/health
   ```
   **Expected**: `HTTP/1.1 200 OK`, `{"status":"ok","service":"rent-sphere-api"}`

2. **Readiness Probe**:
   ```bash
   curl -i https://rentsphere-api.onrender.com/health/ready
   ```
   **Expected**: `HTTP/1.1 200 OK`, `{"status":"ready","checks":{"server":"healthy","database":{"status":"up"}}}`

3. **Interactive Swagger Documentation**:
   Visit in browser: `https://rentsphere-api.onrender.com/api/docs`
   **Expected**: Interactive Swagger UI with RentSphere API documentation.

4. **Public Equipment Listing**:
   ```bash
   curl -i https://rentsphere-api.onrender.com/api/v1/assets
   ```
   **Expected**: `HTTP/1.1 200 OK` with paginated equipment records.
