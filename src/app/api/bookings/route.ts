import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getDb, poolInstance, ensureSeeded } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    getDb();
    await ensureSeeded();
    if (!poolInstance) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const client = await poolInstance.connect();

    try {
      const bookingsRes = await client.query(
        `
        SELECT b.id, b.booking_reference as "bookingReference", b.status,
               b.total_cents as "totalCents", b.created_at as "createdAt",
               st.start_time as "showtimeStartTime", st.format as "showtimeFormat",
               m.title as "movieTitle", m.poster_url as "moviePosterUrl", m.rating as "movieRating",
               a.name as "auditoriumName",
               c.name as "cinemaName", c.city as "cinemaCity"
        FROM bookings b
        JOIN showtimes st ON st.id = b.showtime_id
        JOIN movies m ON m.id = st.movie_id
        JOIN auditoriums a ON a.id = st.auditorium_id
        JOIN cinemas c ON c.id = a.cinema_id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC;
        `,
        [user.userId]
      );

      let itemsRes = { rows: [] as any[] };
      if (bookingsRes.rows.length > 0) {
        const placeholders = bookingsRes.rows.map((_, i) => `$${i + 1}`).join(", ");
        itemsRes = await client.query(
          `
          SELECT bi.id, bi.booking_id,
                 s.row_letter as "rowLetter", s.seat_number as "seatNumber", s.seat_tier as "seatTier"
          FROM booking_items bi
          JOIN seats s ON s.id = bi.seat_id
          WHERE bi.booking_id IN (${placeholders});
          `,
          bookingsRes.rows.map((b) => b.id)
        );
      }

      const ticketsRes = await client.query(
        `
        SELECT id, booking_id, ticket_code as "ticketCode"
        FROM tickets
        WHERE user_id = $1;
        `,
        [user.userId]
      );

      const formattedBookings = bookingsRes.rows.map((b) => ({
        id: b.id,
        bookingReference: b.bookingReference,
        status: b.status,
        totalCents: b.totalCents,
        createdAt: b.createdAt,
        showtime: {
          startTime: b.showtimeStartTime,
          format: b.showtimeFormat,
          movie: {
            title: b.movieTitle,
            posterUrl: b.moviePosterUrl,
            rating: b.movieRating,
          },
          auditorium: {
            name: b.auditoriumName,
            cinema: {
              name: b.cinemaName,
              city: b.cinemaCity,
            },
          },
        },
        items: itemsRes.rows
          .filter((item) => item.booking_id === b.id)
          .map((item) => ({
            id: item.id,
            seat: {
              rowLetter: item.rowLetter,
              seatNumber: item.seatNumber,
              seatTier: item.seatTier,
            },
          })),
        tickets: ticketsRes.rows.filter((t) => t.booking_id === b.id),
      }));

      return NextResponse.json({ success: true, bookings: formattedBookings });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error fetching user bookings:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
