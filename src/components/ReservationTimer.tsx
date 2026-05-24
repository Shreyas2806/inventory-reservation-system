"use client";

import { useEffect, useState } from "react";
import { secondsUntil, formatCountdown } from "@/lib/utils";

interface ReservationTimerProps {
  expiresAt: string;
  onExpired?: () => void;
}

export function ReservationTimer({ expiresAt, onExpired }: ReservationTimerProps) {
  const [seconds, setSeconds] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    if (seconds <= 0) { onExpired?.(); return; }
    const interval = setInterval(() => {
      const remaining = secondsUntil(expiresAt);
      setSeconds(remaining);
      if (remaining <= 0) { clearInterval(interval); onExpired?.(); }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired, seconds]);

  const totalSeconds  = 10 * 60; // 10 minutes
  const progress      = Math.max(0, seconds / totalSeconds); // 1 → 0
  const isUrgent      = seconds > 0 && seconds <= 60;
  const isExpired     = seconds <= 0;

  // SVG circle progress
  const radius        = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDash    = circumference * progress;

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-fade-in">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-xl">⏰</div>
        <div>
          <p className="text-red-400 font-bold text-sm">Reservation Expired</p>
          <p className="text-red-400/60 text-xs">Stock has been automatically restored</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-500 ${
      isUrgent
        ? "bg-red-500/10 border-red-500/20 animate-pulse"
        : "bg-amber-500/8 border-amber-500/15"
    }`}>

      {/* Circular progress */}
      <div className="relative w-14 h-14 shrink-0">
        {/* Background ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={radius} fill="none"
            stroke={isUrgent ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"}
            strokeWidth="4" />
          <circle cx="24" cy="24" r={radius} fill="none"
            stroke={isUrgent ? "#ef4444" : "#f59e0b"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            style={{ transition: "stroke-dasharray 1s linear" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className={`w-5 h-5 ${isUrgent ? "text-red-400" : "text-amber-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
        </div>
        {/* Urgent pulse ring */}
        {isUrgent && (
          <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-pulse-ring opacity-60" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1">
        <p className={`text-[10px] uppercase tracking-widest font-semibold mb-0.5 ${isUrgent ? "text-red-400/70" : "text-amber-400/70"}`}>
          {isUrgent ? "⚡ Expiring soon!" : "Hold expires in"}
        </p>
        <p className={`font-black text-3xl font-mono leading-none ${isUrgent ? "text-red-400" : "text-amber-400"}`}>
          {formatCountdown(seconds)}
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5">
          Confirm purchase before time runs out
        </p>
      </div>
    </div>
  );
}
