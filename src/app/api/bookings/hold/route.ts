import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { createSeatHoldAndBooking } from "@/db/booking-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    const body = await req.json();
    const { showtimeId, seatIds } = body;

    if (!showtimeId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. showtimeId and seatIds array are required." },
        { status: 400 }
      );
    }

    if (seatIds.length > 8) {
      return NextResponse.json(
        { error: "You can reserve a maximum of 8 seats per transaction." },
        { status: 400 }
      );
    }

    // Determine user ID: from session or fallback guest ID for quick checkout
    let userId = user?.userId;
    if (!userId) {
      // In guest or testing mode, generate/use a transient user ID or require login
      return NextResponse.json(
        { error: "Authentication required. Please sign in to reserve seats.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";

    const result = await createSeatHoldAndBooking({
      showtimeId,
      seatIds,
      userId,
      ipAddress,
    });

    if (!result.success) {
      if (result.code === "SEAT_UNAVAILABLE" || result.code === "SEATS_NOT_FOUND") {
        return NextResponse.json({ error: result.error, code: result.code }, { status: 409 });
      }
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
    });
  } catch (err: any) {
    console.error("Booking hold error:", err);
    return NextResponse.json(
      { error: "Failed to reserve seats.", message: err.message },
      { status: 500 }
    );
  }
}
