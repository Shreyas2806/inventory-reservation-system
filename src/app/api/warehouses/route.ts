import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        location: w.location,
      })),
    });
  } catch (error) {
    console.error("[GET /api/warehouses]", error);
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
  }
}
