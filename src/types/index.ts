// Shared TypeScript types for the inventory reservation system

import { ReservationStatus } from "@prisma/client";

export type { ReservationStatus };

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// ─── Product Types ────────────────────────────────────────────────────────────

export interface ProductWithInventory {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  inventories: InventoryInfo[];
}

export interface InventoryInfo {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string | null;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
}

// ─── Warehouse Types ──────────────────────────────────────────────────────────

export interface WarehouseInfo {
  id: string;
  name: string;
  location: string | null;
}

// ─── Reservation Types ────────────────────────────────────────────────────────

export interface ReservationDetails {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface CreateReservationInput {
  productId: string;
  warehouseId: string;
  quantity: number;
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export interface AppError {
  code: "INSUFFICIENT_STOCK" | "RESERVATION_EXPIRED" | "NOT_FOUND" | "INVALID_INPUT" | "INTERNAL_ERROR";
  message: string;
  statusCode: number;
}
