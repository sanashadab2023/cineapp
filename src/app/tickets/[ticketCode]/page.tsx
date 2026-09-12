"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Ticket,
  Printer,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronLeft,
  Download,
  Film,
  Sparkles,
} from "lucide-react";

interface TicketData {
  id: string;
  ticketCode: string;
  qrCodeUrl: string;
  isUsed: boolean;
  booking: {
    id: string;
    bookingReference: string;
    status: string;
    totalCents: number;
    items: {
      id: string;
      seat: {
        rowLetter: string;
        seatNumber: number;
        seatTier: string;
      };
    }[];
  };
  showtime: {
    startTime: string;
    format: string;
    movie: {
      title: string;
      posterUrl: string;
      rating: string;
      durationMins: number;
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
}

export default function TicketPage() {
  const params = useParams();
  const ticketCode = params.ticketCode as string;

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTicket();
  }, [ticketCode]);

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketCode}`);
      if (!res.ok) {
        throw new Error("Ticket not found or unauthorized.");
      }
      const data = await res.json();
      setTicket(data.ticket);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadCalendarEvent = () => {
    if (!ticket) return;
    const start = new Date(ticket.showtime.startTime);
    const end = new Date(start.getTime() + ticket.showtime.movie.durationMins * 60000);

    const formatDate = (date: Date) =>
      date.toISOString().replace(/-|:|\.\d+/g, "");

    const icsData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CineBook//Movie Ticket//EN",
      "BEGIN:VEVENT",
      `UID:${ticket.ticketCode}@cinebook.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${ticket.showtime.movie.title} (${ticket.showtime.format})`,
      `DESCRIPTION:Booking Ref: ${ticket.booking.bookingReference}\\nTicket: ${ticket.ticketCode}\\nScreen: ${ticket.showtime.auditorium.name}`,
      `LOCATION:${ticket.showtime.auditorium.cinema.name}, ${ticket.showtime.auditorium.cinema.address}, ${ticket.showtime.auditorium.cinema.city}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `cinebook-${ticket.ticketCode}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center text-white">
        <p className="text-red-400">{error || "Ticket not found."}</p>
        <Link href="/bookings" className="mt-4 inline-block text-gold-400 underline">
          View All Bookings
        </Link>
      </div>
    );
  }

  const seatsList = ticket.booking.items
    .map((it) => `${it.seat.rowLetter}${it.seat.seatNumber}`)
    .join(", ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 pb-28">
      {/* Top Controls */}
      <div className="flex items-center justify-between pb-6 no-print">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> My Bookings
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadCalendarEvent}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10"
          >
            <Calendar className="h-3.5 w-3.5 text-gold-400" /> Add to Calendar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-1.5 text-xs font-bold text-cinema-950 shadow-glow hover:brightness-110"
          >
            <Printer className="h-3.5 w-3.5" /> Print Ticket
          </button>
        </div>
      </div>

      {/* Digital Boarding Pass Ticket */}
      <div className="relative rounded-3xl overflow-hidden border border-gold-500/30 bg-gradient-to-b from-cinema-900 to-cinema-950 shadow-2xl">
        {/* Decorative Top Gold Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-gold-600 via-gold-400 to-amber-500" />

        <div className="p-6 sm:p-8">
          {/* Header Pass Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500 text-cinema-950 font-bold">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-tight">
                  Cine<span className="text-gold-400">Book</span> Pass
                </span>
                <p className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
                  Ref: {ticket.booking.bookingReference}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
            </div>
          </div>

          {/* Ticket Body Content */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12 pt-6">
            {/* Left Movie Info (8 cols) */}
            <div className="space-y-6 md:col-span-8">
              <div>
                <span className="rounded bg-gold-500/20 px-2 py-0.5 text-[10px] font-bold text-gold-400 uppercase tracking-widest border border-gold-500/30">
                  {ticket.showtime.format} Premiere
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">
                  {ticket.showtime.movie.title}
                </h1>
                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                  <span>Rating: {ticket.showtime.movie.rating}</span>
                  <span>•</span>
                  <span>{ticket.showtime.movie.durationMins} minutes</span>
                </p>
              </div>

              {/* Cinema & Session Details */}
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white/5 p-4 text-xs border border-white/5">
                <div>
                  <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
                    Date & Time
                  </span>
                  <p className="font-bold text-white mt-0.5">
                    {new Date(ticket.showtime.startTime).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-gold-400 font-extrabold text-sm">
                    {new Date(ticket.showtime.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div>
                  <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
                    Auditorium & Seats
                  </span>
                  <p className="font-bold text-white mt-0.5">{ticket.showtime.auditorium.name}</p>
                  <p className="text-gold-400 font-extrabold text-sm">Seats: {seatsList}</p>
                </div>

                <div className="col-span-2 border-t border-white/5 pt-2">
                  <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
                    Cinema Complex
                  </span>
                  <p className="font-bold text-white mt-0.5">
                    {ticket.showtime.auditorium.cinema.name}
                  </p>
                  <p className="text-zinc-400 text-[11px]">
                    {ticket.showtime.auditorium.cinema.address},{" "}
                    {ticket.showtime.auditorium.cinema.city}
                  </p>
                </div>
              </div>
            </div>

            {/* Right QR Code Pass (4 cols) */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-4 md:col-span-4">
              <div className="relative h-44 w-44 rounded-xl overflow-hidden bg-white p-2 shadow-inner">
                {ticket.qrCodeUrl ? (
                  <img src={ticket.qrCodeUrl} alt="Ticket QR Code" className="h-full w-full object-contain" />
                ) : (
                  <div className="h-full w-full bg-zinc-200" />
                )}
              </div>
              <span className="mt-2 text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                {ticket.ticketCode}
              </span>
              <span className="mt-1 text-[9px] text-zinc-500 text-center">
                Scan at cinema turnstile or usher terminal
              </span>
            </div>
          </div>
        </div>

        {/* Perforated bottom footer */}
        <div className="border-t-2 border-dashed border-white/10 bg-cinema-950 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500">
          <span>Present this digital pass on arrival. Doors open 15 mins prior to showtime.</span>
          <span className="font-mono mt-1 sm:mt-0">Paid: ${(ticket.booking.totalCents / 100).toFixed(2)} USD</span>
        </div>
      </div>
    </div>
  );
}
