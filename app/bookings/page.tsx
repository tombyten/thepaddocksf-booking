import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import CancelButton from "@/components/CancelButton";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { rows } = await sql<{
    id: string;
    bay_id: number;
    start_time: string;
    end_time: string;
  }>`
    SELECT id, bay_id, start_time, end_time
    FROM bookings
    WHERE user_id = ${session.user.id}
      AND end_time > NOW()
    ORDER BY start_time ASC
  `;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-5xl tracking-wider text-navy">
          MY BOOKINGS
        </h1>
        <p className="font-sans uppercase tracking-[0.25em] text-orange text-sm">
          Upcoming reservations for {session.user.name ?? session.user.email}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="border-2 border-dashed border-navy/40 p-10 text-center">
          <p className="font-display text-3xl tracking-wider text-navy/60">
            NO UPCOMING BOOKINGS
          </p>
          <p className="text-sm uppercase tracking-wider text-navy/60 mt-2">
            Head to the calendar to reserve a bay.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((b) => {
            const start = new Date(b.start_time);
            const end = new Date(b.end_time);
            const hours = Math.round(
              (end.getTime() - start.getTime()) / (60 * 60 * 1000),
            );
            return (
              <li
                key={b.id}
                className="border-2 border-navy bg-white p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="font-display text-2xl tracking-wider text-navy">
                    BAY {b.bay_id} · {hours}H
                  </div>
                  <div className="font-sans text-navy/80">
                    {start.toLocaleString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    –{" "}
                    {end.toLocaleString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <CancelButton id={b.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
