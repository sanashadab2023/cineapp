import { NextRequest, NextResponse } from "next/server";
import { getDb, poolInstance, ensureSeeded } from "@/db";
import { getSessionUserFromRequest } from "@/lib/auth";
import { calculateSeatPrice } from "@/db/booking-engine";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const showtimeId = params.id;
    getDb();
    await ensureSeeded();
    if (!poolInstance) {
      return NextResponse.json({ error: "Database not connected." }, { status: 500 });
    }

    const currentUser = await getSessionUserFromRequest(req);
    const client = await poolInstance.connect();

    try {
      // 1. Fetch showtime details
      const showtimeRes = await client.query(
        `
        SELECT st.id, st.start_time as "startTime", st.end_time as "endTime", st.format, st.base_price_cents as "basePriceCents",
               m.id as movie_id, m.title as movie_title, m.poster_url as movie_poster_url, m.rating as movie_rating, m.duration_mins as movie_duration_mins,
               a.id as auditorium_id, a.name as auditorium_name,
               c.id as cinema_id, c.name as cinema_name, c.city as cinema_city
        FROM showtimes st
        JOIN movies m ON m.id = st.movie_id
        JOIN auditoriums a ON a.id = st.auditorium_id
        JOIN cinemas c ON c.id = a.cinema_id
        WHERE st.id = $1;
        `,
        [showtimeId]
      );

      if (showtimeRes.rows.length === 0) {
        return NextResponse.json({ error: "Showtime not found." }, { status: 404 });
      }

      const stRow = showtimeRes.rows[0];
      const showtime = {
        id: stRow.id,
        startTime: stRow.startTime,
        endTime: stRow.endTime,
        format: stRow.format,
        basePriceCents: stRow.basePriceCents,
        movie: {
          id: stRow.movie_id,
          title: stRow.movie_title,
          posterUrl: stRow.movie_poster_url,
          rating: stRow.movie_rating,
          durationMins: stRow.movie_duration_mins,
        },
        auditorium: {
          id: stRow.auditorium_id,
          name: stRow.auditorium_name,
          cinema: {
            id: stRow.cinema_id,
            name: stRow.cinema_name,
            city: stRow.cinema_city,
          },
        },
      };

      // 2. Fetch all seats for this showtime
      const seatsQuery = `
        SELECT 
          ss.id as showtime_seat_id,
          ss.status,
          ss.held_by_user_id,
          ss.hold_expires_at,
          s.id as seat_id,
          s.row_letter,
          s.seat_number,
          s.seat_tier
        FROM showtime_seats ss
        JOIN seats s ON s.id = ss.seat_id
        WHERE ss.showtime_id = $1
        ORDER BY s.row_letter ASC, s.seat_number ASC;
      `;

      const res = await client.query(seatsQuery, [showtimeId]);
      const seatRows = res.rows;
      const now = new Date();

      const formattedSeats = seatRows.map((seat) => {
        let effectiveStatus = seat.status;

        if (seat.status === "HELD") {
          if (seat.hold_expires_at && new Date(seat.hold_expires_at) < now) {
            effectiveStatus = "AVAILABLE"; // Hold expired
          } else if (currentUser && seat.held_by_user_id === currentUser.userId) {
            effectiveStatus = "HELD_BY_ME";
          }
        }

        const calculatedPriceCents = calculateSeatPrice(showtime.basePriceCents, seat.seat_tier);

        return {
          showtimeSeatId: seat.showtime_seat_id,
          seatId: seat.seat_id,
          rowLetter: seat.row_letter,
          seatNumber: seat.seat_number,
          tier: seat.seat_tier,
          status: effectiveStatus,
          priceCents: calculatedPriceCents,
          holdExpiresAt: seat.hold_expires_at,
        };
      });

      return NextResponse.json({
        success: true,
        showtime,
        seats: formattedSeats,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Error fetching seat map:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
