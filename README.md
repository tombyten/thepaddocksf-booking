# The Paddock SF · Lift Bay Booking

A members-only booking system for the three lift bays at The Paddock SF. Built with Next.js 14 (App Router), NextAuth, Tailwind, and Vercel Postgres. Designed to deploy to Vercel as-is.

## Features

- Email + password login via NextAuth (credentials provider, JWT session)
- No public sign-up — admins create member accounts manually
- 24/7 calendar with three bays and 2-hour slots
- Continuous bookings up to 6 hours (1, 2, or 3 consecutive slots)
- Cancel your own bookings; admins can cancel anyone's
- "My Bookings" page lists upcoming reservations
- Admin page to add/remove/edit members and review all upcoming bookings
- Branded with The Paddock palette (cream / navy / red / orange) and Anton + Barlow Condensed fonts

## Stack

- Next.js 14 (App Router) + TypeScript
- NextAuth 4 (credentials)
- Vercel Postgres (`@vercel/postgres`)
- Tailwind CSS
- bcryptjs for password hashing

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in NEXTAUTH_SECRET, ADMIN_*, and the Postgres URLs
# (after creating a Vercel Postgres database, run: vercel env pull .env.local)

npm run db:init          # create users + bookings tables
npm run db:seed-admin    # upsert the initial admin user from .env.local
npm run dev
```

Visit `http://localhost:3000` and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Generate a secret with:

```bash
openssl rand -base64 32
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Create a new Vercel project from the repo.
3. Add a **Vercel Postgres** database to the project — Vercel will inject the `POSTGRES_*` env vars automatically.
4. Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` (your production URL) in project env vars.
5. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` (only needed once for seeding).
6. Deploy.
7. Run the schema and admin seed against production. From your local machine:
   ```bash
   vercel env pull .env.local       # pull production envs
   npm run db:init
   npm run db:seed-admin
   ```
   Or run the equivalent SQL via the Vercel dashboard SQL console.

## Schema

Two tables, both UUID-keyed:

- `users` — `id`, `email` (unique), `name`, `password_hash`, `role` (`admin`|`member`), `created_at`
- `bookings` — `id`, `user_id` (FK, cascade), `bay_id` (1-3), `start_time`, `end_time`, `created_at`

Overlap protection happens at insert time with a `WHERE NOT EXISTS` guard against any booking on the same bay whose time range intersects the requested range.

## Booking rules

- Slots are 2 hours, aligned to even hours starting at midnight (00:00, 02:00, …, 22:00).
- A single booking covers 1, 2, or 3 consecutive slots (2h, 4h, or 6h).
- Bookings cannot cross midnight — start a second booking on the next day if needed.
- Past slots are disabled.
- Members can cancel their own bookings; admins can cancel any.

## Customisation

- Palette and fonts: `tailwind.config.ts` + `app/layout.tsx`.
- Slot length, day count, max consecutive slots, bay IDs: `lib/slots.ts`.
- Auth behaviour: `lib/auth.ts`.
