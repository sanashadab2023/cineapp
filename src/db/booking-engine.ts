import { poolInstance, getDb, ensureSeeded } from "./index";
import * as schema from "./schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

export interface HoldSeatsInput {
  showtimeId: string;
  seatIds: string[];
  userId: string;
  ipAddress?: string;
}

export interface ConfirmPaymentInput {
  bookingId: string;
  paymentIntentId: string;
  idempotencyKey: string;
  provider?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export interface CancelBookingInput {
  bookingId: string;
  userId: string;
  isAdmin?: boolean;
  ipAddress?: string;
}

// Generate unique booking reference: CB-YYYYMMDD-XXXX
export function generateBookingReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `CB-${dateStr}-${rand}`;
}

// Calculate server-side ticket pricing strictly in integer minor units (cents)
export function calculateSeatPrice(basePriceCents: number, tier: string): number {
  switch (tier.toUpperCase()) {
    case "VIP":
    case "RECLINER":
      return Math.round(basePriceCents * 1.4); // 40% VIP surcharge
    case "ACCESSIBLE":
    case "STANDARD":
    default:
      return basePriceCents;
  }
}

/**
 * 1. CONCURRENCY-SAFE SEAT HOLD & PENDING BOOKING TRANSACTION
 * Locks rows with FOR UPDATE, confirms availability, holds seats for 10 minutes,
 * calculates pricing strictly on the server, and creates a pending booking.
 */
