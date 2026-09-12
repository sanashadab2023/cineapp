"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Calendar, Clock, Star, MapPin, Sparkles, Filter, ChevronRight, Play, Film } from "lucide-react";

interface Movie {
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
  isFeatured: boolean;
  movieGenres: { genre: { id: string; name: string; slug: string } }[];
  showtimes: {
    id: string;
    startTime: string;
    basePriceCents: number;
    format: string;
    auditorium: {
      name: string;
      cinemaId: string;
      cinema: { id: string; name: string; city: string };
    };
  }[];
}

interface Cinema {
  id: string;
  name: string;
  city: string;
}

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("ALL");
  const [selectedLanguage, setSelectedLanguage] = useState("ALL");
  const [selectedCinema, setSelectedCinema] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("ALL");

  // Dates options (Today, Tomorrow, Day +2, Day +3)
  const dateOptions = [
    { label: "Any Date", value: "ALL" },
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

  const genres = ["ALL", "Sci-Fi", "Action", "Drama", "Thriller", "Adventure", "Crime"];

  useEffect(() => {
    fetchCinemas();
    fetchMovies();
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [searchQuery, selectedGenre, selectedLanguage, selectedCinema, selectedDate]);

  const fetchCinemas = async () => {
    try {
      const res = await fetch("/api/cinemas");
      if (res.ok) {
        const data = await res.json();
        setCinemas(data.cinemas);
      }
    } catch (err) {
      console.error("Failed to load cinemas", err);
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (selectedGenre !== "ALL") params.append("genre", selectedGenre);
      if (selectedLanguage !== "ALL") params.append("language", selectedLanguage);
      if (selectedCinema !== "ALL") params.append("cinemaId", selectedCinema);
      if (selectedDate !== "ALL") params.append("date", selectedDate);

      const res = await fetch(`/api/movies?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMovies(data.movies);
      }
    } catch (err) {
      console.error("Failed to load movies", err);
    } finally {
      setLoading(false);
    }
  };

  const featuredMovie = movies.find((m) => m.isFeatured) || movies[0];

  return (
    <div className="flex flex-col gap-12 pb-20">
      {/* Hero Spotlight Section */}
      {featuredMovie && (
        <section className="relative h-[650px] w-full overflow-hidden">
          {/* Backdrop Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src={featuredMovie.backdropUrl || featuredMovie.posterUrl}
              alt={featuredMovie.title}
              fill
              priority
              className="object-cover object-top filter brightness-50"
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-950 via-cinema-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-cinema-950 via-cinema-950/70 to-transparent" />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-16 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex items-center gap-1.5 rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-400 border border-gold-500/30 shadow-glow">
                  <Sparkles className="h-3.5 w-3.5" /> Featured Blockbuster
                </span>
                <span className="rounded-md border border-white/20 bg-black/40 px-2 py-0.5 text-xs font-bold text-white">
                  {featuredMovie.rating}
                </span>
                <span className="flex items-center gap-1 text-xs text-zinc-300">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" /> {featuredMovie.durationMins} mins
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
                {featuredMovie.title}
              </h1>

              <p className="line-clamp-3 text-base sm:text-lg text-zinc-300 leading-relaxed drop-shadow">
                {featuredMovie.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href={`/movies/${featuredMovie.id}`}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 px-6 py-3.5 text-sm font-bold text-cinema-950 shadow-glow transition-all hover:brightness-110 hover:scale-[1.02]"
                >
                  <Calendar className="h-4 w-4" /> Book Tickets Now
                </Link>

                {featuredMovie.trailerUrl && (
                  <a
                    href={featuredMovie.trailerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20"
                  >
                    <Play className="h-4 w-4 fill-white" /> Watch Trailer
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Movie Catalog & Filters */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full -mt-8 relative z-20">
        {/* Search and Filters Bar */}
        <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search movies by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-cinema-900/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-all"
              />
            </div>

            {/* Cinema Selector */}
            <div>
              <select
                value={selectedCinema}
                onChange={(e) => setSelectedCinema(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-cinema-900/90 px-3.5 py-2.5 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-all"
              >
                <option value="ALL">All Cinemas</option>
                {cinemas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selector */}
            <div>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-cinema-900/90 px-3.5 py-2.5 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-all"
              >
                <option value="ALL">All Languages</option>
                <option value="English">English</option>
                <option value="Japanese">Japanese</option>
              </select>
            </div>
          </div>

          {/* Quick Date Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
            <span className="text-xs font-semibold text-zinc-400 mr-2 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-gold-400" /> Date:
            </span>
            {dateOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedDate(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedDate === opt.value
                    ? "bg-gold-500 text-cinema-950 shadow-glow"
                    : "border border-white/10 bg-cinema-900/60 text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Genre Filter Pills */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 mr-2 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-gold-400" /> Genre:
            </span>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                  selectedGenre === g
                    ? "bg-white/20 text-white border border-white/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Movies Grid */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              Now Showing
              <span className="text-sm font-normal text-zinc-400">
                ({movies.length} {movies.length === 1 ? "movie" : "movies"} available)
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 rounded-2xl bg-cinema-900/50 animate-pulse border border-white/5" />
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-cinema-900/40 p-12 text-center">
              <Film className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
              <h3 className="text-lg font-bold text-white">No movies found</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Try adjusting your search criteria or resetting filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenre("ALL");
                  setSelectedLanguage("ALL");
                  setSelectedCinema("ALL");
                  setSelectedDate("ALL");
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {movies.map((movie) => (
                <div
                  key={movie.id}
                  className="group relative flex flex-col rounded-2xl border border-white/10 bg-cinema-900/60 overflow-hidden shadow-lg transition-all duration-300 hover:border-gold-500/50 hover:shadow-2xl hover:scale-[1.01]"
                >
                  {/* Poster Image */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      src={movie.posterUrl}
                      alt={movie.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cinema-900 via-transparent to-transparent opacity-80" />

                    {/* Rating & Language Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-md border border-white/10">
                        {movie.rating}
                      </span>
                      <span className="rounded-md bg-gold-500/90 px-2 py-0.5 text-xs font-bold text-cinema-950 backdrop-blur-md">
                        {movie.language}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-zinc-300">
                      <span className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                        <Clock className="h-3 w-3 text-gold-400" /> {movie.durationMins}m
                      </span>
                      <div className="flex gap-1">
                        {movie.movieGenres.slice(0, 2).map((mg) => (
                          <span
                            key={mg.genre.id}
                            className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-zinc-200 backdrop-blur-sm"
                          >
                            {mg.genre.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-gold-400 transition-colors">
                        {movie.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-xs text-zinc-400 leading-relaxed">
                        {movie.description}
                      </p>
                    </div>

                    {/* Upcoming Showtimes Preview */}
                    <div className="mt-5 border-t border-white/5 pt-4">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Available Showtimes
                      </span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {movie.showtimes.slice(0, 3).map((st) => {
                          const timeStr = new Date(st.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return (
                            <Link
                              key={st.id}
                              href={`/showtimes/${st.id}/seats`}
                              className="group/btn flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 transition-all hover:border-gold-500 hover:bg-gold-500/10 hover:text-gold-400"
                            >
                              <span>{timeStr}</span>
                              <span className="rounded bg-white/10 px-1 py-0.2 text-[10px] text-gold-400">
                                {st.format}
                              </span>
                            </Link>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-2">
                        <Link
                          href={`/movies/${movie.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 py-2.5 text-sm font-bold text-cinema-950 shadow-glow transition-all hover:brightness-110"
                        >
                          Select Showtimes <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
