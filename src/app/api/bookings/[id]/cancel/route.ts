import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { cancelBooking } from "@/db/booking-engine";

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
    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";

    const result = await cancelBooking({
      bookingId,
      userId: user.userId,
      isAdmin: user.role === "ADMIN",
      ipAddress,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === "UNAUTHORIZED" ? 403 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully and seats released.",
      booking: result.booking,
    });
  } catch (err: any) {
    console.error("Booking cancellation error:", err);
    return NextResponse.json(
      { error: "Failed to cancel booking.", message: err.message },
      { status: 500 }
    );
  }
}
