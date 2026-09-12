"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Sparkles, Film, Clock, ChevronRight } from "lucide-react";

interface CinemaItem {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
  imageUrl?: string;
  amenities?: string[];
  auditoriums: {
    id: string;
    name: string;
    soundSystem: string;
    totalSeats: number;
    showtimes: {
      id: string;
      startTime: string;
      format: string;
      movie: {
        id: string;
        title: string;
        rating: string;
      };
    }[];
  }[];
}

export default function CinemasPage() {
  const [cinemas, setCinemas] = useState<CinemaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cinemas")
      .then((res) => res.json())
      .then((data) => {
        if (data.cinemas) setCinemas(data.cinemas);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gold-400 uppercase tracking-widest">
          <MapPin className="h-4 w-4" /> Destination Theaters
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          CineBook Luxury Cinema Complexes
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Immerse yourself in world-class laser projection, Dolby Atmos 12-channel audio,
          and heated motorized luxury recliners with in-seat gourmet dining.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-cinema-900/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {cinemas.map((cinema) => (
            <div
              key={cinema.id}
              className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 hover:border-gold-500/40"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Cinema Image */}
                <div className="relative h-64 lg:h-auto lg:col-span-5 overflow-hidden">
                  <Image
                    src={cinema.imageUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800"}
                    alt={cinema.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cinema-950 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-cinema-950/80" />
                </div>

                {/* Cinema Info & Screens */}
                <div className="p-6 sm:p-8 lg:col-span-7 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-400 border border-gold-500/30">
                        {cinema.city}, {cinema.state}
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mt-2">{cinema.name}</h2>
                    <p className="text-sm text-zinc-400 flex items-center gap-1.5 mt-1">
                      <MapPin className="h-4 w-4 text-zinc-500" />
                      {cinema.address}, {cinema.city}, {cinema.state} {cinema.postalCode}
                    </p>
                    {cinema.phone && (
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                        <Phone className="h-3.5 w-3.5 text-zinc-500" /> {cinema.phone}
                      </p>
                    )}

                    {/* Amenities Badges */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(cinema.amenities || ["IMAX Laser", "Dolby Atmos", "Recliners", "Gourmet Bar"]).map(
                        (am: string) => (
                          <span
                            key={am}
                            className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 border border-white/5"
                          >
                            {am}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Playing Now Sessions Preview */}
                  <div className="border-t border-white/5 pt-4">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                      Today's Screenings
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {cinema.auditoriums.flatMap((aud) =>
                        aud.showtimes.slice(0, 2).map((st) => (
                          <Link
                            key={st.id}
                            href={`/showtimes/${st.id}/seats`}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-cinema-900/60 p-3 text-xs transition-colors hover:border-gold-500 hover:bg-gold-500/10"
                          >
                            <div>
                              <p className="font-bold text-white">{st.movie.title}</p>
                              <span className="text-[11px] text-zinc-400">
                                {new Date(st.startTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })} • {st.format}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gold-400" />
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
