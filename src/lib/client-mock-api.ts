"use client";

// Client-side Mock Engine for GitHub Pages (Static Hosting)
// Provides in-browser persistence (localStorage) for bookings, holds, tickets, and analytics
// when running on GitHub Pages where no Node.js backend is present.

const SAMPLE_MOVIES = [
  {
    id: "dune-part-two",
    title: "Dune: Part Two",
    slug: "dune-part-two",
    description:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future.",
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80",
    durationMins: 166,
    rating: "PG-13",
    releaseDate: "2024-03-01",
    language: "English",
    trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
    director: "Denis Villeneuve",
    cast: "Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem",
    isFeatured: true,
    movieGenres: [{ genre: { id: "1", name: "Sci-Fi" } }, { genre: { id: "2", name: "Adventure" } }],
    showtimes: [
      {
        id: "st-dune-1",
        startTime: new Date(Date.now() + 3600000 * 3).toISOString(),
        endTime: new Date(Date.now() + 3600000 * 6).toISOString(),
        basePriceCents: 2200,
        format: "IMAX",
        auditorium: {
          id: "aud-1",
          name: "Screen 1 - Grand IMAX Laser",
          cinemaId: "cin-1",
          cinema: { id: "cin-1", name: "CineBook Grand IMAX & Dolby Cinema", city: "New York", address: "700 Broadway, Manhattan" },
        },
      },
      {
        id: "st-dune-2",
        startTime: new Date(Date.now() + 3600000 * 7).toISOString(),
        endTime: new Date(Date.now() + 3600000 * 10).toISOString(),
        basePriceCents: 1850,
        format: "3D",
        auditorium: {
          id: "aud-2",
          name: "Screen 2 - Dolby Cinema Prime",
          cinemaId: "cin-1",
          cinema: { id: "cin-1", name: "CineBook Grand IMAX & Dolby Cinema", city: "New York", address: "700 Broadway, Manhattan" },
        },
      },
    ],
  },
  {
    id: "oppenheimer",
    title: "Oppenheimer",
    slug: "oppenheimer",
    description:
      "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II, exploring the moral and geopolitical aftermath of the Manhattan Project.",
    posterUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    durationMins: 180,
    rating: "R",
    releaseDate: "2023-07-21",
    language: "English",
    trailerUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg",
    director: "Christopher Nolan",
    cast: "Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr.",
    isFeatured: true,
    movieGenres: [{ genre: { id: "3", name: "Drama" } }, { genre: { id: "4", name: "Thriller" } }],
    showtimes: [
      {
        id: "st-opp-1",
        startTime: new Date(Date.now() + 3600000 * 4).toISOString(),
        endTime: new Date(Date.now() + 3600000 * 7).toISOString(),
        basePriceCents: 2200,
        format: "IMAX",
        auditorium: {
          id: "aud-1",
          name: "Screen 1 - Grand IMAX Laser",
          cinemaId: "cin-1",
          cinema: { id: "cin-1", name: "CineBook Grand IMAX & Dolby Cinema", city: "New York", address: "700 Broadway, Manhattan" },
        },
      },
    ],
  },
  {
    id: "interstellar-imax",
    title: "Interstellar: 10th Anniversary IMAX",
    slug: "interstellar-imax",
    description:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival as Earth faces catastrophic blight and environmental collapse.",
    posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80",
    durationMins: 169,
    rating: "PG-13",
    releaseDate: "2024-11-07",
    language: "English",
    trailerUrl: "https://www.youtube.com/watch?v=zSWdZVtXT7E",
    director: "Christopher Nolan",
    cast: "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
    isFeatured: true,
    movieGenres: [{ genre: { id: "1", name: "Sci-Fi" } }, { genre: { id: "3", name: "Drama" } }],
    showtimes: [
      {
        id: "st-int-1",
        startTime: new Date(Date.now() + 3600000 * 5).toISOString(),
        endTime: new Date(Date.now() + 3600000 * 8).toISOString(),
        basePriceCents: 2200,
        format: "IMAX",
        auditorium: {
          id: "aud-1",
          name: "Screen 1 - Grand IMAX Laser",
          cinemaId: "cin-1",
          cinema: { id: "cin-1", name: "CineBook Grand IMAX & Dolby Cinema", city: "New York", address: "700 Broadway, Manhattan" },
        },
      },
    ],
  },
  {
    id: "cyber-odyssey-2099",
    title: "Cyber Odyssey: 2099",
    slug: "cyber-odyssey-2099",
    description:
      "In a neon-drenched megacity controlled by synthetic intelligence, a rogue neural detective uncovers a conspiracy that threatens both organic and digital consciousness.",
    posterUrl: "https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=800&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&auto=format&fit=crop&q=80",
    durationMins: 135,
    rating: "R",
    releaseDate: "2025-01-15",
    language: "English",
    trailerUrl: "https://www.youtube.com/watch?v=dummy",
    director: "Karin Takahashi",
    cast: "Kenji Sato, Elena Rostova, Marcus Cole",
    isFeatured: false,
    movieGenres: [{ genre: { id: "1", name: "Sci-Fi" } }, { genre: { id: "5", name: "Action" } }],
    showtimes: [
      {
        id: "st-cyb-1",
        startTime: new Date(Date.now() + 3600000 * 6).toISOString(),
        endTime: new Date(Date.now() + 3600000 * 8.5).toISOString(),
        basePriceCents: 1850,
        format: "3D",
        auditorium: {
          id: "aud-3",
          name: "Auditorium A - Recliner Suite",
          cinemaId: "cin-2",
          cinema: { id: "cin-2", name: "Starlight Luxury Cinema Lounge", city: "Los Angeles", address: "8500 Sunset Blvd, West Hollywood" },
        },
      },
    ],
  },
  {
    id: "neon-tokyo-shadow-syndicate",
    title: "Neon Tokyo: Shadow Syndicate",
    slug: "neon-tokyo-shadow-syndicate",
    description:
      "Underground racing crews and corporate syndicates clash over quantum encryption hardware in high-octane night pursuits across subterranean Tokyo.",
    posterUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1600&auto=format&fit=crop&q=80",
    durationMins: 122,
    rating: "PG-13",
    releaseDate: "2025-02-20",
    language: "Japanese",
    trailerUrl: "https://www.youtube.com/watch?v=dummy",
    director: "Hideo Kojima",
    cast: "Takumi Minamino, Sakura Haruno, Jin Sakai",
    isFeatured: false,
    movieGenres: [{ genre: { id: "5", name: "Action" } }, { genre: { id: "6", name: "Crime" } }],
    showtimes: [
      {
        id: "st-tokyo-1",
        startTime: new Date(Date.now() + 3600000 * 7).toISOString(),
        endTime: new Date(Date.now() + 3600000 * 9.5).toISOString(),
        basePriceCents: 1500,
        format: "STANDARD_2D",
        auditorium: {
          id: "aud-4",
          name: "Screen 1 - Velvet Dining Hall",
          cinemaId: "cin-3",
          cinema: { id: "cin-3", name: "Lumina Boutique Cinema & Grill", city: "Chicago", address: "325 W Huron St, River North" },
        },
      },
    ],
  },
  {
    id: "the-dark-knight",
    title: "The Dark Knight",
    slug: "the-dark-knight",
    description:
      "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    posterUrl: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=800&auto=format&fit=crop&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600&auto=format&fit=crop&q=80",
    durationMins: 152,
    rating: "PG-13",
    releaseDate: "2008-07-18",
    language: "English",
    trailerUrl: "https://www.youtube.com/watch?v=EXeTwQWrcwY",
    director: "Christopher Nolan",
    cast: "Christian Bale, Heath Ledger, Aaron Eckhart, Michael Caine",
    isFeatured: true,
    movieGenres: [{ genre: { id: "5", name: "Action" } }, { genre: { id: "6", name: "Crime" } }],
    showtimes: [
      {
        id: "st-dk-1",
        startTime: new Date(Date.now() + 3600000 * 8).toISOString(),
        endTime: new Date(Date.now() + 3600000 * 11).toISOString(),
        basePriceCents: 2200,
        format: "IMAX",
        auditorium: {
          id: "aud-1",
          name: "Screen 1 - Grand IMAX Laser",
          cinemaId: "cin-1",
          cinema: { id: "cin-1", name: "CineBook Grand IMAX & Dolby Cinema", city: "New York", address: "700 Broadway, Manhattan" },
        },
      },
    ],
  },
];

