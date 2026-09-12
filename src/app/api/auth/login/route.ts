import { NextRequest, NextResponse } from "next/server";
import { getDb, poolInstance, ensureSeeded } from "@/db";
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    getDb();
    await ensureSeeded();
    if (!poolInstance) {
      return NextResponse.json({ error: "Database connection unavailable." }, { status: 500 });
    }

    const client = await poolInstance.connect();
    try {
      const res = await client.query(
        `SELECT id, name, email, password_hash as "passwordHash", role FROM users WHERE email = $1 LIMIT 1;`,
        [email.trim().toLowerCase()]
      );
      console.log("Login lookup for:", email, "found:", res.rows);

      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      const user = res.rows[0];
      const isMatch = await verifyPassword(password, user.passwordHash);

      if (!isMatch) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      const sessionToken = await createSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role as "USER" | "ADMIN",
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return response;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
