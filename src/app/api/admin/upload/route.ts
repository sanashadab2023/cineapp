import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // If Vercel Blob is configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { put } = require("@vercel/blob");
        const blob = await put(`movies/${Date.now()}-${file.name}`, file, {
          access: "public",
        });
        return NextResponse.json({ success: true, url: blob.url });
      } catch (e: any) {
        console.warn("Vercel blob upload error:", e);
      }
    }

    // Fallback placeholder image URL or data URL
    return NextResponse.json({
      success: true,
      url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
