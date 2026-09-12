import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/db/booking-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleRelease(req);
}

export async function POST(req: NextRequest) {
  return handleRelease(req);
}

async function handleRelease(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || "cinebook_cron_secret_token_12345";

  // Check authorization header or query param
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");

  const providedToken =
    authHeader?.replace(/^Bearer\s+/i, "") ||
    req.headers.get("x-cron-secret") ||
    querySecret;

  if (providedToken !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing CRON_SECRET." },
      { status: 401 }
    );
  }

  try {
    const result = await releaseExpiredHolds();
    return NextResponse.json({
      message: "Expired seat holds released successfully.",
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Cron release error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 }
    );
  }
}
