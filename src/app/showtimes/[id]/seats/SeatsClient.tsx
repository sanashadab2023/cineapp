"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  MapPin,
  Ticket,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Timer,
  Armchair,
  ShieldAlert,
} from "lucide-react";

interface SeatData {
  showtimeSeatId: string;
  seatId: string;
  rowLetter: string;
  seatNumber: number;
  tier: "STANDARD" | "VIP" | "ACCESSIBLE";
  status: "AVAILABLE" | "HELD" | "HELD_BY_ME" | "BOOKED" | "BLOCKED";
  priceCents: number;
  holdExpiresAt?: string;
}

interface ShowtimeMeta {
  id: string;
  startTime: string;
  endTime: string;
  format: string;
  basePriceCents: number;
  movie: {
    id: string;
    title: string;
    posterUrl: string;
    rating: string;
    durationMins: number;
  };
  auditorium: {
    name: string;
    cinema: {
      id: string;
      name: string;
      city: string;
    };
  };
}

export default function SeatSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const showtimeId = params.id as string;

  const [showtime, setShowtime] = useState<ShowtimeMeta | null>(null);
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [holdTimerSeconds, setHoldTimerSeconds] = useState<number | null>(null);

  useEffect(() => {
    fetchSeats();
    // Poll seat status every 12 seconds to reflect real-time holds from other users
    const interval = setInterval(fetchSeats, 12000);
    return () => clearInterval(interval);
  }, [showtimeId]);

  const fetchSeats = async () => {
    try {
      const res = await fetch(`/api/showtimes/${showtimeId}/seats`);
      if (res.ok) {
        const data = await res.json();
        setShowtime(data.showtime);
        setSeats(data.seats);
      }
    } catch (err) {
      console.error("Failed to load seats", err);
    } finally {
      setLoading(false);
    }
  };

  // Group seats by row letter
  const seatRows = useMemo(() => {
    const rows: Record<string, SeatData[]> = {};
    seats.forEach((seat) => {
      if (!rows[seat.rowLetter]) {
        rows[seat.rowLetter] = [];
      }
      rows[seat.rowLetter].push(seat);
    });
    // Sort seats in each row by seat number
    Object.keys(rows).forEach((r) => {
      rows[r].sort((a, b) => a.seatNumber - b.seatNumber);
    });
    return rows;
  }, [seats]);

  const toggleSeatSelection = (seat: SeatData) => {
    if (seat.status !== "AVAILABLE" && seat.status !== "HELD_BY_ME") return;

    if (selectedSeatIds.includes(seat.seatId)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.seatId));
    } else {
      if (selectedSeatIds.length >= 8) {
        setErrorMessage("You can select up to 8 seats per booking.");
        return;
      }
      setErrorMessage(null);
      setSelectedSeatIds((prev) => [...prev, seat.seatId]);
    }
  };

  // Server-price calculation matching booking-engine
  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.seatId));
  const subtotalCents = selectedSeats.reduce((acc, s) => acc + s.priceCents, 0);
  const feeCents = selectedSeats.length * 150; // $1.50 per seat
  const taxCents = Math.round((subtotalCents + feeCents) * 0.08); // 8%
  const totalCents = subtotalCents + feeCents + taxCents;

  const handleHoldAndProceed = async () => {
    if (selectedSeatIds.length === 0) {
      setErrorMessage("Please select at least one seat to proceed.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/bookings/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showtimeId,
          seatIds: selectedSeatIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "AUTH_REQUIRED") {
          // Redirect to login with return path
          router.push(`/login?redirect=/showtimes/${showtimeId}/seats`);
          return;
        }

        if (res.status === 409) {
          setErrorMessage(
            "⚠️ One or more selected seats were just taken by another user. Seat map updated."
          );
          await fetchSeats();
          setSelectedSeatIds([]);
          return;
        }

        throw new Error(data.error || "Failed to hold seats.");
      }

      // Successfully held! Redirect to Checkout
      router.push(`/checkout/${data.booking.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (!showtime) {
    return (
      <div className="py-20 text-center text-white">
        <p>Showtime not found.</p>
        <Link href="/" className="text-gold-400 underline mt-2 inline-block">
          Return to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-32">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <Link
            href={`/movies/${showtime.movie.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white mb-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Movie Details
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {showtime.movie.title}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 flex flex-wrap items-center gap-2">
            <span className="text-gold-400 font-semibold">{showtime.auditorium.name}</span>
            <span>•</span>
            <span>{showtime.auditorium.cinema.name}</span>
            <span>•</span>
            <span>
              {new Date(showtime.startTime).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              at{" "}
              {new Date(showtime.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-gold-500/20 px-3 py-1.5 text-xs font-bold text-gold-400 border border-gold-500/30">
            {showtime.format} Experience
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Main Seat Map & Summary Grid */}
      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Left: Cinema Seating Plan (8 cols) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 lg:col-span-8 border border-white/10 flex flex-col items-center">
          {/* Curved Cinema Screen */}
          <div className="w-full max-w-xl pb-12 pt-2 text-center">
            <div className="cinema-screen-curve h-10 w-full flex items-center justify-center">
              <span className="text-[11px] font-bold tracking-[0.3em] text-gold-400/80 uppercase">
                Cinema Screen
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">Laser Projection Surface</p>
          </div>

          {/* Seat Grid */}
          <div className="w-full max-w-2xl space-y-3 overflow-x-auto py-4">
            {Object.entries(seatRows).map(([rowLetter, rowSeats]) => (
              <div key={rowLetter} className="flex items-center justify-center gap-2 sm:gap-3">
                {/* Row Letter */}
                <span className="w-5 text-center text-xs font-bold text-zinc-500">
                  {rowLetter}
                </span>

                {/* Seats in Row */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {rowSeats.map((seat) => {
                    const isSelected = selectedSeatIds.includes(seat.seatId);
                    const isBooked = seat.status === "BOOKED" || seat.status === "BLOCKED";
                    const isHeldOther = seat.status === "HELD";
                    const isVip = seat.tier === "VIP";
                    const isAccessible = seat.tier === "ACCESSIBLE";

                    // Determine Seat Styling
                    let seatClass =
                      "border-white/20 bg-cinema-800/80 text-zinc-300 hover:border-gold-400 hover:scale-110";

                    if (isBooked) {
                      seatClass =
                        "border-zinc-800 bg-zinc-900/60 text-zinc-600 cursor-not-allowed opacity-50";
                    } else if (isHeldOther) {
                      seatClass =
                        "border-amber-600/50 bg-amber-950/40 text-amber-500 cursor-not-allowed";
                    } else if (isSelected) {
                      seatClass =
                        "border-gold-400 bg-gradient-to-t from-gold-600 to-amber-400 text-cinema-950 font-bold shadow-glow scale-110";
                    } else if (isVip) {
                      seatClass =
                        "border-gold-500/40 bg-gold-950/30 text-gold-300 hover:border-gold-400 hover:scale-110";
                    } else if (isAccessible) {
                      seatClass =
                        "border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:border-emerald-400 hover:scale-110";
                    }

                    return (
                      <button
                        key={seat.seatId}
                        disabled={isBooked || isHeldOther}
                        onClick={() => toggleSeatSelection(seat)}
                        title={`${rowLetter}${seat.seatNumber} - ${seat.tier} ($${(seat.priceCents / 100).toFixed(2)})`}
                        className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border text-[11px] font-semibold transition-all duration-200 ${seatClass}`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  })}
                </div>

                {/* Row Letter right */}
                <span className="w-5 text-center text-xs font-bold text-zinc-500">
                  {rowLetter}
                </span>
              </div>
            ))}
          </div>

          {/* Seat Legend */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 border-t border-white/10 pt-6 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-white/20 bg-cinema-800" />
              <span>Standard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-gold-500/50 bg-gold-950/40" />
              <span>VIP Recliner (+40%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-emerald-500/50 bg-emerald-950/40" />
              <span>Accessible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-gold-400 bg-gold-500 shadow-glow" />
              <span className="text-white font-semibold">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-amber-600/50 bg-amber-950/40" />
              <span>Held</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-zinc-800 bg-zinc-900/60 opacity-50" />
              <span>Booked</span>
            </div>
          </div>
        </div>

        {/* Right: Booking Summary Panel (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
              <Ticket className="h-5 w-5 text-gold-400" /> Booking Breakdown
            </h2>

            {/* Movie preview snippet */}
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
                <img
                  src={showtime.movie.posterUrl}
                  alt={showtime.movie.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{showtime.movie.title}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {showtime.auditorium.name} • {showtime.format}
                </p>
              </div>
            </div>

            {/* Selected Seats Pills */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Selected Seats ({selectedSeats.length})
              </span>
              {selectedSeats.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No seats selected yet. Click on the map to pick your seats.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedSeats.map((s) => (
                    <span
                      key={s.seatId}
                      className="flex items-center gap-1.5 rounded-lg border border-gold-500/30 bg-gold-500/10 px-2.5 py-1 text-xs font-bold text-gold-400"
                    >
                      {s.rowLetter}{s.seatNumber}
                      <span className="text-[10px] opacity-70">({s.tier})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Itemized Price Breakdown */}
            {selectedSeats.length > 0 && (
              <div className="space-y-2 border-t border-white/5 pt-4 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span>Seats Subtotal</span>
                  <span className="font-semibold">${(subtotalCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Convenience Fee ($1.50/ticket)</span>
                  <span className="font-semibold">${(feeCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax (8%)</span>
                  <span className="font-semibold">${(taxCents / 100).toFixed(2)}</span>
                </div>

                <div className="flex justify-between border-t border-white/10 pt-3 text-base font-extrabold text-white">
                  <span>Total Amount</span>
                  <span className="text-gold-400">${(totalCents / 100).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Security Assurance */}
            <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-[11px] text-zinc-400 flex items-start gap-2">
              <Armchair className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
              <span>
                Seats are held with row-level transaction locks for 10 minutes upon proceeding.
              </span>
            </div>

            {/* Proceed CTA */}
            <button
              onClick={handleHoldAndProceed}
              disabled={selectedSeatIds.length === 0 || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 py-3.5 text-sm font-bold text-cinema-950 shadow-glow transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-cinema-950 border-t-transparent" />
              ) : (
                <>Reserve Seats & Checkout</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
