"use client";

import { ReservationDetails } from "@/types";
import { ReservationTimer } from "@/components/ReservationTimer";
import { formatDate } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ReservationPageClientProps { reservationId: string; }

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending Confirmation",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    dot: "bg-amber-400",
    glow: "shadow-amber-500/20",
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    dot: "bg-emerald-400",
    glow: "shadow-emerald-500/20",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
  RELEASED: {
    label: "Released",
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/30",
    dot: "bg-gray-400",
    glow: "shadow-gray-500/10",
    gradient: "from-gray-500/10 to-gray-600/10",
  },
};

export default function ReservationPageClient({ reservationId }: ReservationPageClientProps) {
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState<string | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      const res  = await fetch(`/api/reservations/${reservationId}`);
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load reservation");
      else setReservation(data.data);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [reservationId]);

  useEffect(() => { fetchReservation(); }, [fetchReservation]);

  async function handleConfirm() {
    setActionLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/reservations/${reservationId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 410
          ? "⏰ Reservation expired (HTTP 410). Stock has been restored automatically."
          : data.error || "Failed to confirm");
      } else {
        setReservation(data.data);
        setSuccessMsg("🎉 Purchase confirmed! Your order is placed.");
      }
    } catch { setError("Network error"); }
    finally { setActionLoading(false); }
  }

  async function handleRelease() {
    setActionLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/reservations/${reservationId}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to cancel"); }
      else { setReservation(data.data); setTimeout(() => router.push("/"), 2000); }
    } catch { setError("Network error"); }
    finally { setActionLoading(false); }
  }

  // ─── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-indigo-400 animate-spin animate-spin-slow" style={{ animationDirection: "reverse" }} />
          </div>
          <p className="text-gray-500 text-sm animate-pulse">Loading reservation...</p>
        </div>
      </div>
    );
  }

  // ─── Not found ────────────────────────────────────────────────
  if (!reservation) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass rounded-3xl border border-white/10 p-12 text-center max-w-md animate-slide-up">
          <div className="text-6xl mb-4 animate-float">🔍</div>
          <h2 className="text-2xl font-bold text-white mb-2">Not Found</h2>
          <p className="text-gray-400 text-sm mb-6">{error || "This reservation does not exist."}</p>
          <button onClick={() => router.push("/")}
            className="btn-shimmer px-6 py-3 rounded-xl text-white font-semibold text-sm">
            ← Back to Products
          </button>
        </div>
      </div>
    );
  }

  const cfg        = STATUS_CONFIG[reservation.status];
  const isPending  = reservation.status === "PENDING";
  const isConfirmed = reservation.status === "CONFIRMED";

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-slide-up">

      {/* Back */}
      <button onClick={() => router.push("/")}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-300 transition-colors group">
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Products
      </button>

      {/* ── Main card ─────────────────────────────────────────── */}
      <div className={`glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl ${cfg.glow}`}>

        {/* Gradient header */}
        <div className={`bg-gradient-to-br ${cfg.gradient} border-b border-white/5 px-6 py-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">Reservation</p>
              <h1 className="text-2xl font-black text-white leading-tight">{reservation.productName}</h1>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {reservation.warehouseName}
              </p>
            </div>
            {/* Status badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 ${cfg.bg} ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${isPending ? "animate-pulse" : ""}`} />
              {cfg.label}
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">

          {/* ── Timer ─────────────────────────────────────────── */}
          {isPending && (
            <ReservationTimer expiresAt={reservation.expiresAt} onExpired={fetchReservation} />
          )}

          {/* ── Info grid ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Quantity", value: `${reservation.quantity} unit${reservation.quantity !== 1 ? "s" : ""}` },
              { label: "Status",   value: cfg.label },
              { label: "Reserved", value: formatDate(reservation.createdAt) },
              { label: "Expires",  value: formatDate(reservation.expiresAt) },
            ].map((row) => (
              <div key={row.label} className="bg-white/3 rounded-2xl px-4 py-3 border border-white/5">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-1">{row.label}</p>
                <p className="text-sm font-semibold text-gray-200">{row.value}</p>
              </div>
            ))}
          </div>

          {/* ── Reservation ID ────────────────────────────────── */}
          <div className="bg-black/30 rounded-2xl px-4 py-3 border border-white/5">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-1">Reservation ID</p>
            <p className="font-mono text-xs text-violet-400 break-all">{reservation.id}</p>
          </div>

          {/* ── Messages ──────────────────────────────────────── */}
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-4 text-emerald-400 text-sm animate-slide-up flex gap-3 items-start">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-bold">Purchase Confirmed!</p>
                <p className="text-xs text-emerald-400/70 mt-0.5">Your order is placed and stock has been permanently decremented.</p>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-4 text-red-400 text-sm animate-shake flex gap-3 items-start">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-bold">Something went wrong</p>
                <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* ── Confirmed state ───────────────────────────────── */}
          {isConfirmed && !successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center animate-slide-up">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-emerald-400 font-bold text-lg">Order Confirmed!</p>
              <p className="text-gray-500 text-xs mt-1">Stock has been permanently decremented.</p>
            </div>
          )}

          {/* ── Released state ────────────────────────────────── */}
          {reservation.status === "RELEASED" && !successMsg && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 text-center animate-slide-up">
              <div className="text-5xl mb-3">🔓</div>
              <p className="text-gray-300 font-bold">Reservation Released</p>
              <p className="text-gray-600 text-xs mt-1">Stock restored. Redirecting to products...</p>
            </div>
          )}
        </div>

        {/* ── Action buttons ──────────────────────────────────── */}
        {isPending && (
          <div className="px-6 pb-6 grid grid-cols-2 gap-3">
            <button
              onClick={handleConfirm}
              disabled={actionLoading}
              className="py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-wait transition-all hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Confirm Purchase
                </>
              )}
            </button>
            <button
              onClick={handleRelease}
              disabled={actionLoading}
              className="py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm hover:bg-white/10 hover:text-gray-200 hover:border-white/20 disabled:opacity-50 disabled:cursor-wait transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function _InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-200">{value}</p>
    </div>
  );
}
