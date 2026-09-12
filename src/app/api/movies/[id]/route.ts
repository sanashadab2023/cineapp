import { NextRequest, NextResponse } from "next/server";
import { getDb, poolInstance } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movieId = params.id;
    getDb();
    if (!poolInstance) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const client = await poolInstance.connect();

    try {
      const movieRes = await client.query(
        `
        SELECT id, title, slug, description, poster_url as "posterUrl", backdrop_url as "backdropUrl",
               duration_mins as "durationMins", rating, release_date as "releaseDate", language,
               trailer_url as "trailerUrl", director, "cast", is_featured as "isFeatured"
        FROM movies
        WHERE id = $1;
        `,
        [movieId]
      );

      if (movieRes.rows.length === 0) {
        return NextResponse.json({ error: "Movie not found." }, { status: 404 });
      }

      const movie = movieRes.rows[0];

      const genresRes = await client.query(
        `
        SELECT g.id, g.name, g.slug
        FROM movie_genres mg
        JOIN genres g ON g.id = mg.genre_id
        WHERE mg.movie_id = $1;
        `,
        [movieId]
      );

      const showtimesRes = await client.query(
        `
        SELECT st.id, st.start_time as "startTime", st.end_time as "endTime",
               st.base_price_cents as "basePriceCents", st.format,
               a.id as auditorium_id, a.name as auditorium_name, a.cinema_id,
               c.id as cinema_id, c.name as cinema_name, c.city as cinema_city, c.address as cinema_address
        FROM showtimes st
        JOIN auditoriums a ON a.id = st.auditorium_id
        JOIN cinemas c ON c.id = a.cinema_id
        WHERE st.movie_id = $1
        ORDER BY st.start_time ASC;
        `,
        [movieId]
      );

      const formattedShowtimes = showtimesRes.rows.map((st) => ({
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
            address: st.cinema_address,
          },
        },
      }));

      return NextResponse.json({
        success: true,
        movie: {
          ...movie,
          movieGenres: genresRes.rows.map((g) => ({ genre: g })),
          showtimes: formattedShowtimes,
        },
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error fetching movie:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
