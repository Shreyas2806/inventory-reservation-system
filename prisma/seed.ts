import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Warehouses ───────────────────────────────────────────────────────────
  const [warehouseA, warehouseB, warehouseC] = await Promise.all([
    prisma.warehouse.upsert({
      where: { id: "wh-mumbai" },
      update: {},
      create: { id: "wh-mumbai", name: "Mumbai Central", location: "Mumbai, India" },
    }),
    prisma.warehouse.upsert({
      where: { id: "wh-delhi" },
      update: {},
      create: { id: "wh-delhi", name: "Delhi Hub", location: "New Delhi, India" },
    }),
    prisma.warehouse.upsert({
      where: { id: "wh-bangalore" },
      update: {},
      create: { id: "wh-bangalore", name: "Bangalore Tech Park", location: "Bengaluru, India" },
    }),
  ]);

  console.log("✅ Warehouses created");

  // ─── Products ─────────────────────────────────────────────────────────────
  const [iPhone, laptop, headphones, watch, tablet] = await Promise.all([
    prisma.product.upsert({
      where: { id: "prod-iphone" },
      update: {},
      create: {
        id: "prod-iphone",
        name: "iPhone 16 Pro",
        description: "Apple's latest flagship with A18 Pro chip and titanium design",
        imageUrl: null,
      },
    }),
    prisma.product.upsert({
      where: { id: "prod-laptop" },
      update: {},
      create: {
        id: "prod-laptop",
        name: "MacBook Pro 14\"",
        description: "Professional laptop with M4 chip, 16GB RAM, 512GB SSD",
        imageUrl: null,
      },
    }),
    prisma.product.upsert({
      where: { id: "prod-headphones" },
      update: {},
      create: {
        id: "prod-headphones",
        name: "Sony WH-1000XM5",
        description: "Industry-leading noise cancelling wireless headphones",
        imageUrl: null,
      },
    }),
    prisma.product.upsert({
      where: { id: "prod-watch" },
      update: {},
      create: {
        id: "prod-watch",
        name: "Apple Watch Ultra 2",
        description: "Most capable Apple Watch with titanium case and precision GPS",
        imageUrl: null,
      },
    }),
    prisma.product.upsert({
      where: { id: "prod-tablet" },
      update: {},
      create: {
        id: "prod-tablet",
        name: "iPad Pro 13\"",
        description: "Supercharged by M4 chip with Ultra Retina XDR display",
        imageUrl: null,
      },
    }),
  ]);

  console.log("✅ Products created");

  // ─── Inventory Records ────────────────────────────────────────────────────
  // Using upsert to safely re-run seed
  const inventoryData = [
    // iPhone inventory
    { productId: iPhone.id, warehouseId: warehouseA.id, totalStock: 10, reservedStock: 0 },
    { productId: iPhone.id, warehouseId: warehouseB.id, totalStock: 5, reservedStock: 0 },
    { productId: iPhone.id, warehouseId: warehouseC.id, totalStock: 1, reservedStock: 0 }, // ← test 409 here!

    // Laptop inventory
    { productId: laptop.id, warehouseId: warehouseA.id, totalStock: 8, reservedStock: 0 },
    { productId: laptop.id, warehouseId: warehouseB.id, totalStock: 3, reservedStock: 0 },

    // Headphones inventory
    { productId: headphones.id, warehouseId: warehouseA.id, totalStock: 25, reservedStock: 0 },
    { productId: headphones.id, warehouseId: warehouseC.id, totalStock: 15, reservedStock: 0 },

    // Watch inventory
    { productId: watch.id, warehouseId: warehouseB.id, totalStock: 7, reservedStock: 0 },
    { productId: watch.id, warehouseId: warehouseC.id, totalStock: 2, reservedStock: 0 },

    // Tablet inventory
    { productId: tablet.id, warehouseId: warehouseA.id, totalStock: 12, reservedStock: 0 },
    { productId: tablet.id, warehouseId: warehouseB.id, totalStock: 4, reservedStock: 0 },
  ];

  for (const inv of inventoryData) {
    await prisma.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: inv.productId,
          warehouseId: inv.warehouseId,
        },
      },
      update: { totalStock: inv.totalStock, reservedStock: inv.reservedStock },
      create: inv,
    });
  }

  console.log("✅ Inventory records created");
  console.log(`
📦 Seed complete!
   Warehouses: ${[warehouseA, warehouseB, warehouseC].map((w) => w.name).join(", ")}
   Products: ${[iPhone, laptop, headphones, watch, tablet].map((p) => p.name).join(", ")}
   
💡 TIP: iPhone 16 Pro @ Bangalore Tech Park has only 1 unit — perfect for concurrency testing!
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
