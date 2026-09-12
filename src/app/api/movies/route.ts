import { NextRequest, NextResponse } from "next/server";
import { getDb, poolInstance, ensureSeeded } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const query = searchParams.get("query")?.trim() || "";
    const genre = searchParams.get("genre")?.trim() || "";
    const language = searchParams.get("language")?.trim() || "";
    const cinemaId = searchParams.get("cinemaId")?.trim() || "";
    const date = searchParams.get("date")?.trim() || "";

    getDb();
    await ensureSeeded();
    if (!poolInstance) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const client = await poolInstance.connect();

    try {
      const moviesRes = await client.query(`
        SELECT id, title, slug, description, poster_url as "posterUrl", backdrop_url as "backdropUrl",
               duration_mins as "durationMins", rating, release_date as "releaseDate", language,
               trailer_url as "trailerUrl", director, "cast", is_featured as "isFeatured"
        FROM movies
        ORDER BY is_featured DESC, release_date DESC;
      `);

      const movieGenresRes = await client.query(`
        SELECT mg.movie_id, g.id as genre_id, g.name as genre_name, g.slug as genre_slug
        FROM movie_genres mg
        JOIN genres g ON g.id = mg.genre_id;
      `);

      const showtimesRes = await client.query(`
        SELECT st.id, st.movie_id, st.start_time as "startTime", st.end_time as "endTime",
               st.base_price_cents as "basePriceCents", st.format,
               a.id as auditorium_id, a.name as auditorium_name, a.cinema_id,
               c.id as cinema_id, c.name as cinema_name, c.city as cinema_city
        FROM showtimes st
        JOIN auditoriums a ON a.id = st.auditorium_id
        JOIN cinemas c ON c.id = a.cinema_id
        ORDER BY st.start_time ASC;
      `);

      // Assemble relationships
      const allMovies = moviesRes.rows.map((m) => {
        const linkedGenres = movieGenresRes.rows
          .filter((mg) => mg.movie_id === m.id)
          .map((mg) => ({
            genre: {
              id: mg.genre_id,
              name: mg.genre_name,
              slug: mg.genre_slug,
            },
          }));

        const linkedShowtimes = showtimesRes.rows
          .filter((st) => st.movie_id === m.id)
          .map((st) => ({
            id: st.id,
            startTime: st.startTime,
            endTime: st.endTime,
            format: st.format,
            basePriceCents: st.basePriceCents,
            auditorium: {
              id: st.auditorium_id,
              name: st.auditorium_name,
              cinemaId: st.cinema_id,
              cinema: {
                id: st.cinema_id,
                name: st.cinema_name,
                city: st.cinema_city,
              },
            },
          }));

        return {
          ...m,
          movieGenres: linkedGenres,
          showtimes: linkedShowtimes,
        };
      });

      // Apply search & multi-facet filters
      const filtered = allMovies.filter((movie) => {
        if (query && !movie.title.toLowerCase().includes(query.toLowerCase())) {
          return false;
        }

        if (language && language !== "ALL" && movie.language.toLowerCase() !== language.toLowerCase()) {
          return false;
        }

        if (genre && genre !== "ALL") {
          const hasGenre = movie.movieGenres.some(
            (mg: any) =>
              mg.genre.slug.toLowerCase() === genre.toLowerCase() ||
              mg.genre.name.toLowerCase() === genre.toLowerCase()
          );
          if (!hasGenre) return false;
        }

        if (cinemaId && cinemaId !== "ALL") {
          const hasCinema = movie.showtimes.some((st: any) => st.auditorium.cinemaId === cinemaId);
          if (!hasCinema) return false;
        }

        if (date && date !== "ALL") {
          const hasDate = movie.showtimes.some((st: any) => {
            const stDate = new Date(st.startTime).toISOString().slice(0, 10);
            return stDate === date;
          });
          if (!hasDate) return false;
        }

        return true;
      });

      return NextResponse.json({
        success: true,
        movies: filtered,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error fetching movies:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