const SAMPLE_CINEMAS = [
  {
    id: "cin-1",
    name: "CineBook Grand IMAX & Dolby Cinema",
    slug: "cinebook-grand-imax-ny",
    address: "700 Broadway, Manhattan",
    city: "New York",
    state: "NY",
    postalCode: "10003",
    phone: "+1 212-555-0199",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
    screens: [
      { id: "aud-1", name: "Screen 1 - Grand IMAX Laser", sound: "IMAX 12-Channel Audio", totalSeats: 54 },
      { id: "aud-2", name: "Screen 2 - Dolby Cinema Prime", sound: "Dolby Atmos", totalSeats: 54 },
    ],
  },
  {
    id: "cin-2",
    name: "Starlight Luxury Cinema Lounge",
    slug: "starlight-luxury-lounge-la",
    address: "8500 Sunset Blvd, West Hollywood",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90069",
    phone: "+1 310-555-0144",
    imageUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
    screens: [
      { id: "aud-3", name: "Auditorium A - Recliner Suite", sound: "Dolby 7.1 Surround", totalSeats: 54 },
    ],
  },
  {
    id: "cin-3",
    name: "Lumina Boutique Cinema & Grill",
    slug: "lumina-boutique-grill-chicago",
    address: "325 W Huron St, River North",
    city: "Chicago",
    state: "IL",
    postalCode: "60654",
    phone: "+1 312-555-0188",
    imageUrl: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=800&auto=format&fit=crop&q=80",
    screens: [
      { id: "aud-4", name: "Screen 1 - Velvet Dining Hall", sound: "Dolby Atmos", totalSeats: 54 },
    ],
  },
];

