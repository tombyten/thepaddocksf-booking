import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { sendBookingCancellation } from "@/lib/mail";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Admins can cancel anyone's booking; members only their own.
  const { rows } =
    session.user.role === "admin"
      ? await sql<{
          bay_id: number;
          start_time: string;
          end_time: string;
          email: string;
          name: string;
        }>`
          DELETE FROM bookings b
          USING users u
          WHERE b.id = ${id} AND u.id = b.user_id
          RETURNING b.bay_id, b.start_time, b.end_time, u.email, u.name`
      : await sql<{
          bay_id: number;
          start_time: string;
          end_time: string;
          email: string;
          name: string;
        }>`
          DELETE FROM bookings b
          USING users u
          WHERE b.id = ${id} AND b.user_id = ${session.user.id} AND u.id = b.user_id
          RETURNING b.bay_id, b.start_time, b.end_time, u.email, u.name`;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Booking not found or not yours." },
      { status: 404 },
    );
  }

  const cancelled = rows[0];
  await sendBookingCancellation({
    userEmail: cancelled.email,
    userName: cancelled.name,
    bayId: cancelled.bay_id,
    startTime: new Date(cancelled.start_time),
    endTime: new Date(cancelled.end_time),
  });

  return NextResponse.json({ ok: true });
}
