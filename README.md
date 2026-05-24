# StockReserve — Inventory Reservation System

A concurrency-safe, full-stack inventory reservation system built with Next.js 15 App Router, TypeScript, Prisma, PostgreSQL, and Tailwind CSS. Modelled after Amazon/BookMyShow-style checkout reservation flows.

---

## 🎯 Key Feature: Race-Condition-Free Reservations

When two users attempt to reserve the last unit simultaneously, **exactly one request succeeds** and the other receives **HTTP 409 Conflict**. This is guaranteed via PostgreSQL `SELECT ... FOR UPDATE` row-level locking inside a Serializable transaction.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| ORM | Prisma 6 |
| Database | PostgreSQL (Supabase / Neon compatible) |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Zod |
| Forms | React Hook Form |
| Deployment | Vercel + Supabase/Neon |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── products/route.ts          # GET all products with inventory
│   │   ├── warehouses/route.ts        # GET all warehouses
│   │   ├── reservations/
│   │   │   ├── route.ts              # POST create, GET list
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET single reservation
│   │   │       ├── confirm/route.ts  # POST confirm (decrement stock)
│   │   │       └── release/route.ts  # POST release (restore stock)
│   │   └── cron/
│   │       └── cleanup/route.ts      # GET cleanup expired reservations
│   ├── reservations/[id]/
│   │   ├── page.tsx                  # Server component wrapper
│   │   └── ReservationPageClient.tsx # Client with timer + actions
│   ├── page.tsx                      # Product listing home
│   ├── layout.tsx                    # Root layout + navigation
│   └── globals.css                   # Global styles + dark theme
├── components/
│   ├── ProductCard.tsx               # Product card with reserve form
│   └── ReservationTimer.tsx          # Live countdown component
├── lib/
│   ├── prisma.ts                     # Singleton Prisma client
│   ├── utils.ts                      # cn(), formatDate(), formatCountdown()
│   └── validations.ts                # Zod schemas
├── services/
│   └── reservationService.ts         # Core business logic (concurrency-safe)
└── types/
    └── index.ts                      # Shared TypeScript types

prisma/
├── schema.prisma                     # Database models
└── seed.ts                           # Sample data seed

scripts/
└── test-concurrency.ts               # Concurrent request test

vercel.json                           # Cron job configuration
```

---

## ⚙️ Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd inventory-reservation-system
npm install
```

### 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="your-strong-random-secret"
```

**For local development with Docker:**
```bash
docker run --name postgres-dev -e POSTGRES_PASSWORD=password -e POSTGRES_DB=inventory_reservation -p 5432:5432 -d postgres:16
DATABASE_URL="postgresql://postgres:password@localhost:5432/inventory_reservation"
```

**For Supabase / Neon:** Copy the connection string from your dashboard.

### 3. Database Migration

```bash
npm run db:migrate
# When prompted, name the migration: "init"
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Seed the Database

```bash
npm run db:seed
```

This creates:
- **3 Warehouses**: Mumbai Central, Delhi Hub, Bangalore Tech Park
- **5 Products**: iPhone 16 Pro, MacBook Pro 14", Sony WH-1000XM5, Apple Watch Ultra 2, iPad Pro 13"
- **11 Inventory records** (various stock levels, including 1 unit at Bangalore for concurrency testing)

### 6. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🔗 API Reference

### `GET /api/products`
Returns all products with per-warehouse inventory and available stock.

### `GET /api/warehouses`
Returns all warehouses.

### `POST /api/reservations`
```json
{
  "productId": "prod-iphone",
  "warehouseId": "wh-bangalore",
  "quantity": 1
}
```
**Responses:**
- `201` — Reservation created, expires in 10 minutes
- `400` — Invalid input
- `409` — Insufficient stock (concurrency conflict)

### `GET /api/reservations/:id`
Returns reservation details with lazy expiry check.

### `POST /api/reservations/:id/confirm`
Confirms purchase: permanently decrements `totalStock`, releases `reservedStock`.
- `200` — Confirmed
- `404` — Not found
- `410` — Reservation expired

### `POST /api/reservations/:id/release`
Releases reservation, restores `reservedStock`.
- `200` — Released

### `GET /api/cron/cleanup`
Bulk-cleans all expired PENDING reservations.
Protected by `Authorization: Bearer <CRON_SECRET>` in production.

---

## 🔒 Concurrency Handling

