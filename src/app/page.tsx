import { ProductCard } from "@/components/ProductCard";
import { ProductWithInventory } from "@/types";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering — this page queries the DB and must not be
// statically pre-rendered at build time (would hang on DB connection)
export const dynamic = "force-dynamic";

// Query the database directly — avoids HTTP self-fetch that hangs during `next build`
async function getProducts(): Promise<ProductWithInventory[]> {
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

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description ?? null,
      imageUrl: product.imageUrl ?? null,
      createdAt: product.createdAt.toISOString(),
      inventories: product.inventories.map((inv) => ({
        id: inv.id,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        warehouseLocation: inv.warehouse.location ?? null,
        totalStock: inv.totalStock,
        reservedStock: inv.reservedStock,
        availableStock: inv.totalStock - inv.reservedStock,
      })),
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const products = await getProducts();
  const totalAvailable = products.reduce(
    (sum, p) => sum + p.inventories.reduce((s, i) => s + i.availableStock, 0), 0
  );
  const totalSKUs = products.reduce((sum, p) => sum + p.inventories.length, 0);

  return (
    <div className="space-y-16">

      {/* ── Hero ───────────────────────────────────────────────── */}
      <div className="text-center space-y-6 pt-6 animate-slide-up">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-violet-500/20 text-sm text-violet-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
          </span>
          Concurrency-Safe · Zero Oversell Guaranteed
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-none">
          <span className="gradient-text">Reserve.</span>
          <br />
          <span className="text-white/90">Before It&apos;s Gone.</span>
        </h1>

        <p className="text-gray-400 max-w-lg mx-auto text-lg leading-relaxed">
          Powered by atomic PostgreSQL transactions.
          When 5 users race for the last item —{" "}
          <span className="text-violet-300 font-semibold">exactly one wins</span>.
        </p>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-4">
          {[
            { value: products.length, label: "Products", color: "text-violet-400" },
            { value: totalSKUs, label: "Warehouse SKUs", color: "text-sky-400" },
            { value: totalAvailable, label: "Units Available", color: "text-emerald-400" },
            { value: "10 min", label: "Hold Period", color: "text-amber-400" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`glass rounded-2xl px-6 py-4 text-center border border-white/5 animate-slide-up delay-${(i + 1) * 100}`}
            >
              <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Products Grid ──────────────────────────────────────── */}
      {products.length === 0 ? (
        <div className="text-center py-24 animate-fade-in">
          <div className="text-6xl mb-6 animate-float">📦</div>
          <h2 className="text-xl font-bold text-white mb-2">No Products Found</h2>
          <p className="text-gray-500 text-sm">
            Run{" "}
            <code className="bg-gray-800/80 border border-gray-700 px-2 py-0.5 rounded-md font-mono text-violet-400 text-xs">
              npm run db:seed
            </code>{" "}
            to populate the database
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-300">
              Available Products
              <span className="ml-2 text-xs font-mono bg-violet-500/20 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
                {products.length} items
              </span>
            </h2>
            <p className="text-xs text-gray-600 hidden sm:block">
              Click a product to reserve · holds for 10 minutes
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product, i) => (
              <div
                key={product.id}
                className={`animate-slide-up delay-${Math.min((i + 1) * 100, 500)}`}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── How It Works ──────────────────────────────────────── */}
      <div className="animate-slide-up delay-300">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">How It Works</h2>
          <p className="text-gray-500 text-sm mt-1">The engineering behind zero-oversell</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "⚡",
              title: "Atomic SQL Update",
              desc: "A single UPDATE ... WHERE available >= qty prevents any race condition. 0 rows affected = 409 Conflict.",
              color: "from-violet-500/20 to-indigo-500/20",
              border: "border-violet-500/20",
              glow: "hover:shadow-violet-500/20",
            },
            {
              icon: "⏱️",
              title: "10-Minute Hold",
              desc: "reservedStock is incremented immediately. The unit is held for you while others see it as unavailable.",
              color: "from-sky-500/20 to-cyan-500/20",
              border: "border-sky-500/20",
              glow: "hover:shadow-sky-500/20",
            },
            {
              icon: "✅",
              title: "Atomic Confirmation",
              desc: "On confirm, totalStock is permanently decremented. On release/expiry, reservedStock is restored.",
              color: "from-emerald-500/20 to-teal-500/20",
              border: "border-emerald-500/20",
              glow: "hover:shadow-emerald-500/20",
            },
          ].map((item) => (
            <div
              key={item.title}
              className={`glass rounded-2xl p-6 border ${item.border} bg-gradient-to-br ${item.color} hover:shadow-lg ${item.glow} transition-all duration-300 group`}
            >
              <div className="text-4xl mb-4 group-hover:animate-float inline-block">{item.icon}</div>
              <h3 className="font-bold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}
