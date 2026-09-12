# CineBook - Production-Ready Cinema Ticket Booking Platform

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsanashadab2023%2Fcineapp&env=JWT_SECRET,CRON_SECRET,STRIPE_SECRET_KEY,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY&project-name=cinebook)
[![CI & Build](https://github.com/sanashadab2023/cineapp/actions/workflows/ci.yml/badge.svg)](https://github.com/sanashadab2023/cineapp/actions)

CineBook is a full-stack cinema ticket-booking platform built with **Next.js (App Router)**, **Tailwind CSS**, **Neon Serverless PostgreSQL**, and **Drizzle ORM**. It is engineered for high-concurrency seat reservations, atomic database locking, automated seat-hold release, and digital QR ticket issuance.

---

## Multi-Agent Architecture & Team Responsibilities

The CineBook platform was designed, implemented, and verified by three specialized engineering agents:

```
                  ┌──────────────────────────────────────────────┐
                  │                 CineBook                     │
                  └──────────────────────┬───────────────────────┘
                                         │
        ┌────────────────────────────────┼───────────────────────────────┐
        ▼                                ▼                               ▼
┌──────────────────┐           ┌──────────────────┐            ┌──────────────────┐
│  Agent 1: App    │           │  Agent 2: DB     │            │  Agent 3: QA     │
│  - Luxury UI     │           │  - 14 Tables     │            │  - Concurrency   │
│  - Seat Chart    │           │  - FOR UPDATE    │            │  - Expirations   │
│  - Checkout      │           │  - Hold Expiry   │            │  - Idempotency   │
│  - QR Passes     │           │  - Idempotency   │            │  - Auth Guard    │
└──────────────────┘           └──────────────────┘            └──────────────────┘
```

### Agent 1: App Agent
- **Luxury Dark Aesthetic**: Cinematic dark UI (`#06080D`) with gold ambient glows, curved projection screen visualization, glassmorphism, and responsive layouts across desktop and mobile.
- **End-to-End User Journey**:
  - Home page with featured blockbuster spotlights, title search, date tabs, genre and cinema filters.
  - Movie details page with synopsis, trailer player, cast, director, and showtime schedules grouped by format.
  - Cinema directory with amenities (IMAX Laser, Dolby Atmos, Luxury Recliners).
  - Showtime matrix schedule.
  - Interactive seat selection with real-time seat locks, tier visualizer (Standard, VIP Recliner, Accessible), and live 10-minute hold countdown timer.
  - Transparent checkout with itemized seats, $1.50 service fee, 8% tax, and total strictly calculated on the server in integer cents.
  - High-fidelity boarding pass digital ticket with dynamic SVG QR code, calendar export (`.ics`), and print capability.
  - User booking history with status badges and cancellation flow with automatic seat release and refund logging.
  - Executive admin dashboard with revenue metrics, occupancy stats, and live system audit logs.

### Agent 2: Database Engine Agent
- **Neon Serverless PostgreSQL Schema**:
  - 14 tables: `users`, `movies`, `genres`, `movie_genres`, `cinemas`, `auditoriums`, `seats`, `showtimes`, `showtime_seats`, `bookings`, `booking_items`, `payments`, `tickets`, `audit_logs`.
  - All primary keys use UUIDs (`gen_random_uuid()`).
  - All timestamps stored in UTC (`timestamp with time zone`).
  - Monetary values stored strictly as integer minor units (cents, e.g. `$15.00` = `1500`).
  - Unique constraints prevent duplicate auditorium seat positions, duplicate screen names, and duplicate showtime seat bookings.
- **Concurrency & Booking Transaction**:
  1. Begins SQL transaction.
  2. Acquires row-level locks on requested `showtime_seats` with `FOR UPDATE`.
  3. Verifies seat availability (reclaiming expired holds if applicable).
  4. Applies an atomic conditional double-check lock update to ensure zero race conditions.
  5. Calculates ticket pricing, fees, and taxes on the server.
  6. Creates a `PENDING` booking with a 10-minute expiration window.
  7. Confirms seats to `BOOKED` only upon verified payment.
  8. Idempotent payment processing via `idempotency_key` to reject duplicate charges or double tickets.
- **Scheduled Cleanup Route**:
  - Protected endpoint `/api/cron/release-holds` running every 5 minutes via Vercel Cron.
  - Idempotently releases expired seat holds back to `AVAILABLE` and marks pending bookings as `EXPIRED`.

### Agent 3: QA Agent
- Automated verification test suites:
  - `tests/concurrency.test.ts`: Simulates concurrent sessions racing to book the identical seat; proves exactly one succeeds and the other is rejected with code `SEAT_UNAVAILABLE`.
  - `tests/hold-expiration.test.ts`: Creates past-due holds and verifies automated release to `AVAILABLE` and idempotency of subsequent cron executions.
  - `tests/payment-idempotency.test.ts`: Submits duplicate payment confirmations with identical idempotency keys; proves zero duplicate charges or duplicate tickets.
  - `tests/auth-isolation.test.ts`: Verifies user isolation on bookings and enforces admin access boundaries.

---

## Technology Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS with custom cinema design tokens & glassmorphism
- **Database**: Neon Serverless PostgreSQL (via Vercel Marketplace)
- **ORM**: Drizzle ORM + Drizzle Kit migrations
- **Authentication**: Secure HTTP-only cookies with signed JWT tokens (`jose`) & `bcryptjs`
- **Payments**: Stripe Test Mode + Instant Test Pay Simulator
- **Cron**: Vercel Cron (`vercel.json`)
- **Icons**: Lucide React
- **QR Codes**: Dynamic QR code rendering (`qrcode`)

---

## Environment Variables Configuration

Create a `.env.local` file with the following values (see `.env.example`):

```bash
# Neon Serverless PostgreSQL Connection
# Application queries use the pooled connection:
DATABASE_URL="postgresql://user:password@ep-pooler.us-east-2.aws.neon.tech/cinebook?sslmode=require"

# Direct connection for running Drizzle migrations:
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-direct.us-east-2.aws.neon.tech/cinebook?sslmode=require"

# Authentication Secret (minimum 32 characters)
JWT_SECRET="cinebook_super_secret_jwt_key_min_32_chars_long_change_in_prod"

# Vercel Cron Route Protection
CRON_SECRET="cinebook_cron_secret_token_12345"

# Stripe Test Mode Credentials
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Public Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Quickstart & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate and Run Migrations
```bash
# Generate SQL migration files
npm run db:generate

# Execute migrations on your database
npm run db:migrate
```

### 3. Seed Realistic Cinema Data
```bash
# Populates 6 blockbuster movies, 3 luxury cinema complexes, auditoriums, 54 seats/screen, and daily showtimes
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Accounts

For immediate testing, use the pre-seeded demo accounts or use the one-click demo buttons on the login page:

| Role | Email | Password | Access |
|---|---|---|---|
| **Demo Moviegoer** | `user@cinebook.com` | `UserPass123!` | Booking, ticket passes, cancellations |
| **Demo Admin** | `admin@cinebook.com` | `AdminPass123!` | Executive dashboard, metrics, audit logs |

---

## Automated QA Verification Suites

Execute the comprehensive test suites created by Agent 3:

```bash
# Run ALL test suites sequentially
npm run test:all

# Or run individual test suites:
npm run test:concurrency   # Race condition test for simultaneous seat booking
npm run test:holds         # Expired hold release and cron idempotency test
npm run test:idempotency   # Payment idempotency and duplicate webhook test
npm run test:auth          # User booking isolation and admin guard test
```

---

## Vercel Deployment Instructions

### 1. Provision Neon PostgreSQL on Vercel Marketplace
1. Navigate to the **Storage** tab in your Vercel Dashboard.
2. Select **Neon Serverless Postgres** from the Vercel Marketplace.
3. Link the database to your project. Vercel automatically configures `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).

### 2. Configure Environment Variables in Vercel
In **Project Settings** > **Environment Variables**, add:
- `JWT_SECRET`: A secure random string.
- `CRON_SECRET`: Secret token used by Vercel Cron.
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` (if using Stripe live/test webhooks).

### 3. Automatic Migrations during Build / Deploy
In your Vercel project settings or `package.json`, migrations can be run as part of the build step:
```bash
npm run db:migrate && npm run build
```

### 4. Scheduled Hold Cleanup Job (`vercel.json`)
The project includes a pre-configured `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/release-holds",
      "schedule": "*/5 * * * *"
    }
  ]
}
```
Vercel automatically invokes `/api/cron/release-holds` every 5 minutes with the authorization bearer header matching `CRON_SECRET`.
