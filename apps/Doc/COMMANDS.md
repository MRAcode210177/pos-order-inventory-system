# POS Order & Inventory System — Commands Reference

A complete reference for running, managing, and testing the monorepo.

---

## 📁 Project Structure

```
pos/
├── apps/
│   ├── backend/          # Express API — port 4000
│   └── frontend/         # Next.js UI  — port 3000
├── packages/
│   └── shared-types/     # Shared TypeScript types/enums
├── package.json          # Root workspace scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

> **Package Manager**: `pnpm` (v10+) is required. Install it with `npm install -g pnpm` if not already installed.

---

## 🚀 Getting Started

### 1. Install All Dependencies

Run this once from the **project root** before anything else:

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example env file for the backend and fill in your values:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Key variables in `apps/backend/.env`:

```env
PORT=4000                          # Backend server port
NODE_ENV=development

# Leave commented out to use the embedded zero-config PGlite engine
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/pos_db

FRONTEND_URL=http://localhost:3000  # Allowed CORS origin
```

> **Note:** If `DATABASE_URL` is not set, the backend automatically uses the built-in **PGlite** (embedded PostgreSQL) — no external database required for local development.

---

## ▶️ Running the Full Project

Run both **frontend** and **backend** simultaneously from the project root:

```bash
pnpm dev
```

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:3000        |
| Backend  | http://localhost:4000        |
| API Docs | http://localhost:4000/api/health |

---

## ▶️ Running Frontend & Backend Separately

### Backend Only

```bash
# From project root
pnpm dev:backend

# Or from apps/backend directly
cd apps/backend
pnpm dev
```

Starts the Express server with `tsx watch` (hot-reload on file changes).  
API available at: `http://localhost:4000`

---

### Frontend Only

```bash
# From project root
pnpm dev:frontend

# Or from apps/frontend directly
cd apps/frontend
pnpm dev
```

Starts the Next.js dev server.  
UI available at: `http://localhost:3000`

---

## 🗄️ Database Management

The backend supports two database modes:

| Mode                   | When Used                       | Setup Required         |
|------------------------|---------------------------------|------------------------|
| **PGlite** (embedded)  | `DATABASE_URL` not set in `.env`| ❌ None — zero-config  |
| **PostgreSQL**         | `DATABASE_URL` set in `.env`    | ✅ Postgres must be running |

### Schema Migrations (Drizzle Kit)

All commands below run from `apps/backend/`:

```bash
cd apps/backend
```

#### Generate a new migration file from schema changes

```bash
pnpm drizzle:generate
```

Reads `src/db/schema.ts` and outputs SQL migration files to `./drizzle/`.

#### Apply migrations to the database (push schema directly — no migration files)

```bash
pnpm drizzle:push
```

Directly synchronises the database schema to match `schema.ts`. Useful for rapid development.

#### Open Drizzle Studio (Visual DB Browser)

```bash
pnpm drizzle:studio
```

Opens a browser-based GUI to browse and manage your database tables.  
Requires `DATABASE_URL` to be set in `.env`.

### Seed the Database

Seeds the product catalog with 11 default items (beverages, bakery, merchandise).  
The seeder is **idempotent** — it skips if products already exist.

```bash
# From project root
pnpm seed

# Or from apps/backend directly
cd apps/backend
pnpm seed
```

> **Note:** When running in PGlite mode, seeding also happens automatically on server start.

---

## 🔨 Building for Production

### Build Everything

```bash
pnpm build
```

### Build Individual Apps

```bash
# Backend only
pnpm --filter @pos/backend build

# Frontend only
pnpm --filter @pos/frontend build
```

### Start Production Servers

```bash
# Backend (after building)
cd apps/backend
pnpm start            # node dist/index.js on port 4000

# Frontend (after building)
cd apps/frontend
pnpm start            # next start on port 3000
```

---

## ✅ Type Checking

### Typecheck the Entire Workspace

```bash
pnpm typecheck
```

### Typecheck Individual Packages

```bash
# Backend only
pnpm --filter @pos/backend typecheck

# Frontend only
pnpm --filter @pos/frontend typecheck

# Shared types package only
pnpm --filter @pos/shared-types typecheck
```

---

## 🧪 Testing

### Concurrency / Race Condition Stress Test

Tests the stock reservation system under high concurrency:
- Creates a product with **5 units** of stock
- Fires **25 simultaneous order requests** in parallel
- Asserts exactly **5 succeed** and **20 return 409 Insufficient Stock**
- Verifies **zero overselling** under race conditions

```bash
# From project root
pnpm test:concurrency

# Or from apps/backend directly
cd apps/backend
pnpm test:concurrency
```

Expected output on pass:
```
🎉 100% PASS: Concurrency safety verified! Zero overselling under race conditions.
```

---

## 🌐 API Endpoints Reference

Base URL: `http://localhost:4000`

| Method  | Endpoint                    | Description                                       |
|---------|-----------------------------|---------------------------------------------------|
| `GET`   | `/api/health`               | Health check                                      |
| `GET`   | `/api/products`             | List all products with stock levels               |
| `POST`  | `/api/products`             | Create a new product                              |
| `PATCH` | `/api/products/:id/stock`   | Update stock quantity for a product               |
| `GET`   | `/api/orders`               | List all orders                                   |
| `POST`  | `/api/orders`               | Create order (concurrency-safe stock reservation) |
| `GET`   | `/api/orders/:id`           | Get a single order with items and payment status  |
| `POST`  | `/api/orders/:id/cancel`    | Cancel a pending/reserved order                   |
| `POST`  | `/api/orders/:id/pay`       | Process payment for a reserved order              |

---

## 🔎 Linting

```bash
# Frontend (Next.js ESLint)
cd apps/frontend
pnpm lint
```

---

## 🛠️ Useful One-liners

```bash
# Reinstall all dependencies from scratch
pnpm install

# Clean install — Windows PowerShell (remove all node_modules first)
Get-ChildItem -Recurse -Filter node_modules | Remove-Item -Recurse -Force
pnpm install

# Check pnpm version
pnpm --version

# List all workspace packages
pnpm ls -r --depth 0
```

---

## 🗂️ Environment Files

| File                          | Purpose                                   |
|-------------------------------|-------------------------------------------|
| `apps/backend/.env`           | Local backend secrets (not committed)     |
| `apps/backend/.env.example`   | Template — copy this to create `.env`     |

---

## 📋 Quick Reference Cheat Sheet

```bash
# ── INSTALL ──────────────────────────────────────────────────────
pnpm install                                   # Install all workspace dependencies

# ── DEVELOP ──────────────────────────────────────────────────────
pnpm dev                                       # Start frontend + backend together
pnpm dev:backend                               # Backend only  (port 4000)
pnpm dev:frontend                              # Frontend only (port 3000)

# ── DATABASE ─────────────────────────────────────────────────────
pnpm seed                                      # Seed the product catalog
pnpm --filter @pos/backend drizzle:generate    # Generate migration SQL files
pnpm --filter @pos/backend drizzle:push        # Push schema directly to DB
pnpm --filter @pos/backend drizzle:studio      # Open Drizzle Studio GUI

# ── TYPE CHECK ───────────────────────────────────────────────────
pnpm typecheck                                 # Typecheck all packages

# ── TEST ─────────────────────────────────────────────────────────
pnpm test:concurrency                          # Concurrency stress test

# ── BUILD & START (PRODUCTION) ───────────────────────────────────
pnpm build                                     # Build all packages
pnpm --filter @pos/backend start               # Start backend (post-build)
pnpm --filter @pos/frontend start              # Start frontend (post-build)
```
