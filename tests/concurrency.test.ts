import { setupTestDb } from "./setup-test-db";
import { createSeatHoldAndBooking } from "../src/db/booking-engine";

export async function runConcurrencyTest() {
  console.log("\n=======================================================");
  console.log("🧪 QA AGENT: CONCURRENT SEAT BOOKING RACE CONDITION TEST");
  console.log("=======================================================");

  const pool = await setupTestDb();
  const client = await pool.connect();

  try {
    // 1. Get a showtime and its available seats
    const showtimeRes = await client.query(`SELECT id FROM showtimes LIMIT 1;`);
    const showtimeId = showtimeRes.rows[0].id;

    const seatsRes = await client.query(
      `
      SELECT ss.seat_id, s.row_letter, s.seat_number
      FROM showtime_seats ss
      JOIN seats s ON s.id = ss.seat_id
      WHERE ss.showtime_id = $1 AND ss.status = 'AVAILABLE'
      LIMIT 1;
      `,
      [showtimeId]
    );

    const targetSeat = seatsRes.rows[0];
    const targetSeatId = targetSeat.seat_id;
    console.log(
      `🎯 Target Seat for Race Condition: Row ${targetSeat.row_letter} Seat ${targetSeat.seat_number} (ID: ${targetSeatId})`
    );

    // Get two different user IDs
    const usersRes = await client.query(`SELECT id, name FROM users LIMIT 2;`);
    const userA = usersRes.rows[0];
    const userB = usersRes.rows[1];

    console.log(`👤 User A: ${userA.name} (${userA.id})`);
    console.log(`👤 User B: ${userB.name} (${userB.id})`);

    // 2. Launch two simultaneous asynchronous hold requests for the EXACT SAME seat
    console.log("\n⚡ Triggering simultaneous concurrent seat hold requests...");

    const [resA, resB] = await Promise.all([
      createSeatHoldAndBooking({
        showtimeId,
        seatIds: [targetSeatId],
        userId: userA.id,
      }),
      createSeatHoldAndBooking({
        showtimeId,
        seatIds: [targetSeatId],
        userId: userB.id,
      }),
    ]);

    console.log(`User A Result: ${resA.success ? "✅ SUCCESS (Hold Acquired)" : "❌ REJECTED (" + resA.code + ")"}`);
    console.log(`User B Result: ${resB.success ? "✅ SUCCESS (Hold Acquired)" : "❌ REJECTED (" + resB.code + ")"}`);

    // Assert that exactly one succeeded and one failed
    const oneSucceeded = (resA.success && !resB.success) || (!resA.success && resB.success);
    if (!oneSucceeded) {
      throw new Error(
        `🚨 RACE CONDITION FAILURE: Expected exactly one request to succeed, but got resA=${resA.success}, resB=${resB.success}`
      );
    }

    const failedResult = resA.success ? resB : resA;
    if (failedResult.code !== "SEAT_UNAVAILABLE") {
      throw new Error(
        `🚨 Expected rejection code 'SEAT_UNAVAILABLE', but got '${failedResult.code}'`
      );
    }

    // 3. Verify Database Integrity: Exactly one HELD record for this seat
    const seatVerifyRes = await client.query(
      `
      SELECT status, held_by_user_id, booking_id
      FROM showtime_seats
      WHERE showtime_id = $1 AND seat_id = $2;
      `,
      [showtimeId, targetSeatId]
    );

    const dbSeat = seatVerifyRes.rows[0];
    if (dbSeat.status !== "HELD") {
      throw new Error(`🚨 Expected database seat status 'HELD', but found '${dbSeat.status}'`);
    }

    const winnerUserId = resA.success ? userA.id : userB.id;
    if (dbSeat.held_by_user_id !== winnerUserId) {
      throw new Error(`🚨 Database held_by_user_id mismatch!`);
    }

    console.log("✅ Concurrency verification passed: Exactly one booking succeeded, and the second was locked out safely!");
    return true;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runConcurrencyTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
