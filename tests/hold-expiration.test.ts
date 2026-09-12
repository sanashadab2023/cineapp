import { setupTestDb } from "./setup-test-db";
import { releaseExpiredHolds } from "../src/db/booking-engine";

export async function runHoldExpirationTest() {
  console.log("\n=======================================================");
  console.log("🧪 QA AGENT: SEAT HOLD EXPIRATION & CRON RELEASE TEST");
  console.log("=======================================================");

  const pool = await setupTestDb();
  const client = await pool.connect();

  try {
    const showtimeRes = await client.query(`SELECT id FROM showtimes LIMIT 1;`);
    const showtimeId = showtimeRes.rows[0].id;

    const userRes = await client.query(`SELECT id FROM users LIMIT 1;`);
    const userId = userRes.rows[0].id;

    const seatRes = await client.query(
      `SELECT seat_id FROM showtime_seats WHERE showtime_id = $1 AND status = 'AVAILABLE' LIMIT 1;`,
      [showtimeId]
    );
    const seatId = seatRes.rows[0].seat_id;

    // Artificially create an expired hold (15 minutes in the past)
    const expiredTimestamp = new Date(Date.now() - 15 * 60 * 1000);
    const bookingRef = `CB-TEST-EXP`;

    const bookingRes = await client.query(
      `
      INSERT INTO bookings (
        id, booking_reference, user_id, showtime_id, status,
        subtotal_cents, fee_cents, tax_cents, total_cents, expires_at,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'PENDING',
        1500, 150, 132, 1782, $4,
        $4, $4
      ) RETURNING id;
      `,
      [bookingRef, userId, showtimeId, expiredTimestamp]
    );
    const bookingId = bookingRes.rows[0].id;

    await client.query(
      `
      UPDATE showtime_seats
      SET status = 'HELD',
          held_by_user_id = $1,
          hold_expires_at = $2,
          booking_id = $3
      WHERE showtime_id = $4 AND seat_id = $5;
      `,
      [userId, expiredTimestamp, bookingId, showtimeId, seatId]
    );

    console.log(`⏳ Created expired hold for seat ${seatId} with expiration at ${expiredTimestamp.toISOString()}`);

    // Verify seat is currently HELD
    const checkHeld = await client.query(
      `SELECT status FROM showtime_seats WHERE showtime_id = $1 AND seat_id = $2;`,
      [showtimeId, seatId]
    );
    if (checkHeld.rows[0].status !== "HELD") {
      throw new Error("Failed to set up expired hold test state.");
    }

    // Execute hold release
    console.log("⚡ Executing releaseExpiredHolds()...");
    const releaseRes = await releaseExpiredHolds();
    console.log(`Release summary: ${releaseRes.releasedSeats} seats released, ${releaseRes.expiredBookings} bookings marked EXPIRED.`);

    // Verify seat is restored to AVAILABLE
    const checkAvailable = await client.query(
      `SELECT status, held_by_user_id, booking_id FROM showtime_seats WHERE showtime_id = $1 AND seat_id = $2;`,
      [showtimeId, seatId]
    );

    if (checkAvailable.rows[0].status !== "AVAILABLE") {
      throw new Error(`🚨 Expected seat status 'AVAILABLE', but found '${checkAvailable.rows[0].status}'`);
    }

    if (checkAvailable.rows[0].held_by_user_id !== null) {
      throw new Error(`🚨 Expected held_by_user_id to be cleared to null.`);
    }

    // Verify booking is marked EXPIRED
    const checkBooking = await client.query(
      `SELECT status FROM bookings WHERE id = $1;`,
      [bookingId]
    );
    if (checkBooking.rows[0].status !== "EXPIRED") {
      throw new Error(`🚨 Expected booking status 'EXPIRED', but found '${checkBooking.rows[0].status}'`);
    }

    // Test Idempotency: Second run should release 0 additional seats
    console.log("⚡ Testing idempotency with second run...");
    const secondRelease = await releaseExpiredHolds();
    if (secondRelease.releasedSeats !== 0) {
      throw new Error(`🚨 Idempotency failed: second release affected ${secondRelease.releasedSeats} seats.`);
    }

    console.log("✅ Hold expiration & idempotent release verification passed!");
    return true;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runHoldExpirationTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
