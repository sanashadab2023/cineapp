"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clock, Calendar, Star, MapPin, Play, ChevronLeft, Ticket, Sparkles, User } from "lucide-react";

interface MovieDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  durationMins: number;
  rating: string;
  releaseDate: string;
  language: string;
  trailerUrl?: string;
  director?: string;
  cast?: string;
  movieGenres: { genre: { id: string; name: string } }[];
  showtimes: {
    id: string;
    startTime: string;
    endTime: string;
    basePriceCents: number;
    format: string;
    auditorium: {
      id: string;
      name: string;
      cinemaId: string;
      cinema: {
        id: string;
        name: string;
        city: string;
        address: string;
      };
    };
  }[];
}

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    fetchMovie();
  }, [movieId]);

  const fetchMovie = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/movies/${movieId}`);
      if (res.ok) {
        const data = await res.json();
        setMovie(data.movie);

        // Pick first date with available showtimes
        if (data.movie.showtimes && data.movie.showtimes.length > 0) {
          const firstDate = new Date(data.movie.showtimes[0].startTime).toISOString().slice(0, 10);
          setSelectedDate(firstDate);
        }
      }
    } catch (err) {
      console.error("Failed to load movie", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h2 className="text-2xl font-bold text-white">Movie not found</h2>
        <Link href="/" className="mt-4 inline-block text-gold-400 hover:underline">
          Return to Browse Movies
        </Link>
      </div>
    );
  }

  // Extract unique dates from showtimes
  const uniqueDates = Array.from(
    new Set(
      movie.showtimes.map((st) => new Date(st.startTime).toISOString().slice(0, 10))
    )
  ).sort();

  // Filter showtimes for selected date
  const dateShowtimes = movie.showtimes.filter((st) => {
    return new Date(st.startTime).toISOString().slice(0, 10) === selectedDate;
  });

  // Group showtimes by cinema
  const cinemaGroups: Record<string, { cinema: any; showtimes: typeof movie.showtimes }> = {};
  for (const st of dateShowtimes) {
    const cId = st.auditorium.cinemaId;
    if (!cinemaGroups[cId]) {
      cinemaGroups[cId] = {
        cinema: st.auditorium.cinema,
        showtimes: [],
      };
    }
    cinemaGroups[cId].showtimes.push(st);
  }

  return (
    <div className="pb-24">
      {/* Hero Backdrop Banner */}
      <div className="relative h-[480px] w-full overflow-hidden">
        <Image
          src={movie.backdropUrl || movie.posterUrl}
          alt={movie.title}
          fill
          priority
          className="object-cover object-center filter brightness-[0.35]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-950 via-cinema-950/80 to-transparent" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-12 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="absolute top-6 left-4 sm:left-8 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-semibold text-zinc-300 backdrop-blur-md hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Movies
          </Link>

          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            {/* Poster Card */}
            <div className="relative h-64 w-44 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white/10 shadow-2xl hidden sm:block">
              <Image src={movie.posterUrl} alt={movie.title} fill className="object-cover" />
            </div>

            {/* Info */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-gold-500 px-2 py-0.5 text-xs font-bold text-cinema-950">
                  {movie.rating}
                </span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-zinc-300">
                  {movie.language}
                </span>
                <span className="flex items-center gap-1 text-xs text-zinc-300">
                  <Clock className="h-3.5 w-3.5 text-gold-400" /> {movie.durationMins} minutes
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                {movie.title}
              </h1>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 pt-1">
                {movie.movieGenres.map((mg) => (
                  <span
                    key={mg.genre.id}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-medium text-zinc-300"
                  >
                    {mg.genre.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Left / Top: Synopsis & Details */}
          <div className="space-y-8 lg:col-span-1">
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-3">Synopsis</h2>
              <p className="text-sm text-zinc-300 leading-relaxed">{movie.description}</p>

              {movie.director && (
                <div className="mt-6 border-t border-white/5 pt-4">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Director
                  </span>
                  <p className="text-sm font-semibold text-white mt-0.5">{movie.director}</p>
                </div>
              )}

              {movie.cast && (
                <div className="mt-4 border-t border-white/5 pt-4">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Cast
                  </span>
                  <p className="text-sm text-zinc-300 mt-0.5">{movie.cast}</p>
                </div>
              )}

              {movie.trailerUrl && (
                <div className="mt-6 pt-4 border-t border-white/5">
                  <a
                    href={movie.trailerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <Play className="h-4 w-4 fill-white" /> Watch Official Trailer
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right: Showtime Booking Matrix */}
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Ticket className="h-6 w-6 text-gold-400" /> Select Showtime & Experience
              </h2>
            </div>

            {/* Date Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {uniqueDates.map((dateStr) => {
                const d = new Date(dateStr + "T00:00:00");
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex min-w-[100px] flex-col items-center rounded-xl p-3 text-center transition-all ${
                      isSelected
                        ? "bg-gradient-to-b from-gold-500 to-amber-600 text-cinema-950 font-bold shadow-glow scale-[1.03]"
                        : "glass-panel text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="text-xs uppercase font-medium">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="text-lg font-extrabold">{d.getDate()}</span>
                    <span className="text-[10px] opacity-80">
                      {d.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Cinema List & Showtimes */}
            <div className="space-y-6 pt-2">
              {Object.keys(cinemaGroups).length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-zinc-400">
                  No showtimes available for the selected date. Please choose another day.
                </div>
              ) : (
                Object.values(cinemaGroups).map(({ cinema, showtimes }) => (
                  <div
                    key={cinema.id}
                    className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gold-400" /> {cinema.name}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">{cinema.address}, {cinema.city}</p>
                      </div>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
                        {showtimes.length} {showtimes.length === 1 ? "Session" : "Sessions"}
                      </span>
                    </div>

                    {/* Showtimes Pill Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                      {showtimes.map((st) => {
                        const time = new Date(st.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const priceFormatted = `$${(st.basePriceCents / 100).toFixed(2)}`;

                        return (
                          <Link
                            key={st.id}
                            href={`/showtimes/${st.id}/seats`}
                            className="group flex flex-col items-center justify-center rounded-xl border border-white/10 bg-cinema-900/80 p-3.5 text-center transition-all hover:border-gold-500 hover:bg-gold-500/10 hover:scale-[1.02] shadow-sm"
                          >
                            <span className="text-base font-bold text-white group-hover:text-gold-400">
                              {time}
                            </span>
                            <span className="mt-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-gold-400 uppercase tracking-wider">
                              {st.format}
                            </span>
                            <span className="mt-1.5 text-[11px] text-zinc-400">
                              From {priceFormatted}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