### The Problem
Without locking, two concurrent requests can both read `availableStock = 1`, both pass the stock check, and both create reservations — **overselling by 1 unit**.

### The Solution

```sql
-- Step 1: Lock the inventory row exclusively
SELECT id, "totalStock", "reservedStock"
FROM inventories
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE;

-- Step 2: Check stock AFTER acquiring the lock
-- (second transaction will wait, then see 0 available)

-- Step 3: Atomically increment reservedStock
UPDATE inventories
SET "reservedStock" = "reservedStock" + $quantity
WHERE id = $id;
```

- **`FOR UPDATE`**: Exclusive row lock — concurrent transactions serialize at this point
- **`SERIALIZABLE`** isolation level: Prevents phantom reads and write skew
- **Result**: Of 5 simultaneous requests for 1 unit, exactly 1 succeeds; 4 return HTTP 409

### Stock Lifecycle
```
totalStock = 10          ← physical units in warehouse
reservedStock = 1        ← units held by PENDING reservations
availableStock = 9       ← computed: totalStock - reservedStock

On RESERVE:   reservedStock += quantity
On CONFIRM:   totalStock -= quantity, reservedStock -= quantity
On RELEASE:   reservedStock -= quantity
```

---

## ⏱️ Expiry Mechanism

Reservations expire after **10 minutes** (`expiresAt = now + 10min`).

Two cleanup strategies are implemented:

### 1. Lazy Cleanup (always active)
On every `GET /api/reservations/:id`, if the reservation is `PENDING` and `expiresAt < now`, it is automatically released and stock restored.

### 2. Cron Cleanup (production)
`GET /api/cron/cleanup` bulk-releases all expired `PENDING` reservations.

Configure in `vercel.json` to run every 5 minutes:
```json
{
  "crons": [{ "path": "/api/cron/cleanup", "schedule": "*/5 * * * *" }]
}
```

---

## ⚡ Concurrency Test

```bash
# Make sure dev server is running first
npm run dev

# In another terminal:
npm run test:concurrency
```

Expected output:
```
✅ Request #3 → HTTP 201 (145ms)   Reservation ID: clxxx...
❌ Request #1 → HTTP 409 (148ms)   Reason: Insufficient stock...
❌ Request #2 → HTTP 409 (148ms)   Reason: Insufficient stock...
❌ Request #4 → HTTP 409 (149ms)   Reason: Insufficient stock...
❌ Request #5 → HTTP 409 (151ms)   Reason: Insufficient stock...

✅ SUCCEEDED: 1  ❌ CONFLICTS: 4  💥 ERRORS: 0
🎉 PASS: Exactly 1 reservation succeeded. No oversell detected!
```

---

## 🚀 Deployment

### Vercel + Neon (Recommended)

1. Create a [Neon](https://neon.tech) database and copy the connection string
2. Push code to GitHub
3. Import project to [Vercel](https://vercel.com)
4. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` — Neon connection string
   - `NEXT_PUBLIC_APP_URL` — Your Vercel deployment URL
   - `CRON_SECRET` — Random secret for cron protection
5. Deploy — Vercel will run migrations automatically via the build command

Add to `package.json` scripts for Vercel:
```json
"postinstall": "prisma generate",
"vercel-build": "prisma migrate deploy && next build"
```

### Vercel + Supabase

Same flow — use the Supabase connection string with `?pgbouncer=true&connection_limit=1` appended for serverless.

---

## 🏗️ Architectural Tradeoffs

| Decision | Chosen | Alternative | Reason |
|----------|--------|-------------|--------|
| Locking | `SELECT FOR UPDATE` | Optimistic locking | Simpler, guaranteed correctness for this scale |
| Isolation | Serializable | Read Committed | Maximum safety; slight throughput cost acceptable |
| Expiry | Lazy + Cron | Background worker | Serverless-friendly, no persistent process needed |
| State storage | PostgreSQL only | Redis for sessions | Fewer infrastructure dependencies |
| Stock model | reservedStock counter | Lock table | Single row update is atomic and efficient |

---

## 🛠 Useful Commands

```bash
npm run dev              # Start development server
npm run db:generate      # Regenerate Prisma client
npm run db:migrate       # Run pending migrations
npm run db:seed          # Seed sample data
npm run db:studio        # Open Prisma Studio GUI
npm run test:concurrency # Run concurrency test (server must be running)
npm run build            # Production build
npm run lint             # ESLint check
```
