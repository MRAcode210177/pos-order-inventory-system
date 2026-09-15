# 🚀 Tailored Production Deployment Guide
**Project:** NexusPOS Monorepo | **Railway Canvas:** `generous-eagerness`

---

## 📊 Current Project Deployment Status

| Component | Host | Status | Details |
| :--- | :--- | :--- | :--- |
| **Database (PostgreSQL)** | Railway | ✅ **READY & INITIALIZED** | Tables `products`, `orders`, `order_items`, `payments` created in `generous-eagerness` |
| **Backend API (Express)** | Railway | 🔲 **NEXT STEP** | Needs to be added as a GitHub Web Service in `generous-eagerness` |
| **Frontend UI (Next.js)** | Vercel | 🔲 **FINAL STEP** | Needs to be imported on Vercel pointing to Railway Backend URL |

---

## 🟢 STEP 1: Deploy the Backend Service on Railway

Since your database is already running inside your Railway project (`generous-eagerness`), you now need to deploy your backend code into the **same project canvas**.

### 1.1 Add Backend Service to Railway Canvas
1. Go to your Railway project page: **`generous-eagerness`**.
2. Click the **`+ New`** button (top-right corner) or press `Ctrl + K`.
3. Select **GitHub Repo**.
4. Search and select your repository: `pos-order-inventory-system`.
5. Railway will place a new box (service) on your canvas alongside your existing `Postgres` box.

### 1.2 Configure Build & Start Commands
1. Click on the newly created service box (you can rename it to **`backend`** in settings).
2. Go to the **Settings** tab on the right panel.
3. Scroll to **Build & Deploy**:
   - **Root Directory:** Leave blank `/` or set to `apps/backend`
   - **Build Command:** 
     ```bash
     pnpm --filter @pos/shared-types build && pnpm --filter @pos/backend build
     ```
   - **Start Command:** 
     ```bash
     pnpm --filter @pos/backend start
     ```

### 1.3 Add Environment Variables
1. Click the **Variables** tab for the `backend` service.
2. Click **New Variable** (or **Raw Editor**) and add the following:

| Variable Name | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Uses Railway's fast internal database connection *(or paste your full `postgresql://postgres:...` string)* |
| `PORT` | `4000` | Backend HTTP listening port |
| `CORS_ORIGIN` | `*` | Allows frontend requests *(We will lock this down to your Vercel URL later)* |
| `NODE_ENV` | `production` | Production environment mode |

### 1.4 Generate Public Backend Domain URL
1. In the `backend` service, go to **Settings** → **Networking** (or **Public Networking**).
2. Click **Generate Domain**.
3. Railway will generate a public URL like:
   `https://backend-production-xxxx.up.railway.app`
4. **Test your backend in browser:** Open `https://backend-production-xxxx.up.railway.app/api/health`
   - You should see: `{"ok":true,"data":{"status":"healthy","timestamp":"..."}}`

---

## ⚡ STEP 2: Deploy the Frontend on Vercel

Now that your Railway backend has a live public URL, deploy the Next.js frontend to Vercel.

### 2.1 Import Repository into Vercel
1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository `pos-order-inventory-system`.

### 2.2 Configure Monorepo Settings
1. **Framework Preset:** Next.js
2. **Root Directory:** Click **Edit** and select **`apps/frontend`**
3. Expand **Build and Output Settings**:
   - Vercel automatically detects pnpm workspace setup.
   - Ensure **"Include source files outside Root Directory"** is **checked/enabled** so Vercel can access `@pos/shared-types`.

### 2.3 Set Frontend Environment Variable
Under **Environment Variables**, add:

| Variable Name | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://backend-production-xxxx.up.railway.app/api` |

*(Replace `https://backend-production-xxxx.up.railway.app` with your actual Railway domain generated in Step 1.4).*

### 2.4 Click Deploy
1. Click **Deploy**.
2. Vercel will build the frontend and provide your live production URL (e.g., `https://nexus-pos.vercel.app`).

---

## 🔒 STEP 3: Final Production Security & Verification

1. **Test Live Website:** Open your Vercel link in browser. Verify product cards load from Railway PostgreSQL.
2. **Lock Down Backend CORS (Optional Best Practice):**
   - Go back to Railway → `backend` service → **Variables**.
   - Change `CORS_ORIGIN` from `*` to your exact Vercel domain:
     `https://nexus-pos.vercel.app`
3. **Verify Features:**
   - Reserve items by placing an order (test stock lock).
   - Pay order using mock checkout (test payment gateway).
   - Edit inventory stock/price in `/inventory`.

---
