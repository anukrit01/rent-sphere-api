# RentSphere API — Neon Production PostgreSQL Integration Guide

Comprehensive documentation for managing the **Neon Serverless PostgreSQL** database in strict accordance with **Section 72 (Production Database)**, **Section 74 (Free-Tier Constraints)**, and **Section 87 (Database Connection Management)** of the project specification.

---

## 1. Neon Serverless Architecture Overview

Neon provides serverless PostgreSQL with compute-storage separation:
- **Compute Instance**: Stateless PostgreSQL instances that auto-suspend after 5 minutes of inactivity to conserve free-tier compute hours.
- **Connection Pooler (pgBouncer)**: High-throughput connection proxy located in front of compute instances, allowing thousands of concurrent client connections without memory exhaustion.
- **Storage**: Multi-AZ distributed log-structured storage engine.

---

## 2. Dual Connection String Architecture (Prisma 6)

Neon utilizes two connection strings for Prisma:

```
                                  Prisma ORM (v6.19.3)
                                           │
                   ┌───────────────────────┴───────────────────────┐
                   │                                               │
                   ▼                                               ▼
         Runtime Queries (App)                         Migrations (Prisma CLI)
      `DATABASE_URL` (Pooled)                         `DIRECT_URL` (Direct)
                   │                                               │
                   ▼                                               ▼
     `ep-xxx-pooler.neon.tech`                            `ep-xxx.neon.tech`
     (pgBouncer Connection Pool)                      (Direct PostgreSQL Compute)
```

### A. Pooled Connection (`DATABASE_URL`)
- **Host format**: `ep-YOUR-PROJECT-pooler.[region].aws.neon.tech`
- **Database**: `neondb`
- **User**: `neondb_owner`
- **Parameters**: `?sslmode=require&pgbouncer=true`
- **Purpose**: Used by `PrismaClient` during runtime API operations to handle high traffic and avoid connection limits.

### B. Direct Connection (`DIRECT_URL`)
- **Host format**: `ep-YOUR-PROJECT.[region].aws.neon.tech` (notice **no** `-pooler`)
- **Database**: `neondb`
- **User**: `neondb_owner`
- **Parameters**: `?sslmode=require`
- **Purpose**: Used by Prisma CLI for `prisma migrate deploy`, `prisma db push`, and advisory lock acquisition.

---

## 3. Configuration in RentSphere

### `prisma/schema.prisma`
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Environment Setup

#### Local Development (`.env`)
In local development, both variables point to your local PostgreSQL instance:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/rentsphere_db?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5433/rentsphere_db?schema=public
```

#### Production Cloud (`Render Dashboard` / `.env.production`)
```env
DATABASE_URL=postgresql://neondb_owner:YOUR_SECRET@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://neondb_owner:YOUR_SECRET@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## 4. Applying Migrations to Neon

Once your Neon project is provisioned:

1. **Test Connectivity**:
   ```bash
   DATABASE_URL="your-neon-pooled-url" DIRECT_URL="your-neon-direct-url" npm run db:neon:test
   ```

2. **Deploy Schema Migrations**:
   ```bash
   DIRECT_URL="your-neon-direct-url" npx prisma migrate deploy
   ```
   Prisma will execute all historical migrations up to the current schema.

3. **Seed Categories & Initial Data**:
   ```bash
   DATABASE_URL="your-neon-direct-url" npm run db:seed
   ```

---

## 5. Free-Tier Cold-Start Behavior (Section 74)

- **Auto-Suspension**: Neon suspends compute after 5 minutes of inactivity.
- **Wake-up Latency**: Upon receiving a query, Neon resumes the compute instance in ~500ms–2 seconds.
- **Graceful Handling**: RentSphere API startup in `src/server.ts` and the liveness probe `/health` are non-blocking and do not crash or fail deployments while Neon compute warms up.
