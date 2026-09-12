import { NextRequest, NextResponse } from "next/server";
import { getDb, poolInstance } from "@/db";
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    getDb();
    if (!poolInstance) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const client = await poolInstance.connect();

    try {
      const existing = await client.query(`SELECT id FROM users WHERE email = $1 LIMIT 1;`, [cleanEmail]);
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }

      const passwordHash = await hashPassword(password);

      const insertRes = await client.query(
        `
        INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'USER', NOW(), NOW())
        RETURNING id, name, email, role;
        `,
        [name.trim(), cleanEmail, passwordHash]
      );

      const user = insertRes.rows[0];

      const sessionToken = await createSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role as "USER" | "ADMIN",
      });

      const response = NextResponse.json({
        success: true,
        user,
      });

      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
