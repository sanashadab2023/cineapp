"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, Calendar, Clock, MapPin, AlertCircle, XCircle, CheckCircle2, ChevronRight } from "lucide-react";

interface Booking {
  id: string;
  bookingReference: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  totalCents: number;
  createdAt: string;
  showtime: {
    startTime: string;
    format: string;
    movie: {
      title: string;
      posterUrl: string;
      rating: string;
    };
    auditorium: {
      name: string;
      cinema: {
        name: string;
        city: string;
      };
    };
  };
  items: {
    id: string;
    seat: {
      rowLetter: string;
      seatNumber: number;
      seatTier: string;
    };
  }[];
  tickets: {
    ticketCode: string;
  }[];
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error("Failed to load bookings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking? Your seats will be released and a refund recorded.")) {
      return;
    }

    setCancellingId(bookingId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel booking.");
      }

      setFeedback({
        type: "success",
        message: "Booking successfully cancelled. Seats have been returned to available inventory.",
      });
      await fetchBookings();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to cancel booking." });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 pb-28">
      <div className="space-y-2 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Ticket className="h-7 w-7 text-gold-400" /> My Cinema Bookings
        </h1>
        <p className="text-sm text-zinc-400">
          Review your upcoming screening reservations, access digital passes, and manage cancellations.
        </p>
      </div>

      {feedback && (
        <div
          className={`mt-6 flex items-center gap-3 rounded-xl p-4 text-sm ${
            feedback.type === "success"
              ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
              : "border border-red-500/30 bg-red-950/40 text-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          )}
          <p>{feedback.message}</p>
        </div>
      )}

      {loading ? (
        <div className="mt-8 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-cinema-900/50 animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-white/10 bg-cinema-900/40 p-12 text-center text-zinc-400">
          <Ticket className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <h2 className="text-lg font-bold text-white">No bookings yet</h2>
          <p className="text-sm text-zinc-400 mt-1">Explore current blockbusters and reserve your seats.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 px-5 py-2.5 text-xs font-bold text-cinema-950 shadow-glow"
          >
            Explore Movies
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {bookings.map((b) => {
            const isFuture = new Date(b.showtime.startTime) > new Date();
            const isConfirmed = b.status === "CONFIRMED";
            const canCancel = isFuture && isConfirmed;
            const ticketCode = b.tickets?.[0]?.ticketCode;

            return (
              <div
                key={b.id}
                className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl transition-all hover:border-gold-500/30"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left Movie Info */}
                  <div className="flex items-center gap-4">
                    <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-white/10">
                      <img
                        src={b.showtime.movie.posterUrl}
                        alt={b.showtime.movie.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : b.status === "CANCELLED"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : "bg-zinc-500/20 text-zinc-400"
                          }`}
                        >
                          {b.status}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {b.bookingReference}
                        </span>
                      </div>

                      <h2 className="text-xl font-bold text-white">{b.showtime.movie.title}</h2>

                      <p className="text-xs text-zinc-400">
                        {b.showtime.auditorium.cinema.name} • {b.showtime.auditorium.name} ({b.showtime.format})
                      </p>

                      <p className="text-xs text-gold-400 font-semibold">
                        {new Date(b.showtime.startTime).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(b.showtime.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      <p className="text-[11px] text-zinc-400">
                        Seats:{" "}
                        <span className="font-semibold text-white">
                          {b.items.map((it) => `${it.seat.rowLetter}${it.seat.seatNumber}`).join(", ")}
                        </span>{" "}
                        • Total: ${(b.totalCents / 100).toFixed(2)} USD
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-end">
                    {ticketCode && isConfirmed && (
                      <Link
                        href={`/tickets/${ticketCode}`}
                        className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-cinema-950 shadow-glow hover:brightness-110"
                      >
                        View Digital Ticket <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}

                    {canCancel && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        disabled={cancellingId === b.id}
                        className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {cancellingId === b.id ? "Cancelling..." : "Cancel & Refund"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
