import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockReserve — Concurrency-Safe Inventory System",
  description: "Reserve products in real-time. Race-condition-free inventory powered by atomic PostgreSQL transactions.",
  keywords: ["inventory", "reservation", "stock management", "e-commerce"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen animated-bg grid-pattern text-gray-100 overflow-x-hidden">

        {/* Ambient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl animate-float delay-300" />
          <div className="absolute -bottom-40 left-1/3 w-72 h-72 bg-sky-600/10 rounded-full blur-3xl animate-float delay-500" />
        </div>

        {/* Navigation */}
        <header className="relative z-50 border-b border-white/5 glass sticky top-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/40 group-hover:shadow-violet-500/60 transition-all duration-300 group-hover:scale-110">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                {/* Ping ring */}
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
                </span>
              </div>
              <div>
                <span className="font-bold text-lg text-white tracking-tight">StockReserve</span>
                <span className="hidden sm:block text-[10px] text-violet-400/70 font-mono -mt-1">CONCURRENCY-SAFE</span>
              </div>
            </a>

            {/* Nav right */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live System
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-mono">
                SELECT FOR UPDATE
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/5 mt-20 py-6 text-center text-xs text-gray-600">
          <span className="gradient-text font-semibold">StockReserve</span>
          {" "}· Atomic PostgreSQL · Zero Oversell · Next.js 15
        </footer>
      </body>
    </html>
  );
}
