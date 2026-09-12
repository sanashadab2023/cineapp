CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(64) NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" varchar(64),
	"details" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auditoriums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cinema_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"total_seats" integer NOT NULL,
	"sound_system" varchar(100) DEFAULT 'Dolby Atmos',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"showtime_seat_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_reference" varchar(32) NOT NULL,
	"user_id" uuid NOT NULL,
	"showtime_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"tax_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_reference_unique" UNIQUE("booking_reference")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cinemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"postal_code" varchar(32) NOT NULL,
	"phone" varchar(32),
	"image_url" text,
	"amenities" jsonb DEFAULT '["IMAX","Dolby Atmos","Recliners","Gourmet Dining"]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cinemas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genres_name_unique" UNIQUE("name"),
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "movie_genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"poster_url" text NOT NULL,
	"backdrop_url" text NOT NULL,
	"duration_mins" integer NOT NULL,
	"rating" varchar(16) NOT NULL,
	"release_date" varchar(32) NOT NULL,
	"language" varchar(64) NOT NULL,
	"trailer_url" text,
	"director" varchar(255),
	"cast" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" varchar(32) DEFAULT 'TEST' NOT NULL,
	"payment_intent_id" varchar(255),
	"idempotency_key" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_payment_intent_id_unique" UNIQUE("payment_intent_id"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auditorium_id" uuid NOT NULL,
	"row_letter" varchar(4) NOT NULL,
	"seat_number" integer NOT NULL,
	"seat_tier" varchar(32) DEFAULT 'STANDARD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "showtime_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"showtime_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'AVAILABLE' NOT NULL,
	"held_by_user_id" uuid,
	"hold_expires_at" timestamp with time zone,
	"booking_id" uuid,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "showtimes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"auditorium_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"base_price_cents" integer NOT NULL,
	"format" varchar(32) DEFAULT '2D' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" varchar(64) NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"showtime_id" uuid NOT NULL,
	"qr_code_data" text NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_ticket_code_unique" UNIQUE("ticket_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(32) DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auditoriums" ADD CONSTRAINT "auditoriums_cinema_id_cinemas_id_fk" FOREIGN KEY ("cinema_id") REFERENCES "public"."cinemas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_showtime_seat_id_showtime_seats_id_fk" FOREIGN KEY ("showtime_seat_id") REFERENCES "public"."showtime_seats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_seat_id_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookings" ADD CONSTRAINT "bookings_showtime_id_showtimes_id_fk" FOREIGN KEY ("showtime_id") REFERENCES "public"."showtimes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seats" ADD CONSTRAINT "seats_auditorium_id_auditoriums_id_fk" FOREIGN KEY ("auditorium_id") REFERENCES "public"."auditoriums"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "showtime_seats" ADD CONSTRAINT "showtime_seats_showtime_id_showtimes_id_fk" FOREIGN KEY ("showtime_id") REFERENCES "public"."showtimes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "showtime_seats" ADD CONSTRAINT "showtime_seats_seat_id_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "showtime_seats" ADD CONSTRAINT "showtime_seats_held_by_user_id_users_id_fk" FOREIGN KEY ("held_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "showtimes" ADD CONSTRAINT "showtimes_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "showtimes" ADD CONSTRAINT "showtimes_auditorium_id_auditoriums_id_fk" FOREIGN KEY ("auditorium_id") REFERENCES "public"."auditoriums"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_showtime_id_showtimes_id_fk" FOREIGN KEY ("showtime_id") REFERENCES "public"."showtimes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auditoriums_cinema_name_idx" ON "auditoriums" USING btree ("cinema_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "movie_genres_movie_genre_idx" ON "movie_genres" USING btree ("movie_id","genre_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "seats_auditorium_row_num_idx" ON "seats" USING btree ("auditorium_id","row_letter","seat_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "showtime_seats_showtime_seat_idx" ON "showtime_seats" USING btree ("showtime_id","seat_id");