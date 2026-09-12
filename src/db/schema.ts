import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users Table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 32 }).notNull().default("USER"), // 'USER' | 'ADMIN'
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// 2. Movies Table
export const movies = pgTable("movies", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description").notNull(),
  posterUrl: text("poster_url").notNull(),
  backdropUrl: text("backdrop_url").notNull(),
  durationMins: integer("duration_mins").notNull(),
  rating: varchar("rating", { length: 16 }).notNull(), // 'PG-13', 'R', etc.
  releaseDate: varchar("release_date", { length: 32 }).notNull(),
  language: varchar("language", { length: 64 }).notNull(),
  trailerUrl: text("trailer_url"),
  director: varchar("director", { length: 255 }),
  cast: text("cast"),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// 3. Genres Table
export const genres = pgTable("genres", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// 4. Movie Genres Join Table
export const movieGenres = pgTable(
  "movie_genres",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    movieId: uuid("movie_id")
      .references(() => movies.id, { onDelete: "cascade" })
      .notNull(),
    genreId: uuid("genre_id")
      .references(() => genres.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    movieGenreIdx: uniqueIndex("movie_genres_movie_genre_idx").on(table.movieId, table.genreId),
  })
);

// 5. Cinemas Table
export const cinemas = pgTable("cinemas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 32 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  imageUrl: text("image_url"),
  amenities: jsonb("amenities").default(["IMAX", "Dolby Atmos", "Recliners", "Gourmet Dining"]),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// 6. Auditoriums Table
export const auditoriums = pgTable(
  "auditoriums",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cinemaId: uuid("cinema_id")
      .references(() => cinemas.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    totalSeats: integer("total_seats").notNull(),
    soundSystem: varchar("sound_system", { length: 100 }).default("Dolby Atmos"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    cinemaAuditoriumNameIdx: uniqueIndex("auditoriums_cinema_name_idx").on(table.cinemaId, table.name),
  })
);

// 7. Seats Table
export const seats = pgTable(
  "seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    auditoriumId: uuid("auditorium_id")
      .references(() => auditoriums.id, { onDelete: "cascade" })
      .notNull(),
    rowLetter: varchar("row_letter", { length: 4 }).notNull(),
    seatNumber: integer("seat_number").notNull(),
    seatTier: varchar("seat_tier", { length: 32 }).notNull().default("STANDARD"), // 'STANDARD' | 'VIP' | 'RECLINER' | 'ACCESSIBLE'
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    auditoriumSeatPosIdx: uniqueIndex("seats_auditorium_row_num_idx").on(
      table.auditoriumId,
      table.rowLetter,
      table.seatNumber
    ),
  })
);

// 8. Showtimes Table
export const showtimes = pgTable("showtimes", {
  id: uuid("id").defaultRandom().primaryKey(),
  movieId: uuid("movie_id")
    .references(() => movies.id, { onDelete: "cascade" })
    .notNull(),
  auditoriumId: uuid("auditorium_id")
    .references(() => auditoriums.id, { onDelete: "cascade" })
    .notNull(),
  startTime: timestamp("start_time", { withTimezone: true, mode: "date" }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true, mode: "date" }).notNull(),
  basePriceCents: integer("base_price_cents").notNull(), // in minor units (cents)
  format: varchar("format", { length: 32 }).notNull().default("2D"), // '2D' | '3D' | 'IMAX'
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// 9. Showtime Seats Table
export const showtimeSeats = pgTable(
  "showtime_seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    showtimeId: uuid("showtime_id")
      .references(() => showtimes.id, { onDelete: "cascade" })
      .notNull(),
    seatId: uuid("seat_id")
      .references(() => seats.id, { onDelete: "cascade" })
      .notNull(),
    status: varchar("status", { length: 32 }).notNull().default("AVAILABLE"), // 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED'
    heldByUserId: uuid("held_by_user_id").references(() => users.id, { onDelete: "set null" }),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true, mode: "date" }),
    bookingId: uuid("booking_id"),
    version: integer("version").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    showtimeSeatIdx: uniqueIndex("showtime_seats_showtime_seat_idx").on(table.showtimeId, table.seatId),
  })
);

