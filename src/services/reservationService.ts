import { prisma } from "@/lib/prisma";
import { ReservationStatus } from "@prisma/client";
import { ReservationDetails } from "@/types";

const RESERVATION_EXPIRY_MINUTES = 10;

/**
 * CONCURRENCY STRATEGY — Atomic Conditional UPDATE
 *
 * Instead of SELECT FOR UPDATE (which causes serialization errors under
 * Serializable isolation), we use a single atomic UPDATE with a WHERE guard:
 *
 *   UPDATE inventories
 *   SET reservedStock = reservedStock + qty
 *   WHERE productId = ? AND warehouseId = ?
 *     AND (totalStock - reservedStock) >= qty
 *
 * PostgreSQL executes this as a single atomic operation under READ COMMITTED.
 * - If stock is available: exactly one concurrent transaction updates the row.
 *   Others that race will re-read the updated reservedStock and find 0 available → 0 rows affected.
 * - If 0 rows affected: return HTTP 409 immediately — no oversell possible.
 *
 * This is simpler, more performant, and correctly handles concurrency
 * without serialization errors (code 40001).
 */
export async function createReservation(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<ReservationDetails> {
  return await prisma.$transaction(async (tx) => {
    // Atomic conditional update — the WHERE clause is the stock guard
    const result = await tx.$executeRaw`
      UPDATE inventories
      SET   "reservedStock" = "reservedStock" + ${quantity},
            "updatedAt"     = NOW()
      WHERE "productId"   = ${productId}
        AND "warehouseId" = ${warehouseId}
        AND ("totalStock" - "reservedStock") >= ${quantity}
    `;

    // 0 rows affected = insufficient stock (or product/warehouse not found)
    if (result === 0) {
      // Check if the inventory row even exists to give a better error message
      const inv = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
        select: { totalStock: true, reservedStock: true },
      });

      if (!inv) {
        throw new StockError("NOT_FOUND", "No inventory found for this product and warehouse");
      }

      throw new StockError(
        "INSUFFICIENT_STOCK",
        `Insufficient stock. Requested: ${quantity}, Available: ${inv.totalStock - inv.reservedStock}`
      );
    }

    // Stock successfully reserved — create the reservation record
    const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000);

    const reservation = await tx.reservation.create({
      data: { productId, warehouseId, quantity, status: "PENDING", expiresAt },
      include: {
        product:   { select: { name: true } },
        warehouse: { select: { name: true } },
      },
    });

    return toReservationDetails(reservation);
  });
}

/**
 * Confirms a PENDING reservation:
 *  - Permanently decrements totalStock (item is sold)
 *  - Decrements reservedStock (releases the hold)
 *  - Marks reservation CONFIRMED
 * Returns HTTP 410 if expired.
 */
export async function confirmReservation(reservationId: string): Promise<ReservationDetails> {
  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: {
        product:   { select: { name: true } },
        warehouse: { select: { name: true } },
      },
    });

    if (!reservation) throw new StockError("NOT_FOUND", "Reservation not found");

    if (reservation.status !== "PENDING") {
      throw new StockError("INVALID_STATE", `Reservation is already ${reservation.status.toLowerCase()}`);
    }

    // Lazy expiry check
    if (new Date() > reservation.expiresAt) {
      // Release the held stock before returning 410
      await tx.$executeRaw`
        UPDATE inventories
        SET "reservedStock" = GREATEST(0, "reservedStock" - ${reservation.quantity}),
            "updatedAt"     = NOW()
        WHERE "productId"   = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;
      await tx.reservation.update({
        where: { id: reservationId },
        data:  { status: "RELEASED" },
      });
      throw new StockError("RESERVATION_EXPIRED", "Reservation has expired");
    }

    // Decrement totalStock (permanent sale) and release reservedStock hold
    await tx.$executeRaw`
      UPDATE inventories
      SET "totalStock"    = "totalStock"    - ${reservation.quantity},
          "reservedStock" = GREATEST(0, "reservedStock" - ${reservation.quantity}),
          "updatedAt"     = NOW()
      WHERE "productId"   = ${reservation.productId}
        AND "warehouseId" = ${reservation.warehouseId}
    `;

    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data:  { status: "CONFIRMED" },
      include: {
        product:   { select: { name: true } },
        warehouse: { select: { name: true } },
      },
    });

    return toReservationDetails(updated);
  });
}

/**
 * Releases a PENDING reservation — restores reservedStock.
 */
export async function releaseReservation(reservationId: string): Promise<ReservationDetails> {
  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: {
        product:   { select: { name: true } },
        warehouse: { select: { name: true } },
      },
    });

    if (!reservation) throw new StockError("NOT_FOUND", "Reservation not found");

    if (reservation.status !== "PENDING") {
      throw new StockError(
        "INVALID_STATE",
        `Cannot release a reservation that is already ${reservation.status.toLowerCase()}`
      );
    }

    await tx.$executeRaw`
      UPDATE inventories
      SET "reservedStock" = GREATEST(0, "reservedStock" - ${reservation.quantity}),
          "updatedAt"     = NOW()
      WHERE "productId"   = ${reservation.productId}
        AND "warehouseId" = ${reservation.warehouseId}
    `;

    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data:  { status: "RELEASED" },
      include: {
        product:   { select: { name: true } },
        warehouse: { select: { name: true } },
      },
    });

    return toReservationDetails(updated);
  });
}

/**
 * Fetches a reservation and performs lazy expiry cleanup if needed.
 */
export async function getReservation(reservationId: string): Promise<ReservationDetails> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      product:   { select: { name: true } },
      warehouse: { select: { name: true } },
    },
  });

  if (!reservation) throw new StockError("NOT_FOUND", "Reservation not found");

  // Lazy expiry: clean up silently on read
  if (reservation.status === "PENDING" && new Date() > reservation.expiresAt) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE inventories
        SET "reservedStock" = GREATEST(0, "reservedStock" - ${reservation.quantity}),
            "updatedAt"     = NOW()
        WHERE "productId"   = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;
      await tx.reservation.update({
        where: { id: reservationId },
        data:  { status: "RELEASED" },
      });
    });
    reservation.status = "RELEASED";
  }

  return toReservationDetails(reservation);
}

/**
 * Bulk-cleans all expired PENDING reservations (called by cron route).
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const expired = await prisma.reservation.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
  });

  if (expired.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    for (const r of expired) {
      await tx.$executeRaw`
        UPDATE inventories
        SET "reservedStock" = GREATEST(0, "reservedStock" - ${r.quantity}),
            "updatedAt"     = NOW()
        WHERE "productId"   = ${r.productId}
          AND "warehouseId" = ${r.warehouseId}
      `;
    }
    await tx.reservation.updateMany({
      where: { id: { in: expired.map((r) => r.id) } },
      data:  { status: "RELEASED" },
    });
  });

  return expired.length;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toReservationDetails(r: {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
  product: { name: string };
  warehouse: { name: string };
}): ReservationDetails {
  return {
    id:            r.id,
    productId:     r.productId,
    productName:   r.product.name,
    warehouseId:   r.warehouseId,
    warehouseName: r.warehouse.name,
    quantity:      r.quantity,
    status:        r.status,
    expiresAt:     r.expiresAt.toISOString(),
    createdAt:     r.createdAt.toISOString(),
  };
}

// ─── Custom Error ─────────────────────────────────────────────────────────────

export class StockError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "StockError";
  }
}