export async function createSeatHoldAndBooking(input: HoldSeatsInput) {
  const { showtimeId, seatIds, userId, ipAddress } = input;

  if (!seatIds || seatIds.length === 0) {
    return { success: false, error: "No seats specified for booking." };
  }

  // Ensure pool exists
  getDb();
  await ensureSeeded();

  if (!poolInstance) {
    return { success: false, error: "Database connection unavailable." };
  }

  const client = await poolInstance.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock requested showtime-seat rows with FOR UPDATE
    const seatPlaceholders = seatIds.map((_, i) => `$${i + 2}`).join(", ");
    const queryText = `
      SELECT 
        ss.id as showtime_seat_id,
        ss.seat_id,
        ss.status,
        ss.hold_expires_at,
        ss.held_by_user_id,
        s.seat_tier,
        s.row_letter,
        s.seat_number,
        st.base_price_cents
      FROM showtime_seats ss
      JOIN seats s ON s.id = ss.seat_id
      JOIN showtimes st ON st.id = ss.showtime_id
      WHERE ss.showtime_id = $1 AND ss.seat_id IN (${seatPlaceholders})
      FOR UPDATE;
    `;

    const result = await client.query(queryText, [showtimeId, ...seatIds]);
    const foundSeats = result.rows;

    // Check if all requested seats exist in this showtime
    if (foundSeats.length !== seatIds.length) {
      console.log(`[Hold Debug] Requested ${seatIds.length} seats, found ${foundSeats.length} in showtime ${showtimeId}`);
      await client.query("ROLLBACK");
      return {
        success: false,
        code: "SEATS_NOT_FOUND",
        error: "One or more requested seats could not be found for this showtime.",
      };
    }

    const now = new Date();

    // 2. Confirm every requested seat is available or has an expired hold
    for (const seat of foundSeats) {
      const isAvailable = seat.status === "AVAILABLE";
      const isExpiredHold =
        seat.status === "HELD" &&
        seat.hold_expires_at &&
        new Date(seat.hold_expires_at) < now;
      const isOwnedHold =
        seat.status === "HELD" &&
        seat.held_by_user_id === userId &&
        seat.hold_expires_at &&
        new Date(seat.hold_expires_at) >= now;

      if (!isAvailable && !isExpiredHold && !isOwnedHold) {
        await client.query("ROLLBACK");
        return {
          success: false,
          code: "SEAT_UNAVAILABLE",
          error: `Seat ${seat.row_letter}${seat.seat_number} is no longer available.`,
        };
      }
    }

    // 3. Calculate price strictly on the server in integer cents
    let subtotalCents = 0;
    const itemPrices: { showtimeSeatId: string; seatId: string; priceCents: number }[] = [];

    for (const seat of foundSeats) {
      const price = calculateSeatPrice(seat.base_price_cents, seat.seat_tier);
      subtotalCents += price;
      itemPrices.push({
        showtimeSeatId: seat.showtime_seat_id,
        seatId: seat.seat_id,
        priceCents: price,
      });
    }

    const feeCents = foundSeats.length * 150; // $1.50 service fee per seat
    const taxCents = Math.round((subtotalCents + feeCents) * 0.08); // 8% tax
    const totalCents = subtotalCents + feeCents + taxCents;

    // 10 minutes hold expiration
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const bookingReference = generateBookingReference();

    // 4. Create the pending booking record
    const bookingInsertRes = await client.query(
      `
      INSERT INTO bookings (
        id, booking_reference, user_id, showtime_id, status,
        subtotal_cents, fee_cents, tax_cents, total_cents, expires_at,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'PENDING',
        $4, $5, $6, $7, $8,
        NOW(), NOW()
      ) RETURNING id, booking_reference, total_cents, expires_at;
      `,
      [
        bookingReference,
        userId,
        showtimeId,
        subtotalCents,
        feeCents,
        taxCents,
        totalCents,
        holdExpiresAt,
      ]
    );

    const booking = bookingInsertRes.rows[0];

    // 5. Update showtime_seats to HELD with hold_expires_at and booking_id
    // Atomic conditional check ensures concurrent race conditions cannot double-book
    const updatePlaceholders = seatIds.map((_, i) => `$${i + 5}`).join(", ");
    const updateRes = await client.query(
      `
      UPDATE showtime_seats
      SET status = 'HELD',
          held_by_user_id = $1,
          hold_expires_at = $2,
          booking_id = $3,
          version = version + 1,
          updated_at = NOW()
      WHERE showtime_id = $4 
        AND seat_id IN (${updatePlaceholders})
        AND (
          status = 'AVAILABLE' 
          OR (status = 'HELD' AND hold_expires_at < NOW())
          OR (status = 'HELD' AND held_by_user_id = $1)
        );
      `,
      [userId, holdExpiresAt, booking.id, showtimeId, ...seatIds]
    );

    if (updateRes.rowCount !== seatIds.length) {
      await client.query("ROLLBACK");
      return {
        success: false,
        code: "SEAT_UNAVAILABLE",
        error: "One or more selected seats were just reserved by another user.",
      };
    }

    // 6. Insert booking items
    for (const item of itemPrices) {
      await client.query(
        `
        INSERT INTO booking_items (
          id, booking_id, showtime_seat_id, seat_id, price_cents, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, NOW()
        );
        `,
        [booking.id, item.showtimeSeatId, item.seatId, item.priceCents]
      );
    }

    // 7. Insert audit log
    await client.query(
      `
      INSERT INTO audit_logs (
        id, user_id, action, entity_type, entity_id, details, ip_address, created_at
      ) VALUES (
        gen_random_uuid(), $1, 'SEAT_HOLD_CREATED', 'booking', $2, $3, $4, NOW()
      );
      `,
      [
        userId,
        booking.id,
        JSON.stringify({
          bookingReference: booking.booking_reference,
          seatsCount: seatIds.length,
          totalCents,
          expiresAt: holdExpiresAt,
        }),
        ipAddress || null,
      ]
    );

    // 8. Commit transaction
    await client.query("COMMIT");

    return {
      success: true,
      booking: {
        id: booking.id,
        bookingReference: booking.booking_reference,
        subtotalCents,
        feeCents,
        taxCents,
        totalCents,
        expiresAt: holdExpiresAt,
        seatsCount: seatIds.length,
      },
    };
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Seat hold error:", err);
    return {
      success: false,
      code: "TRANSACTION_ERROR",
      error: err.message || "Failed to reserve seats.",
    };
  } finally {
    client.release();
  }
}

/**
 * 2. CONFIRM BOOKING & IDEMPOTENT PAYMENT TRANSACTION
 * Validates payment idempotency key, confirms booking, sets seats to BOOKED,
 * and issues digital tickets with QR codes.
 */
