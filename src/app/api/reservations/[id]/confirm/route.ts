import { NextRequest, NextResponse } from "next/server";
import { confirmReservation, StockError } from "@/services/reservationService";

// POST /api/reservations/:id/confirm — Confirm a pending reservation
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await confirmReservation(id);
    return NextResponse.json({ data: reservation });
  } catch (error) {
    if (error instanceof StockError) {
      if (error.code === "RESERVATION_EXPIRED") {
        return NextResponse.json({ error: error.message }, { status: 410 });
      }
      if (error.code === "NOT_FOUND") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[POST /api/reservations/:id/confirm]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
