# POS Order & Inventory Management System

> A high-performance, concurrency-safe Point-of-Sale (POS), Order Processing, and Multi-Batch Inventory Management platform with atomic race-condition prevention, automated batch expiration background workers, and mock payment gateway processing.

**Live Links**
| | URL |
|---|---|
| **Client (Vercel)** | https://pos-order-inventory-system-frontend-psi.vercel.app/ |
| **Server (Railway)** | https://pos-order-inventory-system-production.up.railway.app/api |
| **GitHub** | https://github.com/MRAcode210177/pos-order-inventory-system |
| **Screen Recording** | `[Paste your Loom / Google Drive Demo Link here]` |

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Key Features & UI Pages](#key-features--ui-pages)
- [Prerequisites](#prerequisites)
- [Local Setup — Monorepo Quickstart](#local-setup--monorepo-quickstart)
- [Local Setup — Server (`task-01(backend)`)](#local-setup--server-task-01backend)
- [Local Setup — Client (`task-02(frontend)`)](#local-setup--client-task-02frontend)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Concurrency & Race-Condition Handling](#concurrency--race-condition-handling)
- [Data Models & Schema](#data-models--schema)
- [Seeding & Database Inspection](#seeding--database-inspection)
- [Deployment Guide](#deployment-guide)
- [Scripts](#scripts)

---

## Tech Stack

### Server (`apps/task-01(backend)`)

| Layer | Technology |
|---|---|
| Runtime | Node.js (v18+ / v20+) |
| Language | TypeScript 5 |
| Framework | Express 4 |
| Database & ORM | PostgreSQL (via Drizzle ORM 0.33) |
| Embedded Engine | `@electric-sql/pglite` (Zero-config local DB, switchable to standard PostgreSQL) |
| Validation | Zod 3 |
| Middleware | CORS, Express JSON Parser, Custom Centralized Error Handler |
| Tooling | `tsx` (TypeScript Execution & Watch Mode), Drizzle Kit |

### Client (`apps/task-02(frontend)`)

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, React 18) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3, `clsx`, `tailwind-merge` |
| UI Primitives | Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-tabs`) |
| Icons & Visuals | Lucide React, `canvas-confetti`, `tailwindcss-animate` |
| Shared Contract | `@pos/shared-types` (Workspace Package) |

---

## Project Structure

```
pos-order-inventory-system/
├── apps/
│   ├── task-01(backend)/                # Express.js REST API & Drizzle ORM Server
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts            # Drizzle relational PostgreSQL schema
│   │   │   │   ├── index.ts             # PGlite & PostgreSQL connection factory
│   │   │   │   └── seed.ts              # Database seed script with sample inventory
│   │   │   ├── errors/
│   │   │   │   └── AppError.ts          # Custom domain & HTTP error classes
│   │   │   ├── middleware/
│   │   │   │   ├── errorHandler.ts      # Global Express error handler
│   │   │   │   └── validate.ts          # Zod schema validation middleware
│   │   │   ├── routes/
│   │   │   │   ├── products.ts          # Product & stock management endpoints
│   │   │   │   ├── orders.ts            # Order creation, checkout & payment endpoints
│   │   │   │   └── health.ts            # System health check route (/api/health)
│   │   │   ├── services/
│   │   │   │   ├── productService.ts    # Product business logic & inventory calculations
│   │   │   │   ├── paymentService.ts    # Payment processing, idempotency & status handler
│   │   │   │   └── mockPaymentGateway.ts# Mock external payment provider simulator
│   │   │   ├── workers/
│   │   │   │   └── expiryWorker.ts      # Automated batch expiry background worker (60s cron)
│   │   │   ├── scripts/
│   │   │   │   ├── test-concurrency.ts  # Race condition load testing script
│   │   │   │   └── view-db.ts           # Terminal database inspector
│   │   │   └── index.ts                 # Express server bootstrap & worker initialization
│   │   ├── .env.example
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── task-02(frontend)/               # Next.js 14 POS Terminal & Dashboard
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx             # Real-time POS Checkout Terminal
│       │   │   ├── inventory/
│       │   │   │   └── page.tsx         # Inventory & Stock Management Page
│       │   │   ├── layout.tsx           # Navigation header, theme wrapper & layout
│       │   │   └── globals.css          # Tailwind CSS global design system
│       │   ├── components/
│       │   │   ├── ProductCard.tsx      # Interactive product tile with stock badges
│       │   │   ├── CartDrawer.tsx       # Real-time cart drawer with quantity counters
│       │   │   ├── CheckoutModal.tsx    # Payment modal (Cash, Card, UPI) & receipt dialog
│       │   │   ├── AddProductModal.tsx  # Product creation modal with batch setup
│       │   │   └── ui/                  # Reusable UI primitives (Button, Dialog, Badge, Input)
│       │   ├── lib/
│       │   │   ├── api.ts               # Type-safe API client consuming shared DTOs
│       │   │   └── utils.ts             # Currency, date, and classname formatters
│       │   ├── .env.example
│       │   ├── next.config.mjs
│       │   ├── tailwind.config.ts
│       │   └── package.json
│       │
├── packages/
│   └── shared-types/                    # Shared TypeScript interfaces & DTOs
│       ├── src/
│       │   └── index.ts                 # ProductDto, OrderDto, PaymentDto, Enums
│       ├── tsconfig.json
│       └── package.json
│
├── package.json                         # Monorepo root scripts & pnpm workspace orchestration
├── pnpm-workspace.yaml                  # pnpm workspace definition
└── README.md
```

---

## Key Features & UI Pages

### 1. Real-Time POS Terminal (`/`)
- **Category Filtering & Live Search**: Fast instant search across products and filtering by category (*All, Electronics, Food & Beverages, Clothing, Stationery*).
- **Dynamic Stock Validation**: Real-time stock counters update dynamically; items with zero inventory or expired batches cannot be over-added.
- **Cart & Pricing Engine**: Subtotal, configurable tax (5%), and total calculation with instant item quantity updates.
- **Checkout Modal**: Supports multiple payment methods (**CASH**, **CARD**, **UPI**), processes transactions, and generates an order receipt with confetti animations.

### 2. Inventory & Batch Management (`/inventory`)
- **Stock Status Badges**: Visual indicators for `In Stock`, `Low Stock` (<= 10 units), `Out of Stock`, and `Expired`.
- **Live Stock Adjustments**: Quick `+` and `-` quantity controls directly from the table for rapid inventory auditing.
- **Create & Edit Products**: Add new SKUs with batch numbers, unit prices, costs, categories, and specific batch expiration dates.
- **Toggle Active Status**: Soft-disable products from appearing on the active POS terminal without deleting transaction history.

### 3. Expiry Management & Background Worker
- **Automated Expiration Auditing**: Background cron worker (`expiryWorker.ts`) runs every 60 seconds to scan active product batches.
- **Auto-Status Transition**: Batches exceeding their expiration date are automatically transitioned to `EXPIRED` status, preventing expired items from being sold at the register.

### 4. Concurrency-Safe Order & Inventory Engine
- **Atomic SQL Transactions**: Inventory reservations and deductions occur inside ACID database transactions using row-level locks.
- **Overselling Protection**: Concurrent checkout requests for scarce stock are strictly sequenced; requests exceeding available stock fail gracefully with `409 Conflict`.

---

## Prerequisites

- **Node.js**: `v18.x` or `v20.x`
- **pnpm**: `v9.x` or `v10.x` (Install via `npm install -g pnpm`)

---

## Local Setup — Monorepo Quickstart

### 1. Clone the Repository
```bash
git clone https://github.com/MRAcode210177/pos-order-inventory-system.git
cd pos-order-inventory-system
```

### 2. Install Workspace Dependencies
```bash
pnpm install
```

### 3. Build Shared Types Package
```bash
pnpm --filter @pos/shared-types build
```

### 4. Setup Environment Files
```bash
# Server Environment
cp "apps/task-01(backend)/.env.example" "apps/task-01(backend)/.env"

# Client Environment
cp "apps/task-02(frontend)/.env.example" "apps/task-02(frontend)/.env"
```

### 5. Seed the Database
```bash
pnpm seed
```

### 6. Start Both Client & Server Concurrently
```bash
pnpm dev
```
- Frontend will be live at: **http://localhost:3000**
- Backend API will be live at: **http://localhost:4000/api**

---

## Local Setup — Server (`task-01(backend)`)

If you want to run or manage the backend independently:

```bash
# Navigate to backend directory
cd "apps/task-01(backend)"

# Run development server with auto-reload
pnpm dev

# Run database seed independently
pnpm seed

# View current database tables in terminal
pnpm db:view

# Execute concurrency race-condition test
pnpm test:concurrency
```

---

## Local Setup — Client (`task-02(frontend)`)

If you want to run or manage the frontend independently:

```bash
# Navigate to frontend directory
cd "apps/task-02(frontend)"

# Run Next.js development server
pnpm dev

# Typecheck and production build
pnpm build
```

---

## Environment Variables

### Server (`apps/task-01(backend)/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `4000` | Port for the Express server |
| `NODE_ENV` | Optional | `development` | Environment mode (`development` / `production`) |
| `DATABASE_URL` | Optional | `(embedded PGlite)` | PostgreSQL connection string. If omitted, uses zero-config embedded PGlite |
| `FRONTEND_URL` | Optional | `http://localhost:3000` | CORS origin allowed to communicate with the API |

### Client (`apps/task-02(frontend)/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Optional | `http://localhost:4000/api` | Base URL of the backend REST API |

---

## API Reference

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server uptime and health check |

### Products
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | Get products list (supports `search`, `category`, `includeInactive`, pagination) |
| `GET` | `/api/products/:id` | Get single product by ID with batch details |
| `POST` | `/api/products` | Create a new product with initial stock batch |
| `PUT` | `/api/products/:id` | Update product details |
| `PATCH` | `/api/products/:id/stock` | Adjust stock delta (`quantityDelta`) |
| `PATCH` | `/api/products/:id/toggle-status` | Toggle active / inactive status |
| `DELETE` | `/api/products/:id` | Delete product |

### Orders & Payments
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orders` | List orders (filterable by `status`) |
| `GET` | `/api/orders/:id` | Get order details with line items |
| `POST` | `/api/orders` | Create an order and atomically reserve stock |
| `POST` | `/api/orders/:id/pay` | Process payment (`CASH`, `CARD`, `UPI`) and finalize order |
| `POST` | `/api/orders/:id/cancel` | Cancel order and restore reserved stock |

---

## Concurrency & Race-Condition Handling

To guarantee data integrity under high traffic, inventory reservations execute inside **ACID transactions** that lock and verify batch inventory before deducting.

### Running the Concurrency Test
```bash
pnpm test:concurrency
```

### What this script verifies:
1. Resets a test product to exactly **3 units in stock**.
2. Fires **10 concurrent checkout requests** at the exact same millisecond.
3. Confirms that **exactly 3 orders succeed** (`201 Created`) and **7 orders are rejected** (`409 Conflict`), preventing overselling or negative inventory.

---

## Data Models & Schema

The relational schema is configured in Drizzle ORM (`apps/task-01(backend)/src/db/schema.ts`):

- **`products`**: `id`, `name`, `sku`, `category`, `price`, `costPrice`, `isActive`, `createdAt`, `updatedAt`
- **`product_batches`**: `id`, `productId`, `batchNumber`, `quantity`, `expiryDate`, `status` (`ACTIVE`, `EXPIRED`, `DEPLETED`)
- **`orders`**: `id`, `orderNumber`, `subtotal`, `tax`, `total`, `status` (`PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`, `EXPIRED`), `createdAt`
- **`order_items`**: `id`, `orderId`, `productId`, `batchId`, `quantity`, `unitPrice`, `totalPrice`
- **`payments`**: `id`, `orderId`, `amount`, `paymentMethod` (`CASH`, `CARD`, `UPI`), `status` (`SUCCESS`, `FAILED`, `REFUNDED`), `transactionId`, `createdAt`

---

## Seeding & Database Inspection

To populate your database with initial products, categories, stock, and batches:
```bash
pnpm seed
```

To quickly view current database records and inventory counts in your terminal:
```bash
pnpm db:view
```

---

## Deployment Guide

### Deploy Backend (Railway / Render)
1. Link your GitHub repository to Railway.
2. Set the Root Directory to: `apps/task-01(backend)`.
3. Add a PostgreSQL database service in Railway and link `DATABASE_URL`.
4. Build Command: `pnpm --filter @pos/shared-types build && pnpm --filter @pos/backend build`
5. Start Command: `pnpm --filter @pos/backend start`
6. Set Environment Variables: `PORT`, `NODE_ENV=production`, `FRONTEND_URL=<YOUR_VERCEL_URL>`.

### Deploy Frontend (Vercel)
1. Import the repository into Vercel.
2. Set Root Directory to: `apps/task-02(frontend)`.
3. Build Command: `pnpm --filter @pos/shared-types build && pnpm --filter @pos/frontend build`
4. Set Environment Variable: `NEXT_PUBLIC_API_URL=https://<YOUR_RAILWAY_URL>/api`.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start both Frontend and Backend concurrently |
| `pnpm dev:backend` | Start Express Backend in watch mode |
| `pnpm dev:frontend` | Start Next.js Frontend dev server |
| `pnpm seed` | Seed database with initial products & batches |
| `pnpm test:concurrency` | Run automated race-condition and concurrency verification |
| `pnpm db:view` | Inspect database tables directly in terminal |
| `pnpm build` | Build all workspace packages & applications |
| `pnpm typecheck` | Run TypeScript type checking across all workspaces |

---

## 👨‍💻 Author

- **Candidate**: [MRAcode210177](https://github.com/MRAcode210177)
- **Assessment**: Techloom.ai Full-Stack Engineering Assessment