export async function confirmBookingPayment(input: ConfirmPaymentInput) {
  const { bookingId, paymentIntentId, idempotencyKey, provider = "TEST", metadata, ipAddress } = input;

  getDb();
  if (!poolInstance) {
    return { success: false, error: "Database connection unavailable." };
  }

  const client = await poolInstance.connect();

  try {
    await client.query("BEGIN");

    // 1. Check idempotency: Has this payment idempotency key already been processed?
    const existingPayment = await client.query(
      `SELECT * FROM payments WHERE idempotency_key = $1`,
      [idempotencyKey]
    );

    if (existingPayment.rows.length > 0) {
      const payRecord = existingPayment.rows[0];
      // If already succeeded, return the confirmed booking and tickets idempotently
      const existingTickets = await client.query(
        `SELECT * FROM tickets WHERE booking_id = $1`,
        [payRecord.booking_id]
      );
      const bookingData = await client.query(
        `SELECT * FROM bookings WHERE id = $1`,
        [payRecord.booking_id]
      );

      await client.query("COMMIT");
      return {
        success: true,
        idempotent: true,
        booking: bookingData.rows[0],
        tickets: existingTickets.rows,
      };
    }

    // 2. Lock booking record FOR UPDATE
    const bookingRes = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, code: "BOOKING_NOT_FOUND", error: "Booking not found." };
    }

    const booking = bookingRes.rows[0];

    if (booking.status === "CONFIRMED") {
      const existingTickets = await client.query(
        `SELECT * FROM tickets WHERE booking_id = $1`,
        [booking.id]
      );
      await client.query("COMMIT");
      return { success: true, idempotent: true, booking, tickets: existingTickets.rows };
    }

    if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
      await client.query("ROLLBACK");
      return {
        success: false,
        code: "INVALID_BOOKING_STATUS",
        error: `Cannot complete payment: booking is ${booking.status}.`,
      };
    }

    // Check if hold has expired
    const now = new Date();
    if (booking.expires_at && new Date(booking.expires_at) < now) {
      // Mark as EXPIRED and release seats
      await client.query(`UPDATE bookings SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`, [booking.id]);
      await client.query(
        `UPDATE showtime_seats SET status = 'AVAILABLE', held_by_user_id = NULL, hold_expires_at = NULL, booking_id = NULL WHERE booking_id = $1`,
        [booking.id]
      );
      await client.query("COMMIT");
      return { success: false, code: "HOLD_EXPIRED", error: "Seat hold expired. Please reselect your seats." };
    }

    // 3. Create payment record
    await client.query(
      `
      INSERT INTO payments (
        id, booking_id, provider, payment_intent_id, idempotency_key,
        status, amount_cents, currency, metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        'SUCCEEDED', $5, 'USD', $6, NOW(), NOW()
      );
      `,
      [
        booking.id,
        provider,
        paymentIntentId || `pi_${crypto.randomBytes(12).toString("hex")}`,
        idempotencyKey,
        booking.total_cents,
        JSON.stringify(metadata || {}),
      ]
    );

    // 4. Update booking to CONFIRMED
    await client.query(
      `UPDATE bookings SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1`,
      [booking.id]
    );

    // 5. Update showtime_seats to BOOKED
    await client.query(
      `
      UPDATE showtime_seats
      SET status = 'BOOKED',
          hold_expires_at = NULL,
          updated_at = NOW()
      WHERE booking_id = $1;
      `,
      [booking.id]
    );

    // 6. Generate digital tickets
    const itemsRes = await client.query(
      `
      SELECT bi.id, bi.seat_id, s.row_letter, s.seat_number, s.seat_tier
      FROM booking_items bi
      JOIN seats s ON s.id = bi.seat_id
      WHERE bi.booking_id = $1;
      `,
      [booking.id]
    );

    const generatedTickets = [];
    for (const item of itemsRes.rows) {
      const ticketCode = `TCK-${booking.booking_reference}-${item.row_letter}${item.seat_number}`;
      const qrPayload = JSON.stringify({
        ref: booking.booking_reference,
        code: ticketCode,
        seat: `${item.row_letter}${item.seat_number}`,
        tier: item.seat_tier,
        user: booking.user_id,
        showtime: booking.showtime_id,
        issuedAt: new Date().toISOString(),
      });

      const ticketInsert = await client.query(
        `
        INSERT INTO tickets (
          id, ticket_code, booking_id, user_id, showtime_id,
          qr_code_data, is_used, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4,
          $5, false, NOW()
        ) RETURNING id, ticket_code as "ticketCode", booking_id as "bookingId",
                    user_id as "userId", showtime_id as "showtimeId",
                    qr_code_data as "qrCodeData", is_used as "isUsed", created_at as "createdAt";
        `,
        [ticketCode, booking.id, booking.user_id, booking.showtime_id, qrPayload]
      );

      generatedTickets.push(ticketInsert.rows[0]);
    }

    // 7. Log audit event
    await client.query(
      `
      INSERT INTO audit_logs (
        id, user_id, action, entity_type, entity_id, details, ip_address, created_at
      ) VALUES (
        gen_random_uuid(), $1, 'PAYMENT_CONFIRMED', 'booking', $2, $3, $4, NOW()
      );
      `,
      [
        booking.user_id,
        booking.id,
        JSON.stringify({
          amountCents: booking.total_cents,
          ticketsCount: generatedTickets.length,
          paymentIntentId,
        }),
        ipAddress || null,
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      booking: { ...booking, status: "CONFIRMED" },
      tickets: generatedTickets,
    };
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Payment confirmation error:", err);
    return {
      success: false,
      code: "CONFIRMATION_ERROR",
      error: err.message || "Failed to confirm booking payment.",
    };
  } finally {
    client.release();
  }
}

