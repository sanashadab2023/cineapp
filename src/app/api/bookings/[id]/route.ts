import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getDb, poolInstance, ensureSeeded } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookingId = params.id;
    getDb();
    await ensureSeeded();
    if (!poolInstance) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const client = await poolInstance.connect();

    try {
      // 1. Fetch booking record
      const bRes = await client.query(
        `
        SELECT b.id, b.booking_reference as "bookingReference", b.user_id as "userId",
               b.showtime_id as "showtimeId", b.status, b.subtotal_cents as "subtotalCents",
               b.fee_cents as "feeCents", b.tax_cents as "taxCents", b.total_cents as "totalCents",
               b.expires_at as "expiresAt", b.created_at as "createdAt",
               st.start_time as "showtimeStartTime", st.format as "showtimeFormat",
               m.title as "movieTitle", m.poster_url as "moviePosterUrl", m.rating as "movieRating",
               a.name as "auditoriumName",
               c.name as "cinemaName", c.address as "cinemaAddress", c.city as "cinemaCity"
        FROM bookings b
        JOIN showtimes st ON st.id = b.showtime_id
        JOIN movies m ON m.id = st.movie_id
        JOIN auditoriums a ON a.id = st.auditorium_id
        JOIN cinemas c ON c.id = a.cinema_id
        WHERE b.id = $1;
        `,
        [bookingId]
      );

      if (bRes.rows.length === 0) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }

      const b = bRes.rows[0];

      if (b.userId !== user.userId && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden: You cannot access another user's booking." }, { status: 403 });
      }

      // 2. Fetch booking items
      const itemsRes = await client.query(
        `
        SELECT bi.id, bi.price_cents as "priceCents",
               s.row_letter as "rowLetter", s.seat_number as "seatNumber", s.seat_tier as "seatTier"
        FROM booking_items bi
        JOIN seats s ON s.id = bi.seat_id
        WHERE bi.booking_id = $1;
        `,
        [bookingId]
      );

      // 3. Fetch tickets if confirmed
      const ticketsRes = await client.query(
        `SELECT id, ticket_code as "ticketCode", qr_code_data as "qrCodeData" FROM tickets WHERE booking_id = $1;`,
        [bookingId]
      );

      const formattedBooking = {
        id: b.id,
        bookingReference: b.bookingReference,
        userId: b.userId,
        showtimeId: b.showtimeId,
        status: b.status,
        subtotalCents: b.subtotalCents,
        feeCents: b.feeCents,
        taxCents: b.taxCents,
        totalCents: b.totalCents,
        expiresAt: b.expiresAt,
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
              address: b.cinemaAddress,
              city: b.cinemaCity,
            },
          },
        },
        items: itemsRes.rows.map((item) => ({
          id: item.id,
          priceCents: item.priceCents,
          seat: {
            rowLetter: item.rowLetter,
            seatNumber: item.seatNumber,
            seatTier: item.seatTier,
          },
        })),
        tickets: ticketsRes.rows,
      };

      return NextResponse.json({ success: true, booking: formattedBooking });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error fetching booking:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
