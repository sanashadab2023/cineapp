import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
