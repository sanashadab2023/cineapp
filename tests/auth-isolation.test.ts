import { setupTestDb } from "./setup-test-db";
import { createSeatHoldAndBooking, confirmBookingPayment, cancelBooking } from "../src/db/booking-engine";
import { hashPassword, verifyPassword } from "../src/lib/auth";

export async function runAuthIsolationTest() {
  console.log("\n=======================================================");
  console.log("🧪 QA AGENT: AUTH BOUNDARY & USER ISOLATION TEST");
  console.log("=======================================================");

  const pool = await setupTestDb();
  const client = await pool.connect();

  try {
    // 1. Verify bcrypt password hashing security
    const password = "SuperSecretPassword123!";
    const hashed = await hashPassword(password);
    const validMatch = await verifyPassword(password, hashed);
    const invalidMatch = await verifyPassword("WrongPassword!", hashed);

    if (!validMatch || invalidMatch) {
      throw new Error("🚨 Password hashing verification failed!");
    }
    console.log("✅ Password hashing and verification working securely.");

    // 2. Fetch User A (regular user) and User B (another user)
    const usersRes = await client.query(`SELECT id, name, role FROM users;`);
    const adminUser = usersRes.rows.find((u) => u.role === "ADMIN");
    const regularUserA = usersRes.rows.find((u) => u.role === "USER");

    // Insert User B
    const userBRes = await client.query(
      `
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Attacker / Imposter', 'imposter@test.com', $1, 'USER', NOW(), NOW())
      RETURNING id, name, role;
      `,
      [hashed]
    );
    const userB = userBRes.rows[0];

    console.log(`👤 Legitimate Owner: ${regularUserA.name} (${regularUserA.id})`);
    console.log(`👤 Imposter / Unauthorized User: ${userB.name} (${userB.id})`);

    // 3. User A creates and confirms a booking
    const showtimeRes = await client.query(`SELECT id FROM showtimes LIMIT 1;`);
    const showtimeId = showtimeRes.rows[0].id;

    const seatRes = await client.query(
      `SELECT seat_id FROM showtime_seats WHERE showtime_id = $1 AND status = 'AVAILABLE' LIMIT 1;`,
      [showtimeId]
    );
    const seatId = seatRes.rows[0].seat_id;

    const holdRes = await createSeatHoldAndBooking({
      showtimeId,
      seatIds: [seatId],
      userId: regularUserA.id,
    });

    const bookingId = holdRes.booking!.id;

    await confirmBookingPayment({
      bookingId,
      paymentIntentId: `pi_owner_${Date.now()}`,
      idempotencyKey: `idem_owner_${Date.now()}`,
    });

    console.log(`🎟️ Legitimate booking confirmed for User A (${bookingId})`);

    // 4. Test Attack: User B attempts to cancel User A's booking
    console.log("⚡ User B attempting to cancel User A's booking...");
    const attackCancel = await cancelBooking({
      bookingId,
      userId: userB.id,
      isAdmin: false,
    });

    if (attackCancel.success) {
      throw new Error("🚨 SECURITY BREACH: Unauthorized User B was able to cancel User A's booking!");
    }

    if (attackCancel.code !== "UNAUTHORIZED") {
      throw new Error(`🚨 Expected UNAUTHORIZED code, but got: ${attackCancel.code}`);
    }

    console.log("✅ Security boundary intact: User B was denied with UNAUTHORIZED error.");

    // 5. Test Admin Override: Admin user can legitimately cancel
    console.log("⚡ Admin attempting authorized cancellation...");
    const adminCancel = await cancelBooking({
      bookingId,
      userId: adminUser.id,
      isAdmin: true,
    });

    if (!adminCancel.success) {
      throw new Error(`Admin cancellation failed: ${adminCancel.error}`);
    }

    console.log("✅ Admin privilege verified: Admin successfully cancelled and refunded booking.");
    return true;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runAuthIsolationTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
