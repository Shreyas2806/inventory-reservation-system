import { NextRequest, NextResponse } from "next/server";
import { releaseReservation, StockError } from "@/services/reservationService";

// POST /api/reservations/:id/release — Release a pending reservation
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await releaseReservation(id);
    return NextResponse.json({ data: reservation });
  } catch (error) {
    if (error instanceof StockError) {
      if (error.code === "NOT_FOUND") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[POST /api/reservations/:id/release]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
