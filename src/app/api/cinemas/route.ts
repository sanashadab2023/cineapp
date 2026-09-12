import { NextRequest, NextResponse } from "next/server";
import { getDb, poolInstance } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getDb();
    if (!poolInstance) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const client = await poolInstance.connect();

    try {
      const cinemasRes = await client.query(`
        SELECT id, name, slug, address, city, state, postal_code as "postalCode",
               phone, image_url as "imageUrl", amenities
        FROM cinemas
        ORDER BY name ASC;
      `);

      const audsRes = await client.query(`
        SELECT a.id, a.cinema_id, a.name, a.sound_system as "soundSystem", a.total_seats as "totalSeats"
        FROM auditoriums a;
      `);

      const showtimesRes = await client.query(`
        SELECT st.id, st.auditorium_id, st.start_time as "startTime", st.format,
               m.id as movie_id, m.title as movie_title, m.rating as movie_rating
        FROM showtimes st
        JOIN movies m ON m.id = st.movie_id
        ORDER BY st.start_time ASC;
      `);

      const cinemas = cinemasRes.rows.map((cine) => {
        const cinemaAuds = audsRes.rows
          .filter((a) => a.cinema_id === cine.id)
          .map((aud) => ({
            ...aud,
            showtimes: showtimesRes.rows
              .filter((st) => st.auditorium_id === aud.id)
              .map((st) => ({
                id: st.id,
                startTime: st.startTime,
                format: st.format,
                movie: {
                  id: st.movie_id,
                  title: st.movie_title,
                  rating: st.movie_rating,
                },
              })),
          }));

        return {
          ...cine,
          auditoriums: cinemaAuds,
        };
      });

      return NextResponse.json({ success: true, cinemas });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error fetching cinemas:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
