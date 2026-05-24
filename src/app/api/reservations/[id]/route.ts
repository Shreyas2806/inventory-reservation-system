import { NextRequest, NextResponse } from "next/server";
import { getReservation, StockError } from "@/services/reservationService";

// GET /api/reservations/:id — Get a single reservation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await getReservation(id);
    return NextResponse.json({ data: reservation });
  } catch (error) {
    if (error instanceof StockError) {
      const status = error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("[GET /api/reservations/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