function generate54Seats(showtimeId: string) {
  const rows = ["A", "B", "C", "D", "E", "F"];
  const seats: any[] = [];
  const bookedSeats = JSON.parse(localStorage.getItem(`cine_booked_${showtimeId}`) || "[]");
  const heldSeats = JSON.parse(localStorage.getItem(`cine_held_${showtimeId}`) || "[]");
  const now = Date.now();

  rows.forEach((rowLetter) => {
    for (let num = 1; num <= 9; num++) {
      const seatId = `${rowLetter}${num}`;
      let tier = "STANDARD";
      let priceCents = 1850;

      if (rowLetter === "A") {
        tier = num === 1 || num === 9 ? "ACCESSIBLE" : "STANDARD";
        priceCents = 1500;
      } else if (rowLetter === "E" || rowLetter === "F") {
        tier = "VIP_RECLINER";
        priceCents = 2400;
      }

      let status = "AVAILABLE";
      if (bookedSeats.includes(seatId)) {
        status = "BOOKED";
      } else {
        const hold = heldSeats.find((h: any) => h.seatId === seatId && h.expiresAt > now);
        if (hold) {
          status = "HELD";
        }
      }

      seats.push({
        seatId: `seat-${showtimeId}-${seatId}`,
        showtimeSeatId: `ss-${showtimeId}-${seatId}`,
        rowLetter,
        seatNumber: num,
        tier,
        status,
        priceCents,
      });
    }
  });

  return seats;
}

