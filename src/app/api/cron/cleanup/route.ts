import { NextResponse } from "next/server";
import { cleanupExpiredReservations } from "@/services/reservationService";

/**
 * GET /api/cron/cleanup
 * 
 * Cleanup route for expired reservations.
 * Call this from a Vercel cron job or external scheduler.
 * 
 * In vercel.json, configure:
 *   { "crons": [{ "path": "/api/cron/cleanup", "schedule": "* * * * *" }] }
 */
export async function GET(request: Request) {
  // Protect the cron route in production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cleaned = await cleanupExpiredReservations();
    return NextResponse.json({
      message: `Cleaned up ${cleaned} expired reservations`,
      count: cleaned,
    });
  } catch (error) {
    console.error("[GET /api/cron/cleanup]", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
