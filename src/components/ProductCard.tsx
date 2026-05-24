"use client";

import { ProductWithInventory } from "@/types";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductCardProps {
  product: ProductWithInventory;
}

const PRODUCT_META: Record<string, { icon: string; gradient: string; accent: string }> = {
  "iPhone 16 Pro": {
    icon: "📱",
    gradient: "from-slate-800 to-slate-700",
    accent: "from-blue-500 to-cyan-400",
  },
  'MacBook Pro 14"': {
    icon: "💻",
    gradient: "from-zinc-800 to-zinc-700",
    accent: "from-violet-500 to-purple-400",
  },
  "Sony WH-1000XM5": {
    icon: "🎧",
    gradient: "from-neutral-800 to-neutral-700",
    accent: "from-rose-500 to-pink-400",
  },
  "Apple Watch Ultra 2": {
    icon: "⌚",
    gradient: "from-stone-800 to-stone-700",
    accent: "from-amber-500 to-orange-400",
  },
  'iPad Pro 13"': {
    icon: "📲",
    gradient: "from-gray-800 to-gray-700",
    accent: "from-emerald-500 to-teal-400",
  },
};

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const [selectedWarehouse, setSelectedWarehouse] = useState(
    product.inventories[0]?.warehouseId ?? ""
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inventory = product.inventories.find((i) => i.warehouseId === selectedWarehouse);
  const available = inventory?.availableStock ?? 0;
  const isOutOfStock = available === 0;
  const isLowStock = available > 0 && available <= 3;

  const meta = PRODUCT_META[product.name] ?? {
    icon: "📦",
    gradient: "from-gray-800 to-gray-700",
    accent: "from-violet-500 to-indigo-400",
  };

  async function handleReserve() {
    if (!selectedWarehouse || quantity < 1) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, warehouseId: selectedWarehouse, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 409 ? `⚡ Conflict: ${data.error}` : data.error || "Failed");
        return;
      }
      router.push(`/reservations/${data.data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group relative glass glass-hover rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">

      {/* Accent top bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${meta.accent}`} />

      {/* Card body */}
      <div className="p-5 flex flex-col gap-4">

        {/* Product header */}
        <div className="flex items-start gap-4">
          {/* Icon box with gradient bg */}
          <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.gradient} border border-white/10 flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
            {meta.icon}
            {/* Glow behind icon */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${meta.accent} opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-md`} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-base text-white leading-tight truncate">{product.name}</h2>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
          </div>
        </div>

        {/* Warehouse selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
            📍 Warehouse
          </label>
          <select
            value={selectedWarehouse}
            onChange={(e) => { setSelectedWarehouse(e.target.value); setError(null); }}
            className="w-full bg-black/30 border border-white/10 text-gray-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all cursor-pointer hover:border-white/20"
          >
            {product.inventories.map((inv) => (
              <option key={inv.warehouseId} value={inv.warehouseId} className="bg-gray-900">
                {inv.warehouseName} — {inv.availableStock} available
              </option>
            ))}
          </select>
        </div>

        {/* Stock status */}
        {inventory && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-8 rounded-full bg-gradient-to-b ${
                isOutOfStock ? "from-red-500 to-red-700"
                : isLowStock ? "from-amber-400 to-orange-500"
                : "from-emerald-400 to-teal-500"
              }`} />
              <div>
                <div className="text-xs text-gray-500">Available</div>
                <div className={`font-bold text-lg leading-none ${
                  isOutOfStock ? "text-red-400"
                  : isLowStock ? "text-amber-400"
                  : "text-emerald-400"
                }`}>
                  {available}
                  <span className="text-xs font-normal text-gray-500 ml-1">units</span>
                </div>
              </div>
            </div>

            {/* Stock badge */}
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
              isOutOfStock
                ? "bg-red-500/15 text-red-400 border-red-500/20"
                : isLowStock
                ? "bg-amber-500/15 text-amber-400 border-amber-500/20 animate-pulse"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
            }`}>
              {isOutOfStock ? "Sold Out" : isLowStock ? `⚡ Only ${available} left!` : "In Stock"}
            </span>
          </div>
        )}

        {/* Quantity */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-lg font-bold active:scale-95"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="font-mono font-black text-2xl text-white">{quantity}</span>
            </div>
            <button
              onClick={() => setQuantity((q) => Math.min(available, q + 1))}
              disabled={quantity >= available}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-lg font-bold active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-xs text-red-400 animate-fade-in flex gap-2 items-start">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Reserve button */}
        <button
          onClick={handleReserve}
          disabled={isOutOfStock || loading || quantity > available}
          className={`relative w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 overflow-hidden ${
            isOutOfStock || quantity > available
              ? "bg-white/5 border border-white/10 text-gray-600 cursor-not-allowed"
              : loading
              ? "bg-violet-600/40 text-violet-300 cursor-wait"
              : "btn-shimmer text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.98] hover:scale-[1.02]"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Reserving...
            </span>
          ) : isOutOfStock ? (
            "Sold Out"
          ) : (
            <span className="flex items-center justify-center gap-2">
              Reserve Now
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          )}
        </button>

        {/* Footer note */}
        {!isOutOfStock && (
          <p className="text-[10px] text-gray-700 text-center">
            🕐 Holds for <span className="text-gray-500 font-semibold">10 minutes</span> · No payment required now
          </p>
        )}
      </div>
    </div>
  );
}
