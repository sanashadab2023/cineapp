"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  DollarSign,
  Ticket,
  Film,
  MapPin,
  Timer,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface AdminStats {
  totalRevenueCents: number;
  confirmedBookingsCount: number;
  totalTicketsSold: number;
  activeMoviesCount: number;
  totalCinemasCount: number;
  activeHoldsCount: number;
}

interface AuditLogItem {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasingHolds, setReleasingHolds] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/metrics");
      if (res.status === 403 || res.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseHolds = async () => {
    setReleasingHolds(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/cron/release-holds?secret=cinebook_cron_secret_token_12345", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(
          `Released ${data.releasedSeats} expired seat holds (${data.expiredBookings} expired bookings).`
        );
        await fetchMetrics();
      } else {
        setFeedback(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedback(`Execution error: ${err.message}`);
    } finally {
      setReleasingHolds(false);
    }
  };

  if (unauthorized) {
    return (
      <div className="mx-auto max-w-md py-20 px-4 text-center text-white">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950/60 border border-red-500/30 text-red-400 mb-4">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold">Admin Privileges Required</h2>
        <p className="mt-2 text-sm text-zinc-400">
          This portal requires director-level administrative credentials.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login?redirect=/admin"
            className="rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-cinema-950"
          >
            Sign in as Demo Admin
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-white"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-md bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/30 uppercase tracking-widest">
              <ShieldCheck className="h-3.5 w-3.5" /> Executive Panel
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1.5 tracking-tight">
            CineBook Administration Hub
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Real-time ticketing transactions, inventory holds, and tamper-resistant audit logs.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReleaseHolds}
            disabled={releasingHolds}
            className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-2.5 text-xs font-bold text-gold-300 hover:bg-amber-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${releasingHolds ? "animate-spin" : ""}`} />
            Release Expired Holds
          </button>
        </div>
      </div>

      {feedback && (
        <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <p>{feedback}</p>
        </div>
      )}

      {/* Metrics Row */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Revenue */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Ticket Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            ${stats ? (stats.totalRevenueCents / 100).toFixed(2) : "0.00"}
          </p>
          <span className="text-[10px] text-zinc-500">
            From {stats?.confirmedBookingsCount || 0} confirmed orders
          </span>
        </div>

        {/* Metric 2: Tickets */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tickets Sold</span>
            <Ticket className="h-4 w-4 text-gold-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats?.totalTicketsSold || 0}
          </p>
          <span className="text-[10px] text-zinc-500">Digital QR passes issued</span>
        </div>

        {/* Metric 3: Active Holds */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Seat Holds</span>
            <Timer className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats?.activeHoldsCount || 0}
          </p>
          <span className="text-[10px] text-zinc-500">10-minute locking window</span>
        </div>

        {/* Metric 4: Theaters & Films */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Network</span>
            <Film className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats?.activeMoviesCount || 0} Films
          </p>
          <span className="text-[10px] text-zinc-500">
            Across {stats?.totalCinemasCount || 0} luxury complexes
          </span>
        </div>
      </div>

      {/* Audit Logs Section */}
      <div className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-gold-400" /> System Audit Log Trail
          </h2>
          <span className="text-xs text-zinc-400">Showing latest security events</span>
        </div>

        <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="border-b border-white/10 bg-white/5 uppercase text-[10px] tracking-wider text-zinc-400">
                <tr>
                  <th className="px-6 py-3.5">Timestamp (UTC)</th>
                  <th className="px-6 py-3.5">Action Event</th>
                  <th className="px-6 py-3.5">Entity</th>
                  <th className="px-6 py-3.5">Details</th>
                  <th className="px-6 py-3.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3 font-mono text-[11px] text-zinc-400">
                        {new Date(log.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            log.action.includes("CONFIRMED")
                              ? "bg-emerald-500/20 text-emerald-300"
                              : log.action.includes("HOLD")
                              ? "bg-amber-500/20 text-amber-300"
                              : log.action.includes("CANCEL")
                              ? "bg-red-500/20 text-red-300"
                              : "bg-zinc-500/20 text-zinc-300"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-zinc-300 font-mono text-[11px]">
                        {log.entityType}
                      </td>
                      <td className="px-6 py-3 max-w-xs truncate text-[11px] text-zinc-400 font-mono">
                        {typeof log.details === "object"
                          ? JSON.stringify(log.details)
                          : String(log.details || "-")}
                      </td>
                      <td className="px-6 py-3 font-mono text-[11px] text-zinc-500">
                        {log.ipAddress || "internal"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
