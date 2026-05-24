import { NextRequest, NextResponse } from "next/server";
import { createReservationSchema } from "@/lib/validations";
import { createReservation, StockError } from "@/services/reservationService";
import { prisma } from "@/lib/prisma";

// POST /api/reservations — Create a new reservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    const reservation = await createReservation(productId, warehouseId, quantity);

    return NextResponse.json({ data: reservation }, { status: 201 });
  } catch (error) {
    if (error instanceof StockError) {
      if (error.code === "INSUFFICIENT_STOCK") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[POST /api/reservations]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/reservations — List all reservations (for admin/debug)
export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        product: { select: { name: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      data: reservations.map((r) => ({
        id: r.id,
        productName: r.product.name,
        warehouseName: r.warehouse.name,
        quantity: r.quantity,
        status: r.status,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/reservations]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