/**
 * 3. RELEASE EXPIRED SEAT HOLDS
 * Idempotent cleanup job suitable for Vercel Cron.
 * Releases all expired HELD seats and marks expired bookings as EXPIRED.
 */
export async function releaseExpiredHolds() {
  getDb();
  if (!poolInstance) {
    return { success: false, releasedSeats: 0, expiredBookings: 0 };
  }

  const client = await poolInstance.connect();

  try {
    await client.query("BEGIN");

    // 1. Mark pending bookings as EXPIRED where expires_at < NOW()
    const expireBookingsRes = await client.query(`
      UPDATE bookings
      SET status = 'EXPIRED',
          updated_at = NOW()
      WHERE status = 'PENDING' AND expires_at < NOW()
      RETURNING id;
    `);

    // 2. Release showtime_seats where status = 'HELD' and hold_expires_at < NOW()
    const releaseSeatsRes = await client.query(`
      UPDATE showtime_seats
      SET status = 'AVAILABLE',
          held_by_user_id = NULL,
          hold_expires_at = NULL,
          booking_id = NULL,
          updated_at = NOW()
      WHERE status = 'HELD' AND hold_expires_at < NOW()
      RETURNING id;
    `);

    await client.query("COMMIT");

    return {
      success: true,
      expiredBookings: expireBookingsRes.rowCount || 0,
      releasedSeats: releaseSeatsRes.rowCount || 0,
    };
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Hold release error:", err);
    return {
      success: false,
      error: err.message,
      releasedSeats: 0,
      expiredBookings: 0,
    };
  } finally {
    client.release();
  }
}

/**
 * 4. USER/ADMIN CANCEL BOOKING WITH SEAT RELEASE & REFUND
 */
export async function cancelBooking(input: CancelBookingInput) {
  const { bookingId, userId, isAdmin = false, ipAddress } = input;

  getDb();
  if (!poolInstance) {
    return { success: false, error: "Database connection unavailable." };
  }

  const client = await poolInstance.connect();

  try {
    await client.query("BEGIN");

    // Lock booking
    const bookingRes = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Booking not found." };
    }

    const booking = bookingRes.rows[0];

    // Authorization check: only owner or admin can cancel
    if (booking.user_id !== userId && !isAdmin) {
      await client.query("ROLLBACK");
      return { success: false, code: "UNAUTHORIZED", error: "Unauthorized to cancel this booking." };
    }

    if (booking.status !== "CONFIRMED") {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: `Booking cannot be cancelled because it is ${booking.status}.`,
      };
    }

    // Check showtime start time: must not have already passed
    const showtimeRes = await client.query(
      `SELECT start_time FROM showtimes WHERE id = $1`,
      [booking.showtime_id]
    );
    if (showtimeRes.rows.length > 0) {
      const startTime = new Date(showtimeRes.rows[0].start_time);
      if (startTime <= new Date()) {
        await client.query("ROLLBACK");
        return { success: false, error: "Cannot cancel a booking for a showtime that has already started." };
      }
    }

    // 1. Update booking to CANCELLED
    await client.query(
      `UPDATE bookings SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
      [bookingId]
    );

    // 2. Release seats back to AVAILABLE
    await client.query(
      `
      UPDATE showtime_seats
      SET status = 'AVAILABLE',
          held_by_user_id = NULL,
          hold_expires_at = NULL,
          booking_id = NULL,
          updated_at = NOW()
      WHERE booking_id = $1;
      `,
      [bookingId]
    );

    // 3. Mark payment as REFUNDED
    await client.query(
      `
      UPDATE payments
      SET status = 'REFUNDED',
          updated_at = NOW()
      WHERE booking_id = $1;
      `,
      [bookingId]
    );

    // 4. Invalidate tickets
    await client.query(
      `
      UPDATE tickets
      SET is_used = true,
          used_at = NOW()
      WHERE booking_id = $1;
      `,
      [bookingId]
    );

    // 5. Audit log
    await client.query(
      `
      INSERT INTO audit_logs (
        id, user_id, action, entity_type, entity_id, details, ip_address, created_at
      ) VALUES (
        gen_random_uuid(), $1, 'BOOKING_CANCELLED', 'booking', $2, $3, $4, NOW()
      );
      `,
      [
        userId,
        bookingId,
        JSON.stringify({
          cancelledBy: isAdmin ? "ADMIN" : "USER",
          refundedAmountCents: booking.total_cents,
        }),
        ipAddress || null,
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      booking: { ...booking, status: "CANCELLED" },
    };
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Cancellation error:", err);
    return { success: false, error: err.message || "Failed to cancel booking." };
  } finally {
    client.release();
  }
}
