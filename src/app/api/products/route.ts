import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventories: {
          include: {
            warehouse: {
              select: { id: true, name: true, location: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      createdAt: product.createdAt.toISOString(),
      inventories: product.inventories.map((inv) => ({
        id: inv.id,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        warehouseLocation: inv.warehouse.location,
        totalStock: inv.totalStock,
        reservedStock: inv.reservedStock,
        availableStock: inv.totalStock - inv.reservedStock,
      })),
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
