"use client";

import { useEffect, useState, useId } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CreditCard,
  Lock,
  Timer,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  Check,
  Ticket,
} from "lucide-react";

interface BookingDetail {
  id: string;
  bookingReference: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  subtotalCents: number;
  feeCents: number;
  taxCents: number;
  totalCents: number;
  expiresAt?: string;
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
        address: string;
        city: string;
      };
    };
  };
  items: {
    id: string;
    priceCents: number;
    seat: {
      rowLetter: string;
      seatNumber: number;
      seatTier: string;
    };
  }[];
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(600);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE_TEST" | "INSTANT_TEST">("INSTANT_TEST");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("888");

  useEffect(() => {
    // Generate idempotency key for this payment session
    setIdempotencyKey(`pay_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`);
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (!res.ok) {
        throw new Error("Failed to load booking details.");
      }
      const data = await res.json();
      setBooking(data.booking);

      // If already confirmed, redirect to ticket
      if (data.booking.status === "CONFIRMED" && data.booking.tickets?.[0]?.ticketCode) {
        router.push(`/tickets/${data.booking.tickets[0].ticketCode}`);
        return;
      }

      // Calculate countdown timer
      if (data.booking.expiresAt) {
        const remaining = Math.max(
          0,
          Math.floor((new Date(data.booking.expiresAt).getTime() - Date.now()) / 1000)
        );
        setTimeLeftSeconds(remaining);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load booking.");
    } finally {
      setLoading(false);
    }
  };

  // Live countdown timer
  useEffect(() => {
    if (timeLeftSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handlePay = async () => {
    if (timeLeftSeconds <= 0) {
      setErrorMessage("Your seat hold has expired. Please reselect your seats.");
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          provider: paymentMethod === "STRIPE_TEST" ? "STRIPE" : "TEST",
          paymentIntentId: `pi_test_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Payment failed. Please try again.");
      }

      // Successfully confirmed! Redirect to ticket pass
      const ticketCode = data.tickets?.[0]?.ticketCode || data.booking?.tickets?.[0]?.ticketCode;
      if (ticketCode) {
        router.push(`/tickets/${ticketCode}`);
      } else {
        router.push("/bookings");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Payment transaction could not be completed.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="py-20 text-center text-white">
        <p>Booking not found or expired.</p>
        <Link href="/" className="text-gold-400 underline mt-2 inline-block">
          Return to Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 pb-28">
      {/* Countdown Warning Bar */}
      <div
        className={`flex items-center justify-between rounded-2xl p-4 border transition-all ${
          timeLeftSeconds < 120
            ? "border-red-500/50 bg-red-950/40 text-red-200"
            : "border-gold-500/40 bg-gold-950/30 text-gold-300"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Timer className="h-5 w-5 text-gold-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-semibold">
            Temporary Seat Hold Active • Order Reference: {booking.bookingReference}
          </span>
        </div>
        <div className="text-sm sm:text-base font-extrabold tracking-wider font-mono">
          {timeLeftSeconds > 0 ? formatTimer(timeLeftSeconds) : "EXPIRED"}
        </div>
      </div>

      {errorMessage && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Main Checkout Columns */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left: Payment Method & Details (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gold-400" /> Payment Provider (Test Mode)
            </h2>

            {/* Provider Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("INSTANT_TEST")}
                className={`flex flex-col items-center justify-center rounded-xl p-4 text-center border transition-all ${
                  paymentMethod === "INSTANT_TEST"
                    ? "border-gold-500 bg-gold-500/10 text-gold-400 font-bold shadow-glow"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                }`}
              >
                <ShieldCheck className="h-6 w-6 text-gold-400 mb-1" />
                <span className="text-xs font-bold">1-Click Instant Test</span>
                <span className="text-[10px] text-zinc-400">Zero latency confirmation</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("STRIPE_TEST")}
                className={`flex flex-col items-center justify-center rounded-xl p-4 text-center border transition-all ${
                  paymentMethod === "STRIPE_TEST"
                    ? "border-gold-500 bg-gold-500/10 text-gold-400 font-bold shadow-glow"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                }`}
              >
                <CreditCard className="h-6 w-6 text-sky-400 mb-1" />
                <span className="text-xs font-bold">Stripe Test Simulator</span>
                <span className="text-[10px] text-zinc-400">Card 4242 Mock Mode</span>
              </button>
            </div>

            {/* Payment Fields */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-zinc-400">Cardholder Name</label>
                <input
                  type="text"
                  defaultValue="Alex Mercer"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-cinema-900/90 px-3.5 py-2.5 text-sm text-white focus:border-gold-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400">Card Number</label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-cinema-900/90 pl-3.5 pr-10 py-2.5 text-sm font-mono text-white focus:border-gold-500 focus:outline-none"
                  />
                  <CreditCard className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400">Expires</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-cinema-900/90 px-3.5 py-2.5 text-sm font-mono text-white focus:border-gold-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400">CVC</label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-cinema-900/90 px-3.5 py-2.5 text-sm font-mono text-white focus:border-gold-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Security Guarantee Note */}
            <div className="flex items-center gap-2 text-xs text-zinc-500 border-t border-white/5 pt-4">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span>256-bit encrypted test transaction. Secrets never exposed to client.</span>
            </div>

            {/* Pay Action Button */}
            <button
              onClick={handlePay}
              disabled={processing || timeLeftSeconds <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 py-3.5 text-sm font-extrabold text-cinema-950 shadow-glow transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-cinema-950 border-t-transparent" />
              ) : (
                <>Pay ${(booking.totalCents / 100).toFixed(2)} USD</>
              )}
            </button>
          </div>
        </div>

        {/* Right: Booking Details & Receipt (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-3">
              Order Summary
            </h3>

            {/* Movie Info */}
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-white/10">
                <img
                  src={booking.showtime.movie.posterUrl}
                  alt={booking.showtime.movie.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h4 className="font-bold text-white">{booking.showtime.movie.title}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {booking.showtime.auditorium.name} • {booking.showtime.format}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {new Date(booking.showtime.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* Itemized Seats */}
            <div className="space-y-2 border-t border-white/5 pt-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Reserved Seats
              </span>
              <div className="space-y-2">
                {booking.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-zinc-300">
                    <span>
                      Seat {item.seat.rowLetter}{item.seat.seatNumber} ({item.seat.seatTier})
                    </span>
                    <span className="font-medium font-mono">
                      ${(item.priceCents / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Server Breakdown */}
            <div className="space-y-2 border-t border-white/5 pt-4 text-xs text-zinc-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono">${(booking.subtotalCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee ($1.50/seat)</span>
                <span className="font-mono">${(booking.feeCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax (8%)</span>
                <span className="font-mono">${(booking.taxCents / 100).toFixed(2)}</span>
              </div>

              <div className="flex justify-between border-t border-white/10 pt-3 text-base font-extrabold text-white">
                <span>Final Total</span>
                <span className="text-gold-400 font-mono">
                  ${(booking.totalCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
