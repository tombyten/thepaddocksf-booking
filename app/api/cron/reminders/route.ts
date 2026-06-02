import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { sendBookingReminder } from "@/lib/mail";

// Daily cron sends reminders for any unreminded booking starting in the next 24 hours.
const LOOKAHEAD_HOURS = 24;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { rows } = await sql<{
    id: string;
    bay_id: number;
    start_time: string;
    end_time: string;
    email: string;
    name: string;
  }>`
    SELECT b.id, b.bay_id, b.start_time, b.end_time, u.email, u.name
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    WHERE b.reminded_at IS NULL
      AND b.start_time > NOW()
      AND b.start_time < NOW() + (${LOOKAHEAD_HOURS} || ' hours')::interval
  `;

  let sent = 0;
  for (const r of rows) {
    await sendBookingReminder({
      userEmail: r.email,
      userName: r.name,
      bayId: r.bay_id,
      startTime: new Date(r.start_time),
      endTime: new Date(r.end_time),
    });
    await sql`UPDATE bookings SET reminded_at = NOW() WHERE id = ${r.id}`;
    sent += 1;
  }

  return NextResponse.json({ checked: rows.length, sent });
}
