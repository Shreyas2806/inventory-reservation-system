import { z } from "zod";

/** Zod schema for creating a reservation */
export const createReservationSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1")
    .max(1000, "Quantity cannot exceed 1000"),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