// 10. Bookings Table
export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingReference: varchar("booking_reference", { length: 32 }).notNull().unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  showtimeId: uuid("showtime_id")
    .references(() => showtimes.id, { onDelete: "cascade" })
    .notNull(),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"), // 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED'
  subtotalCents: integer("subtotal_cents").notNull(),
  feeCents: integer("fee_cents").notNull(),
  taxCents: integer("tax_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// 11. Booking Items Table
export const bookingItems = pgTable("booking_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id, { onDelete: "cascade" })
    .notNull(),
  showtimeSeatId: uuid("showtime_seat_id")
    .references(() => showtimeSeats.id, { onDelete: "cascade" })
    .notNull(),
  seatId: uuid("seat_id")
    .references(() => seats.id, { onDelete: "cascade" })
    .notNull(),
  priceCents: integer("price_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// 12. Payments Table
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id, { onDelete: "cascade" })
    .notNull(),
  provider: varchar("provider", { length: 32 }).notNull().default("TEST"), // 'STRIPE' | 'TEST'
  paymentIntentId: varchar("payment_intent_id", { length: 255 }).unique(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"), // 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// 13. Tickets Table
export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketCode: varchar("ticket_code", { length: 64 }).notNull().unique(),
  bookingId: uuid("booking_id")
    .references(() => bookings.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  showtimeId: uuid("showtime_id")
    .references(() => showtimes.id, { onDelete: "cascade" })
    .notNull(),
  qrCodeData: text("qr_code_data").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// 14. Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: varchar("entity_id", { length: 64 }),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// Relations Definitions
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  tickets: many(tickets),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  movieGenres: many(movieGenres),
  showtimes: many(showtimes),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  movieGenres: many(movieGenres),
}));

export const movieGenresRelations = relations(movieGenres, ({ one }) => ({
  movie: one(movies, { fields: [movieGenres.movieId], references: [movies.id] }),
  genre: one(genres, { fields: [movieGenres.genreId], references: [genres.id] }),
}));

export const cinemasRelations = relations(cinemas, ({ many }) => ({
  auditoriums: many(auditoriums),
}));

export const auditoriumsRelations = relations(auditoriums, ({ one, many }) => ({
  cinema: one(cinemas, { fields: [auditoriums.cinemaId], references: [cinemas.id] }),
  seats: many(seats),
  showtimes: many(showtimes),
}));

export const seatsRelations = relations(seats, ({ one, many }) => ({
  auditorium: one(auditoriums, { fields: [seats.auditoriumId], references: [auditoriums.id] }),
  showtimeSeats: many(showtimeSeats),
}));

export const showtimesRelations = relations(showtimes, ({ one, many }) => ({
  movie: one(movies, { fields: [showtimes.movieId], references: [movies.id] }),
  auditorium: one(auditoriums, { fields: [showtimes.auditoriumId], references: [auditoriums.id] }),
  showtimeSeats: many(showtimeSeats),
  bookings: many(bookings),
}));

export const showtimeSeatsRelations = relations(showtimeSeats, ({ one }) => ({
  showtime: one(showtimes, { fields: [showtimeSeats.showtimeId], references: [showtimes.id] }),
  seat: one(seats, { fields: [showtimeSeats.seatId], references: [seats.id] }),
  heldByUser: one(users, { fields: [showtimeSeats.heldByUserId], references: [users.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  showtime: one(showtimes, { fields: [bookings.showtimeId], references: [showtimes.id] }),
  items: many(bookingItems),
  payments: many(payments),
  tickets: many(tickets),
}));

export const bookingItemsRelations = relations(bookingItems, ({ one }) => ({
  booking: one(bookings, { fields: [bookingItems.bookingId], references: [bookings.id] }),
  showtimeSeat: one(showtimeSeats, { fields: [bookingItems.showtimeSeatId], references: [showtimeSeats.id] }),
  seat: one(seats, { fields: [bookingItems.seatId], references: [seats.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  booking: one(bookings, { fields: [tickets.bookingId], references: [bookings.id] }),
  user: one(users, { fields: [tickets.userId], references: [users.id] }),
  showtime: one(showtimes, { fields: [tickets.showtimeId], references: [showtimes.id] }),
}));
