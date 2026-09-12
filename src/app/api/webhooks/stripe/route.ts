import { NextRequest, NextResponse } from "next/server";
import { confirmBookingPayment } from "@/db/booking-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    // If Stripe secret is configured, verify signature; otherwise parse test JSON
    if (webhookSecret && signature && !webhookSecret.includes("mock")) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Stripe = require("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err: any) {
        console.error("⚠️ Stripe webhook signature verification failed:", err.message);
        return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
      }
    } else {
      // Test mode / simulator parsing
      try {
        event = JSON.parse(rawBody);
      } catch (e) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data?.object || event.data;
      const bookingId = paymentIntent.metadata?.bookingId;
      const idempotencyKey = paymentIntent.metadata?.idempotencyKey || paymentIntent.id;

      if (bookingId && idempotencyKey) {
        await confirmBookingPayment({
          bookingId,
          paymentIntentId: paymentIntent.id,
          idempotencyKey,
          provider: "STRIPE",
          metadata: paymentIntent.metadata,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
