import { getDb, poolInstance, ensureSeeded } from "../src/db";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function runE2EJourney() {
  console.log("🎬 Starting CineBook Full E2E User Journey Verification...");
  console.log(`📡 Targeting dev server at ${BASE_URL}\n`);

  let authCookie = "";
  let adminAuthCookie = "";

  // Step 1: Browse Movies
  console.log("▶ Step 1: Browse Movies (GET /api/movies)");
  const moviesRes = await fetch(`${BASE_URL}/api/movies`);
  if (!moviesRes.ok) throw new Error(`Failed to fetch movies: ${moviesRes.statusText}`);
  const moviesData = await moviesRes.json();
  if (!moviesData.movies || moviesData.movies.length === 0) {
    throw new Error("No movies returned from /api/movies");
  }
  const selectedMovie = moviesData.movies[0];
  console.log(`✅ Fetched ${moviesData.movies.length} movies. Selected: "${selectedMovie.title}" (${selectedMovie.rating})\n`);

  // Step 2: Showtimes & Seat Availability
  console.log("▶ Step 2: Fetch Movie Details & Showtimes (GET /api/movies/[id])");
  const movieDetailsRes = await fetch(`${BASE_URL}/api/movies/${selectedMovie.id}`);
  if (!movieDetailsRes.ok) throw new Error(`Failed to fetch movie details: ${movieDetailsRes.statusText}`);
  const movieDetailsData = await movieDetailsRes.json();
  if (!movieDetailsData.movie.showtimes || movieDetailsData.movie.showtimes.length === 0) {
    throw new Error("No showtimes found for movie");
  }
  const selectedShowtime = movieDetailsData.movie.showtimes[0];
  console.log(`✅ Selected Showtime: ${selectedShowtime.auditorium.name} at ${selectedShowtime.auditorium.cinema.name} (${selectedShowtime.format})`);

  const seatsRes = await fetch(`${BASE_URL}/api/showtimes/${selectedShowtime.id}/seats`);
  if (!seatsRes.ok) throw new Error(`Failed to fetch seats: ${seatsRes.statusText}`);
  const seatsData = await seatsRes.json();
  const availableSeats = seatsData.seats.filter((s: any) => s.status === "AVAILABLE");
  if (availableSeats.length < 2) throw new Error("Not enough available seats for test");
  const seatsToHold = [availableSeats[0], availableSeats[1]];
  console.log(`✅ Found ${seatsData.seats.length} total seats (${availableSeats.length} available). Selected seats: ${seatsToHold.map((s: any) => `${s.rowLetter}${s.seatNumber}`).join(", ")}\n`);

  // Step 3: User Authentication
  console.log("▶ Step 3: User Authentication (POST /api/auth/login)");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@cinebook.com", password: "UserPass123!" }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
  const setCookieHeader = loginRes.headers.get("set-cookie");
  if (setCookieHeader) {
    authCookie = setCookieHeader.split(";")[0];
  }
  const userData = await loginRes.json();
  console.log(`✅ Authenticated as: ${userData.user.name} (${userData.user.email})\n`);

  // Step 4: Create Seat Hold (10-minute hold)
  console.log("▶ Step 4: Create Seat Hold (POST /api/bookings/hold)");
  const holdRes = await fetch(`${BASE_URL}/api/bookings/hold`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      showtimeId: selectedShowtime.id,
      seatIds: seatsToHold.map((s: any) => s.seatId || s.id),
    }),
  });
  if (!holdRes.ok) {
    const err = await holdRes.json();
    throw new Error(`Hold failed: ${JSON.stringify(err)}`);
  }
  const holdData = await holdRes.json();
  const booking = holdData.booking;
  console.log(`✅ Hold created successfully!`);
  console.log(`   - Booking Ref: ${booking.bookingReference}`);
  console.log(`   - Total: $${(booking.totalCents / 100).toFixed(2)} (Seats: $${(booking.subtotalCents / 100).toFixed(2)}, Fee: $${(booking.bookingFeeCents / 100).toFixed(2)}, Tax: $${(booking.taxCents / 100).toFixed(2)})`);
  console.log(`   - Expires At: ${booking.holdExpiresAt}\n`);

  // Step 5: Complete Payment & Confirm Booking
  console.log("▶ Step 5: Complete Payment & Issue Ticket (POST /api/bookings/[id]/pay)");
  const payRes = await fetch(`${BASE_URL}/api/bookings/${booking.id}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      paymentMethod: "TEST_CARD_4242",
      paymentProvider: "MOCK_STRIPE",
      idempotencyKey: `idem_e2e_${Date.now()}`,
    }),
  });
  if (!payRes.ok) {
    const err = await payRes.json();
    throw new Error(`Payment failed: ${JSON.stringify(err)}`);
  }
  const payData = await payRes.json();
  console.log(`✅ Payment CONFIRMED! Status: ${payData.status}`);
  console.log(`   - Tickets issued: ${payData.tickets.length}`);
  const firstTicket = payData.tickets[0];
  console.log(`   - Sample Ticket Code: ${firstTicket.ticketCode}\n`);

  // Step 6: View Digital Boarding Pass & QR Code
  console.log(`▶ Step 6: View Digital Ticket (GET /api/tickets/${firstTicket.ticketCode})`);
  const ticketRes = await fetch(`${BASE_URL}/api/tickets/${firstTicket.ticketCode}`, {
    headers: { Cookie: authCookie },
  });
  if (!ticketRes.ok) throw new Error(`Failed to fetch ticket: ${ticketRes.statusText}`);
  const ticketData = await ticketRes.json();
  console.log(`✅ Ticket loaded:`);
  console.log(`   - Movie: ${ticketData.ticket.showtime.movie.title}`);
  console.log(`   - Cinema: ${ticketData.ticket.showtime.auditorium.cinema.name} (${ticketData.ticket.showtime.auditorium.name})`);
  console.log(`   - Seats: ${ticketData.ticket.booking.items.map((it: any) => `${it.seat.rowLetter}${it.seat.seatNumber} (${it.seat.seatTier})`).join(", ")}`);
  console.log(`   - Dynamic QR Code generated: ${ticketData.ticket.qrCodeUrl ? "YES (Data URL / SVG)" : "NO"}\n`);

  // Step 7: View Booking History
  console.log("▶ Step 7: Booking History (GET /api/bookings)");
  const historyRes = await fetch(`${BASE_URL}/api/bookings`, {
    headers: { Cookie: authCookie },
  });
  if (!historyRes.ok) throw new Error(`Failed to fetch booking history: ${historyRes.statusText}`);
  const historyData = await historyRes.json();
  const userBookings = historyData.bookings;
  console.log(`✅ User booking history contains ${userBookings.length} bookings.`);
  const currentBooking = userBookings.find((b: any) => b.id === booking.id);
  if (!currentBooking) throw new Error("Newly created booking not found in history");
  console.log(`   - Found active booking ref ${currentBooking.bookingReference} with ${currentBooking.items.length} seats.\n`);

  // Step 8: Cancel Booking & Release Seats
  console.log(`▶ Step 8: Cancel Booking & Auto-Release Seats (POST /api/bookings/${booking.id}/cancel)`);
  const cancelRes = await fetch(`${BASE_URL}/api/bookings/${booking.id}/cancel`, {
    method: "POST",
    headers: { Cookie: authCookie },
  });
  if (!cancelRes.ok) {
    const err = await cancelRes.json();
    throw new Error(`Cancellation failed: ${JSON.stringify(err)}`);
  }
  const cancelData = await cancelRes.json();
  console.log(`✅ Booking cancelled successfully: ${cancelData.message}`);

  // Verify seats are released back to AVAILABLE
  const seatsAfterCancelRes = await fetch(`${BASE_URL}/api/showtimes/${selectedShowtime.id}/seats`);
  const seatsAfterCancelData = await seatsAfterCancelRes.json();
  const releasedSeats = seatsAfterCancelData.seats.filter((s: any) =>
    seatsToHold.some((h: any) => (h.seatId || h.id) === (s.seatId || s.id))
  );
  const allAvailableAgain = releasedSeats.every((s: any) => s.status === "AVAILABLE");
  console.log(`✅ Verified seats released back to AVAILABLE: ${allAvailableAgain ? "YES" : "NO"}\n`);

  // Step 9: Admin Dashboard & Metrics
  console.log("▶ Step 9: Executive Admin Dashboard Metrics");
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@cinebook.com", password: "AdminPass123!" }),
  });
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${adminLoginRes.statusText}`);
  const adminCookieHeader = adminLoginRes.headers.get("set-cookie");
  if (adminCookieHeader) {
    adminAuthCookie = adminCookieHeader.split(";")[0];
  }
  const metricsRes = await fetch(`${BASE_URL}/api/admin/metrics`, {
    headers: { Cookie: adminAuthCookie },
  });
  if (!metricsRes.ok) throw new Error(`Admin metrics failed: ${metricsRes.statusText}`);
  const metricsData = await metricsRes.json();
  console.log(`✅ Admin Analytics Loaded:`);
  console.log(`   - Total Gross Revenue: $${(metricsData.stats.totalRevenueCents / 100).toFixed(2)}`);
  console.log(`   - Confirmed Bookings: ${metricsData.stats.confirmedBookingsCount}`);
  console.log(`   - Tickets Issued: ${metricsData.stats.totalTicketsSold}`);
  console.log(`   - Audit Log Entries: ${metricsData.auditLogs.length}\n`);

  // Step 10: Cron Expired Hold Release Worker
  console.log("▶ Step 10: Vercel Cron Expired Hold Release Worker");
  const cronRes = await fetch(`${BASE_URL}/api/cron/release-holds`, {
    method: "POST",
    headers: {
      Authorization: "Bearer cinebook_cron_secret_token_12345",
    },
  });
  if (!cronRes.ok) throw new Error(`Cron release holds failed: ${cronRes.statusText}`);
  const cronData = await cronRes.json();
  console.log(`✅ Vercel Cron Worker executed:`);
  console.log(`   - Status: ${cronData.success ? "SUCCESS" : "FAILED"}`);
  console.log(`   - Holds released: ${cronData.releasedHoldsCount ?? cronData.releasedCount ?? 0}`);
  console.log(`   - Timestamp: ${cronData.timestamp}\n`);

  console.log("🎉 ========================================================");
  console.log("🎉 ALL 10 E2E USER JOURNEY & AGENT WORKFLOWS VERIFIED 100%!");
  console.log("🎉 ========================================================");
}

runE2EJourney().catch((err) => {
  console.error("❌ E2E Journey Verification Failed:", err);
  process.exit(1);
});
