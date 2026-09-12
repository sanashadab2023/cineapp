import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getDb, poolInstance } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    if (!poolInstance) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
    }

    const client = await poolInstance.connect();

    try {
      // 1. Total revenue
      const revRes = await client.query(`
        SELECT COALESCE(SUM(total_cents), 0) as total_revenue_cents, COUNT(*) as confirmed_bookings_count
        FROM bookings
        WHERE status = 'CONFIRMED';
      `);

      // 2. Total tickets sold
      const ticketRes = await client.query(`
        SELECT COUNT(*) as total_tickets_sold FROM tickets;
      `);

      // 3. Active movies and cinemas
      const movieRes = await client.query(`SELECT COUNT(*) as active_movies FROM movies;`);
      const cinemaRes = await client.query(`SELECT COUNT(*) as total_cinemas FROM cinemas;`);

      // 4. Current active holds
      const holdRes = await client.query(`
        SELECT COUNT(*) as active_holds FROM showtime_seats WHERE status = 'HELD' AND hold_expires_at > NOW();
      `);

      // 5. Recent audit logs
      const logsRes = await client.query(`
        SELECT id, user_id, action, entity_type, entity_id, details, ip_address, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 30;
      `);

      return NextResponse.json({
        success: true,
        stats: {
          totalRevenueCents: parseInt(revRes.rows[0].total_revenue_cents, 10),
          confirmedBookingsCount: parseInt(revRes.rows[0].confirmed_bookings_count, 10),
          totalTicketsSold: parseInt(ticketRes.rows[0].total_tickets_sold, 10),
          activeMoviesCount: parseInt(movieRes.rows[0].active_movies, 10),
          totalCinemasCount: parseInt(cinemaRes.rows[0].total_cinemas, 10),
          activeHoldsCount: parseInt(holdRes.rows[0].active_holds, 10),
        },
        auditLogs: logsRes.rows,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Admin metrics error:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
