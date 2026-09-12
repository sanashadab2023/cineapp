import Link from "next/link";
import { Film, Shield, Zap, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-cinema-950 pt-12 pb-8 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500 text-cinema-950 font-bold">
                <Film className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Cine<span className="text-gold-400">Book</span>
              </span>
            </div>
            <p className="max-w-md text-sm text-zinc-400 leading-relaxed">
              Engineered for seamless cinema ticket booking. Featuring real-time seat locks,
              serverless Neon PostgreSQL, and instant digital QR passes.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-gold-400" /> Neon Serverless
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-sky-400" /> Next.js App Router
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-emerald-400" /> Vercel Edge
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Experience</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-gold-400 transition-colors">
                  Now Showing
                </Link>
              </li>
              <li>
                <Link href="/cinemas" className="hover:text-gold-400 transition-colors">
                  Cinema Locations
                </Link>
              </li>
              <li>
                <Link href="/showtimes" className="hover:text-gold-400 transition-colors">
                  Showtime Schedules
                </Link>
              </li>
              <li>
                <Link href="/bookings" className="hover:text-gold-400 transition-colors">
                  My Bookings
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / Security */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Security & API</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/admin" className="hover:text-gold-400 transition-colors">
                  Admin Dashboard
                </Link>
              </li>
              <li>
                <span className="text-zinc-500">Atomic Seat Locks (FOR UPDATE)</span>
              </li>
              <li>
                <span className="text-zinc-500">Vercel Cron Hold Release</span>
              </li>
              <li>
                <span className="text-zinc-500">Payment Idempotency Safe</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} CineBook Inc. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Production-ready cinema ticketing engineered for Vercel.</p>
        </div>
      </div>
    </footer>
  );
}
