import { setupTestDb } from "./setup-test-db";
import { createSeatHoldAndBooking, confirmBookingPayment } from "../src/db/booking-engine";

export async function runPaymentIdempotencyTest() {
  console.log("\n=======================================================");
  console.log("🧪 QA AGENT: PAYMENT IDEMPOTENCY & DUPLICATE RETRY TEST");
  console.log("=======================================================");

  const pool = await setupTestDb();
  const client = await pool.connect();

  try {
    const showtimeRes = await client.query(`SELECT id FROM showtimes LIMIT 1;`);
    const showtimeId = showtimeRes.rows[0].id;

    const userRes = await client.query(`SELECT id FROM users LIMIT 1;`);
    const userId = userRes.rows[0].id;

    const seatRes = await client.query(
      `SELECT seat_id FROM showtime_seats WHERE showtime_id = $1 AND status = 'AVAILABLE' LIMIT 2;`,
      [showtimeId]
    );
    const seatIds = seatRes.rows.map((r) => r.seat_id);

    // 1. Create seat hold
    const holdRes = await createSeatHoldAndBooking({
      showtimeId,
      seatIds,
      userId,
    });

    if (!holdRes.success || !holdRes.booking) {
      throw new Error("Failed to create seat hold for idempotency test.");
    }

    const bookingId = holdRes.booking.id;
    const idempotencyKey = `idem_key_test_${Date.now()}`;
    const paymentIntentId = `pi_test_${Date.now()}`;

    console.log(`📦 Created Pending Booking: ${holdRes.booking.bookingReference}`);
    console.log(`🔑 Using Payment Idempotency Key: ${idempotencyKey}`);

    // 2. First Payment Confirmation Attempt
    console.log("⚡ Submitting first payment confirmation...");
    const firstPay = await confirmBookingPayment({
      bookingId,
      paymentIntentId,
      idempotencyKey,
      provider: "STRIPE",
    });

    if (!firstPay.success) {
      throw new Error(`First payment failed: ${firstPay.error}`);
    }
    console.log("✅ First payment succeeded. Tickets issued:", firstPay.tickets?.length);

    // 3. Second Payment Confirmation Attempt (Simulating Retry / Webhook Duplicate)
    console.log("⚡ Submitting duplicate payment request with IDENTICAL idempotency key...");
    const secondPay = await confirmBookingPayment({
      bookingId,
      paymentIntentId,
      idempotencyKey,
      provider: "STRIPE",
    });

    if (!secondPay.success) {
      throw new Error(`Duplicate payment attempt failed: ${secondPay.error}`);
    }

    if (!secondPay.idempotent) {
      throw new Error("🚨 Expected response to flag idempotent: true on duplicate submission!");
    }

    // 4. Assert Database State: Only 1 payment record and exact ticket count
    const paymentCount = await client.query(
      `SELECT COUNT(*) as count FROM payments WHERE booking_id = $1;`,
      [bookingId]
    );
    if (parseInt(paymentCount.rows[0].count, 10) !== 1) {
      throw new Error(
        `🚨 Duplicate payments inserted! Expected 1, found ${paymentCount.rows[0].count}`
      );
    }

    const ticketCount = await client.query(
      `SELECT COUNT(*) as count FROM tickets WHERE booking_id = $1;`,
      [bookingId]
    );
    if (parseInt(ticketCount.rows[0].count, 10) !== seatIds.length) {
      throw new Error(
        `🚨 Duplicate tickets issued! Expected ${seatIds.length}, found ${ticketCount.rows[0].count}`
      );
    }

    console.log("✅ Payment idempotency verification passed: Zero duplicate charges or duplicate tickets!");
    return true;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runPaymentIdempotencyTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
