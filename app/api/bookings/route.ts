import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import {
  BAY_IDS,
  MAX_CONSECUTIVE_SLOTS,
  SLOT_HOURS,
  SLOTS_PER_DAY,
  slotToTimestamps,
} from "@/lib/slots";
import { sendBookingConfirmation } from "@/lib/mail";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date"); // YYYY-MM-DD
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date param required" }, { status: 400 });
  }

  // Pull bookings overlapping the requested local day.
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  const { rows } = await sql`
    SELECT b.id, b.user_id, b.bay_id, b.start_time, b.end_time,
           u.name AS user_name, u.email AS user_email
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    WHERE b.start_time < ${dayEnd.toISOString()}
      AND b.end_time   > ${dayStart.toISOString()}
    ORDER BY b.start_time ASC
  `;

  return NextResponse.json({ bookings: rows });
}

type CreateBody = {
  date?: string;
  bayId?: number;
  startSlot?: number;
  slotCount?: number;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { date, bayId, startSlot, slotCount } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (
    typeof bayId !== "number" ||
    !BAY_IDS.includes(bayId as (typeof BAY_IDS)[number])
  ) {
    return NextResponse.json({ error: "Invalid bay" }, { status: 400 });
  }
  if (
    typeof startSlot !== "number" ||
    startSlot < 0 ||
    startSlot >= SLOTS_PER_DAY
  ) {
    return NextResponse.json({ error: "Invalid start slot" }, { status: 400 });
  }
  if (
    typeof slotCount !== "number" ||
    slotCount < 1 ||
    slotCount > MAX_CONSECUTIVE_SLOTS
  ) {
    return NextResponse.json(
      { error: `Booking must be 1–${MAX_CONSECUTIVE_SLOTS} slots (max ${MAX_CONSECUTIVE_SLOTS * SLOT_HOURS} hours).` },
      { status: 400 },
    );
  }
  if (startSlot + slotCount > SLOTS_PER_DAY) {
    return NextResponse.json(
      { error: "Booking cannot extend past midnight." },
      { status: 400 },
    );
  }

  const { start } = slotToTimestamps(date, startSlot);
  const { end } = slotToTimestamps(date, startSlot + slotCount - 1);

  // Reject bookings entirely in the past.
  if (end.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Cannot book past time slots." },
      { status: 400 },
    );
  }

  // Atomic insert with overlap check.
  try {
    const { rows } = await sql`
      INSERT INTO bookings (user_id, bay_id, start_time, end_time)
      SELECT ${session.user.id}::uuid, ${bayId}, ${start.toISOString()}::timestamptz, ${end.toISOString()}::timestamptz
      WHERE NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE bay_id = ${bayId}
          AND start_time < ${end.toISOString()}::timestamptz
          AND end_time   > ${start.toISOString()}::timestamptz
      )
      RETURNING id, user_id, bay_id, start_time, end_time
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "That time conflicts with an existing booking." },
        { status: 409 },
      );
    }

    if (session.user.email) {
      await sendBookingConfirmation({
        userEmail: session.user.email,
        userName: session.user.name || session.user.email,
        bayId,
        startTime: start,
        endTime: end,
      });
    }

    return NextResponse.json({ booking: rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
