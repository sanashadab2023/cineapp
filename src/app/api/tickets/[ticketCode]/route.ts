import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getDb, poolInstance, ensureSeeded } from "@/db";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { ticketCode: string } }
) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticketCode } = params;
    getDb();
    await ensureSeeded();
    if (!poolInstance) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const client = await poolInstance.connect();

    try {
      // 1. Fetch ticket and showtime info
      const ticketRes = await client.query(
        `
        SELECT t.id, t.ticket_code as "ticketCode", t.booking_id as "bookingId",
               t.user_id as "userId", t.qr_code_data as "qrCodeData", t.is_used as "isUsed",
               b.booking_reference as "bookingReference", b.status as "bookingStatus", b.total_cents as "totalCents",
               st.start_time as "showtimeStartTime", st.format as "showtimeFormat",
               m.title as "movieTitle", m.poster_url as "moviePosterUrl", m.rating as "movieRating", m.duration_mins as "movieDurationMins",
               a.name as "auditoriumName",
               c.name as "cinemaName", c.address as "cinemaAddress", c.city as "cinemaCity"
        FROM tickets t
        JOIN bookings b ON b.id = t.booking_id
        JOIN showtimes st ON st.id = t.showtime_id
        JOIN movies m ON m.id = st.movie_id
        JOIN auditoriums a ON a.id = st.auditorium_id
        JOIN cinemas c ON c.id = a.cinema_id
        WHERE t.ticket_code = $1;
        `,
        [ticketCode]
      );

      if (ticketRes.rows.length === 0) {
        return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
      }

      const t = ticketRes.rows[0];

      if (t.userId !== user.userId && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden: Not your ticket." }, { status: 403 });
      }

      // 2. Fetch booking seat items
      const itemsRes = await client.query(
        `
        SELECT bi.id, s.row_letter as "rowLetter", s.seat_number as "seatNumber", s.seat_tier as "seatTier"
        FROM booking_items bi
        JOIN seats s ON s.id = bi.seat_id
        WHERE bi.booking_id = $1;
        `,
        [t.bookingId]
      );

      // Generate dynamic QR Code Data URL
      const qrDataUrl = await QRCode.toDataURL(t.qrCodeData, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 300,
        color: {
          dark: "#06080D",
          light: "#FFFFFF",
        },
      });

      return NextResponse.json({
        success: true,
        ticket: {
          id: t.id,
          ticketCode: t.ticketCode,
          qrCodeUrl: qrDataUrl,
          isUsed: t.isUsed,
          booking: {
            id: t.bookingId,
            bookingReference: t.bookingReference,
            status: t.bookingStatus,
            totalCents: t.totalCents,
            items: itemsRes.rows.map((item) => ({
              id: item.id,
              seat: {
                rowLetter: item.rowLetter,
                seatNumber: item.seatNumber,
                seatTier: item.seatTier,
              },
            })),
          },
          showtime: {
            startTime: t.showtimeStartTime,
            format: t.showtimeFormat,
            movie: {
              title: t.movieTitle,
              posterUrl: t.moviePosterUrl,
              rating: t.movieRating,
              durationMins: t.movieDurationMins,
            },
            auditorium: {
              name: t.auditoriumName,
              cinema: {
                name: t.cinemaName,
                address: t.cinemaAddress,
                city: t.cinemaCity,
              },
            },
          },
        },
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error fetching ticket:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
