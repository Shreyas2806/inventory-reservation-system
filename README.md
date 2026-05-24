# StockReserve — High-Concurrency Inventory Reservation System

A production-ready, full-stack inventory reservation system built with Next.js 15 (App Router), TypeScript, Prisma, PostgreSQL, and Tailwind CSS. Designed to simulate high-traffic checkout flows (like BookMyShow or Amazon flash sales) with zero oversell guarantees.

---

## 🎯 Key Engineering Achievement: Race-Condition-Free Reservations

When multiple users attempt to reserve the last available unit simultaneously, **exactly one request succeeds** and the others receive an **HTTP 409 Conflict**. 

This is guaranteed via an **Atomic Conditional Update** in PostgreSQL. By using a single atomic `UPDATE` query with a `WHERE` stock-guard clause, the system completely avoids complex row-level locking (`SELECT FOR UPDATE`) and serialization errors, achieving maximum throughput while ensuring 100% data integrity.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript (Strict Mode) |
| **Database ORM**| Prisma 6 |
| **Database** | PostgreSQL (Hosted on Supabase) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Validation** | Zod |
| **Deployment** | Vercel (Frontend & Serverless API) |

---

## 🔒 Concurrency Architecture

### The Problem
In a distributed system without locking, two concurrent requests can both read `availableStock = 1`, both pass the stock check, and both create reservations — resulting in **overselling**.

### The Solution: Atomic Conditional Updates
Instead of relying on heavy transactional locks which reduce throughput and cause transaction deadlocks, this system pushes the concurrency check directly to the database engine using an atomic query:

```sql
UPDATE inventories
SET "reservedStock" = "reservedStock" + $quantity,
    "updatedAt"     = NOW()
WHERE "productId"   = $productId
  AND "warehouseId" = $warehouseId
  AND ("totalStock" - "reservedStock") >= $quantity; -- 👈 The Stock Guard
```

- **Atomicity**: PostgreSQL executes this as a single atomic operation.
- **Race Condition Immunity**: If 5 users race for 1 item, the first query succeeds. For the remaining 4, the `WHERE` condition instantly becomes false, returning 0 affected rows.
- **Performance**: No `SELECT FOR UPDATE` means no blocking locks, making this highly scalable for flash sales.

### Stock Lifecycle
```text
totalStock = 10          ← physical units in warehouse
reservedStock = 1        ← units held by PENDING reservations
availableStock = 9       ← computed dynamically: (totalStock - reservedStock)

On RESERVE:   reservedStock += quantity
On CONFIRM:   totalStock -= quantity, reservedStock -= quantity (permanent sale)
On RELEASE:   reservedStock -= quantity (stock freed for others)
```

---

## ⏱️ Smart Expiry Mechanism

Reservations are strictly held for **10 minutes**. To maintain system health without requiring a long-running background process, the system uses a hybrid cleanup approach:

1. **Lazy Cleanup (Always Active)**: On every read request (`GET /api/reservations/:id`), the system checks the expiry. If expired, it automatically releases the stock before returning the response.
2. **Cron Cleanup (Production)**: A Vercel Cron Job runs `GET /api/cron/cleanup` every 5 minutes to sweep and bulk-release any orphaned expired reservations.

---

## ⚡ Concurrency Testing

The repository includes a dedicated test script to prove the concurrency safety.

```bash
# Run the local server first: npm run dev
# Then execute the load test:
npm run test:concurrency
```

**Expected Output:**
```text
✅ Request #3 → HTTP 201 (145ms)   Reservation ID: clxxx...
❌ Request #1 → HTTP 409 (148ms)   Reason: Insufficient stock
❌ Request #2 → HTTP 409 (148ms)   Reason: Insufficient stock
❌ Request #4 → HTTP 409 (149ms)   Reason: Insufficient stock
❌ Request #5 → HTTP 409 (151ms)   Reason: Insufficient stock

🎉 PASS: Exactly 1 reservation succeeded. No oversell detected!
```

---

## ⚙️ Setup Instructions

### 1. Clone & Install
```bash
git clone https://github.com/Shreyas2806/inventory-reservation-system.git
cd inventory-reservation-system
npm install
```

### 2. Environment Variables
Create a `.env` file based on `.env.example`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/inventory_reservation?pgbouncer=true"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="your-strong-random-secret"
```

### 3. Database Setup (Migrations & Seeding)
```bash
npm run db:migrate
npm run db:generate
npm run db:seed
```
*(The seed script populates warehouses, products, and sets up a specific 1-unit scenario for testing).*

### 4. Run Development Server
```bash
npm run dev
```

---

## 📁 Project Structure Highlights

- `src/services/reservationService.ts`: Core business logic containing the atomic SQL queries.
- `src/app/api/reservations/route.ts`: Next.js REST API endpoints.
- `scripts/test-concurrency.ts`: The concurrency load-testing script.
- `prisma/schema.prisma`: Database schema definitions.

---
