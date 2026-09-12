import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { confirmBookingPayment } from "@/db/booking-engine";
import { getDb, poolInstance, ensureSeeded } from "@/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookingId = params.id;
    const body = await req.json().catch(() => ({}));
    const { paymentIntentId, idempotencyKey, provider = "TEST" } = body;

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Payment idempotencyKey is required." },
        { status: 400 }
      );
    }

    getDb();
    await ensureSeeded();
    if (!poolInstance) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    // Verify ownership
    const client = await poolInstance.connect();
    try {
      const existing = await client.query("SELECT user_id FROM bookings WHERE id = $1", [bookingId]);
      if (existing.rows.length === 0) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }

      if (existing.rows[0].user_id !== user.userId && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden: Not your booking." }, { status: 403 });
      }
    } finally {
      client.release();
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";

    const result = await confirmBookingPayment({
      bookingId,
      paymentIntentId: paymentIntentId || `pi_${idempotencyKey}`,
      idempotencyKey,
      provider,
      metadata: { userEmail: user.email, userName: user.name },
      ipAddress,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      idempotent: result.idempotent || false,
      booking: result.booking,
      tickets: result.tickets,
    });
  } catch (err: any) {
    console.error("Payment confirmation error:", err);
    return NextResponse.json(
      { error: "Failed to confirm payment.", message: err.message },
      { status: 500 }
    );
  }
}