// Generate simple SVG QR Code data URL in browser
function generateQrSvgDataUrl(text: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
    <rect width="100" height="100" fill="#FFFFFF"/>
    <!-- Corner markers -->
    <rect x="10" y="10" width="25" height="25" fill="#06080D"/>
    <rect x="15" y="15" width="15" height="15" fill="#FFFFFF"/>
    <rect x="18" y="18" width="9" height="9" fill="#06080D"/>

    <rect x="65" y="10" width="25" height="25" fill="#06080D"/>
    <rect x="70" y="15" width="15" height="15" fill="#FFFFFF"/>
    <rect x="73" y="18" width="9" height="9" fill="#06080D"/>

    <rect x="10" y="65" width="25" height="25" fill="#06080D"/>
    <rect x="15" y="70" width="15" height="15" fill="#FFFFFF"/>
    <rect x="18" y="73" width="9" height="9" fill="#06080D"/>

    <!-- Data matrix pixels -->
    <rect x="42" y="15" width="6" height="6" fill="#06080D"/>
    <rect x="52" y="25" width="6" height="6" fill="#06080D"/>
    <rect x="40" y="40" width="8" height="8" fill="#F59E0B"/>
    <rect x="52" y="40" width="8" height="8" fill="#06080D"/>
    <rect x="25" y="45" width="6" height="6" fill="#06080D"/>
    <rect x="70" y="45" width="6" height="6" fill="#06080D"/>
    <rect x="42" y="60" width="6" height="6" fill="#06080D"/>
    <rect x="55" y="65" width="6" height="6" fill="#06080D"/>
    <rect x="70" y="75" width="6" height="6" fill="#06080D"/>
    <rect x="80" y="65" width="6" height="6" fill="#06080D"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function initClientMockInterceptor() {
  if (typeof window === "undefined") return;

  const isGitHubPages =
    window.location.hostname.includes("github.io") ||
    window.location.pathname.startsWith("/cineapp") ||
    process.env.NEXT_PUBLIC_MOCK_API === "true";

  if (!isGitHubPages) {
    return; // Don't intercept when running locally or on Vercel
  }

  console.log("🎬 CineBook Client Mock Engine active for GitHub Pages");

  const originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // Only intercept /api/ requests
    if (!urlString.includes("/api/")) {
      return originalFetch(input, init);
    }

    const url = new URL(urlString, window.location.origin);
    const pathname = url.pathname.replace(/^\/cineapp/, ""); // Strip GitHub Pages basePath
    const method = init?.method?.toUpperCase() || "GET";

    const jsonResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    };

    // 1. GET /api/movies
    if (pathname === "/api/movies" && method === "GET") {
      const q = url.searchParams.get("query")?.toLowerCase() || "";
      const g = url.searchParams.get("genre") || "";
      let movies = SAMPLE_MOVIES;

      if (q) {
        movies = movies.filter((m) => m.title.toLowerCase().includes(q));
      }
      if (g) {
        movies = movies.filter((m) => m.movieGenres.some((mg) => mg.genre.name.toLowerCase() === g.toLowerCase()));
      }

      return jsonResponse({ success: true, movies });
    }

    // 2. GET /api/movies/:id
    const movieMatch = pathname.match(/^\/api\/movies\/([^\/]+)$/);
    if (movieMatch && method === "GET") {
      const id = movieMatch[1];
      const movie = SAMPLE_MOVIES.find((m) => m.id === id || m.slug === id) || SAMPLE_MOVIES[0];
      return jsonResponse({ success: true, movie });
    }

    // 3. GET /api/cinemas
    if (pathname === "/api/cinemas" && method === "GET") {
      return jsonResponse({ success: true, cinemas: SAMPLE_CINEMAS });
    }

    // 4. GET /api/showtimes/:id/seats
    const seatsMatch = pathname.match(/^\/api\/showtimes\/([^\/]+)\/seats$/);
    if (seatsMatch && method === "GET") {
      const showtimeId = seatsMatch[1];
      const seats = generate54Seats(showtimeId);
      return jsonResponse({
        success: true,
        showtime: {
          id: showtimeId,
          basePriceCents: 1850,
          format: "IMAX",
          movie: { title: "Interstellar: 10th Anniversary IMAX" },
          auditorium: { name: "Screen 1 - Grand IMAX Laser", cinema: { name: "CineBook Grand IMAX" } },
        },
        seats,
      });
    }

    // 5. POST /api/auth/login
    if (pathname === "/api/auth/login" && method === "POST") {
      const body = JSON.parse((init?.body as string) || "{}");
      const isAdmin = body.email?.includes("admin");
      const user = {
        id: isAdmin ? "admin-1" : "user-1",
        name: isAdmin ? "Admin Director" : "Alex Mercer",
        email: body.email || "user@cinebook.com",
        role: isAdmin ? "ADMIN" : "USER",
      };
      localStorage.setItem("cine_user", JSON.stringify(user));
      return jsonResponse({ success: true, user });
    }

    // 6. GET /api/auth/me
    if (pathname === "/api/auth/me" && method === "GET") {
      const user = JSON.parse(localStorage.getItem("cine_user") || "null") || {
        id: "user-1",
        name: "Alex Mercer",
        email: "user@cinebook.com",
        role: "USER",
      };
      return jsonResponse({ success: true, user });
    }

    // 7. POST /api/bookings/hold
    if (pathname === "/api/bookings/hold" && method === "POST") {
      const body = JSON.parse((init?.body as string) || "{}");
      const { showtimeId, seatIds } = body;
      const ref = `CB-GH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const bookingId = `book-${Date.now()}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const subtotalCents = (seatIds?.length || 1) * 1850;
      const bookingFeeCents = (seatIds?.length || 1) * 150;
      const taxCents = Math.round(subtotalCents * 0.08);
      const totalCents = subtotalCents + bookingFeeCents + taxCents;

      const booking = {
        id: bookingId,
        bookingReference: ref,
        showtimeId,
        seatIds,
        subtotalCents,
        bookingFeeCents,
        taxCents,
        totalCents,
        holdExpiresAt: expiresAt,
        status: "PENDING_PAYMENT",
        createdAt: new Date().toISOString(),
      };

      const holds = JSON.parse(localStorage.getItem(`cine_held_${showtimeId}`) || "[]");
      (seatIds || []).forEach((sId: string) => {
        const cleanId = sId.replace(`seat-${showtimeId}-`, "");
        holds.push({ seatId: cleanId, expiresAt: Date.now() + 10 * 60 * 1000 });
      });
      localStorage.setItem(`cine_held_${showtimeId}`, JSON.stringify(holds));
      localStorage.setItem(`cine_booking_${bookingId}`, JSON.stringify(booking));

      return jsonResponse({ success: true, booking });
    }

    // 8. GET /api/bookings/:id
    const bookingMatch = pathname.match(/^\/api\/bookings\/([^\/]+)$/);
    if (bookingMatch && method === "GET") {
      const bookingId = bookingMatch[1];
      const booking = JSON.parse(localStorage.getItem(`cine_booking_${bookingId}`) || "null") || {
        id: bookingId,
        bookingReference: "CB-DEMO-001",
        totalCents: 4320,
        subtotalCents: 3700,
        bookingFeeCents: 300,
        taxCents: 320,
        status: "PENDING_PAYMENT",
        holdExpiresAt: new Date(Date.now() + 600000).toISOString(),
        showtime: {
          startTime: new Date().toISOString(),
          format: "IMAX",
          movie: { title: "Interstellar: 10th Anniversary IMAX", posterUrl: SAMPLE_MOVIES[2].posterUrl },
          auditorium: { name: "Screen 1 - Grand IMAX Laser", cinema: { name: "CineBook Grand IMAX", city: "New York" } },
        },
        items: [
          { id: "1", seat: { rowLetter: "E", seatNumber: 4, seatTier: "VIP_RECLINER", priceCents: 1850 } },
          { id: "2", seat: { rowLetter: "E", seatNumber: 5, seatTier: "VIP_RECLINER", priceCents: 1850 } },
        ],
      };
      return jsonResponse({ success: true, booking });
    }

    // 9. POST /api/bookings/:id/pay
    const payMatch = pathname.match(/^\/api\/bookings\/([^\/]+)\/pay$/);
    if (payMatch && method === "POST") {
      const bookingId = payMatch[1];
      const booking = JSON.parse(localStorage.getItem(`cine_booking_${bookingId}`) || "{}");
      booking.status = "CONFIRMED";

      const ticketCode = `TCK-${booking.bookingReference || "CB"}-E4`;
      const tickets = [
        {
          id: `tck-${Date.now()}`,
          ticketCode,
          seat: { rowLetter: "E", seatNumber: 4, seatTier: "VIP_RECLINER" },
        },
      ];

      // Save to user history
      const history = JSON.parse(localStorage.getItem("cine_user_bookings") || "[]");
      history.unshift({
        id: bookingId,
        bookingReference: booking.bookingReference || "CB-DEMO-REF",
        status: "CONFIRMED",
        totalCents: booking.totalCents || 4320,
        createdAt: new Date().toISOString(),
        showtime: {
          startTime: new Date(Date.now() + 3600000 * 24).toISOString(),
          format: "IMAX",
          movie: { title: "Interstellar: 10th Anniversary IMAX", posterUrl: SAMPLE_MOVIES[2].posterUrl, rating: "PG-13" },
          auditorium: { name: "Screen 1 - Grand IMAX", cinema: { name: "CineBook Grand IMAX", city: "New York" } },
        },
        items: [{ seat: { rowLetter: "E", seatNumber: 4, seatTier: "VIP_RECLINER" } }],
        tickets,
      });
      localStorage.setItem("cine_user_bookings", JSON.stringify(history));
      localStorage.setItem(`cine_ticket_${ticketCode}`, JSON.stringify({ ticketCode, booking }));

      return jsonResponse({
        success: true,
        status: "CONFIRMED",
        booking,
        tickets,
      });
    }

    // 10. GET /api/tickets/:ticketCode
    const ticketMatch = pathname.match(/^\/api\/tickets\/([^\/]+)$/);
    if (ticketMatch && method === "GET") {
      const ticketCode = ticketMatch[1];
      const qrDataUrl = generateQrSvgDataUrl(ticketCode);

      return jsonResponse({
        success: true,
        ticket: {
          id: `tck-${ticketCode}`,
          ticketCode,
          qrCodeUrl: qrDataUrl,
          isUsed: false,
          booking: {
            id: "b-1",
            bookingReference: "CB-DEMO-2026",
            status: "CONFIRMED",
            totalCents: 4320,
            items: [{ seat: { rowLetter: "E", seatNumber: 4, seatTier: "VIP_RECLINER" } }],
          },
          showtime: {
            startTime: new Date(Date.now() + 3600000 * 24).toISOString(),
            format: "IMAX",
            movie: { title: "Interstellar: 10th Anniversary IMAX", posterUrl: SAMPLE_MOVIES[2].posterUrl, rating: "PG-13", durationMins: 169 },
            auditorium: { name: "Screen 1 - Grand IMAX Laser", cinema: { name: "CineBook Grand IMAX", city: "New York", address: "700 Broadway, Manhattan" } },
          },
        },
      });
    }

    // 11. GET /api/bookings
    if (pathname === "/api/bookings" && method === "GET") {
      const history = JSON.parse(localStorage.getItem("cine_user_bookings") || "[]");
      if (history.length === 0) {
        // Provide sample demo booking
        history.push({
          id: "demo-booking-1",
          bookingReference: "CB-2026-VIP-42",
          status: "CONFIRMED",
          totalCents: 4320,
          createdAt: new Date().toISOString(),
          showtime: {
            startTime: new Date(Date.now() + 3600000 * 48).toISOString(),
            format: "IMAX",
            movie: { title: "Interstellar: 10th Anniversary IMAX", posterUrl: SAMPLE_MOVIES[2].posterUrl, rating: "PG-13" },
            auditorium: { name: "Screen 1 - Grand IMAX Laser", cinema: { name: "CineBook Grand IMAX", city: "New York" } },
          },
          items: [{ seat: { rowLetter: "E", seatNumber: 4, seatTier: "VIP_RECLINER" } }],
          tickets: [{ ticketCode: "TCK-CB-VIP-E4" }],
        });
      }
      return jsonResponse({ success: true, bookings: history });
    }

    // 12. POST /api/bookings/:id/cancel
    const cancelMatch = pathname.match(/^\/api\/bookings\/([^\/]+)\/cancel$/);
    if (cancelMatch && method === "POST") {
      const bookingId = cancelMatch[1];
      const history = JSON.parse(localStorage.getItem("cine_user_bookings") || "[]");
      const target = history.find((b: any) => b.id === bookingId);
      if (target) {
        target.status = "CANCELLED";
        localStorage.setItem("cine_user_bookings", JSON.stringify(history));
      }
      return jsonResponse({ success: true, message: "Booking cancelled successfully and seats released." });
    }

    // 13. GET /api/admin/metrics
    if (pathname === "/api/admin/metrics" && method === "GET") {
      const history = JSON.parse(localStorage.getItem("cine_user_bookings") || "[]");
      const totalRev = history
        .filter((b: any) => b.status === "CONFIRMED")
        .reduce((sum: number, b: any) => sum + (b.totalCents || 0), 245000);

      return jsonResponse({
        success: true,
        stats: {
          totalRevenueCents: totalRev,
          confirmedBookingsCount: history.length + 48,
          totalTicketsSold: history.length * 2 + 96,
          activeMoviesCount: 6,
          totalCinemasCount: 3,
          activeHoldsCount: 2,
        },
        auditLogs: [
          { action: "SEAT_HOLD_CREATED", details: "Client hold initialized", created_at: new Date().toISOString(), ip_address: "127.0.0.1" },
          { action: "PAYMENT_CONFIRMED", details: "Payment confirmed via Mock Provider", created_at: new Date(Date.now() - 60000).toISOString(), ip_address: "127.0.0.1" },
        ],
      });
    }

    // 14. Fallback: pass to original fetch
    return originalFetch(input, init);
  };
}
