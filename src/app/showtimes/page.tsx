"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, Film, MapPin, ChevronRight, Filter } from "lucide-react";

interface MovieWithShowtimes {
  id: string;
  title: string;
  posterUrl: string;
  durationMins: number;
  rating: string;
  showtimes: {
    id: string;
    startTime: string;
    format: string;
    basePriceCents: number;
    auditorium: {
      name: string;
      cinema: {
        id: string;
        name: string;
        city: string;
      };
    };
  }[];
}

export default function ShowtimesPage() {
  const [movies, setMovies] = useState<MovieWithShowtimes[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetchMovies();
  }, [selectedDate]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/movies?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setMovies(data.movies);
      }
    } catch (err) {
      console.error("Failed to load showtimes", err);
    } finally {
      setLoading(false);
    }
  };

  const dates = [
    { label: "Today", value: new Date().toISOString().slice(0, 10) },
    {
      label: "Tomorrow",
      value: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10),
    },
    {
      label: new Date(Date.now() + 48 * 3600 * 1000).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      value: new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Showtime Schedules</h1>
          <p className="text-sm text-zinc-400 mt-1">Browse all sessions by date and cinema format.</p>
        </div>

        {/* Date Selector */}
        <div className="flex gap-2">
          {dates.map((d) => (
            <button
              key={d.value}
              onClick={() => setSelectedDate(d.value)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                selectedDate === d.value
                  ? "bg-gold-500 text-cinema-950 shadow-glow"
                  : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-8 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-cinema-900/50 animate-pulse" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-white/10 bg-cinema-900/40 p-12 text-center text-zinc-400">
          No showtimes found for the selected date.
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="glass-panel rounded-2xl p-6 border border-white/10 transition-all hover:border-gold-500/30"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/10">
                    <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{movie.title}</h2>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                      <span className="rounded bg-black/40 px-1.5 py-0.5 font-bold text-white border border-white/10">
                        {movie.rating}
                      </span>
                      <span>•</span>
                      <span>{movie.durationMins} mins</span>
                    </div>
                  </div>
                </div>

                {/* Showtimes Grid */}
                <div className="flex flex-wrap items-center gap-3">
                  {movie.showtimes.map((st) => {
                    const time = new Date(st.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <Link
                        key={st.id}
                        href={`/showtimes/${st.id}/seats`}
                        className="group flex flex-col items-center rounded-xl border border-white/10 bg-cinema-900/80 px-4 py-2.5 text-center transition-all hover:border-gold-500 hover:bg-gold-500/10"
                      >
                        <span className="text-sm font-bold text-white group-hover:text-gold-400">
                          {time}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-bold text-gold-400 uppercase">
                            {st.format}
                          </span>
                          <span className="text-[10px] text-zinc-400">{st.auditorium.cinema.city}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
