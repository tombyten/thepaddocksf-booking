"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Booking = {
  id: string;
  bay_id: number;
  start_time: string;
  end_time: string;
  user_name: string;
  user_email: string;
};

export default function AdminBookings({
  initialBookings,
}: {
  initialBookings: Booking[];
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [loading, setLoading] = useState(false);

  async function cancel(id: string) {
    if (!confirm("Cancel this booking?")) return;
    setLoading(true);
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Cancel failed");
      return;
    }
    setBookings(bookings.filter((b) => b.id !== id));
    router.refresh();
  }

  return (
    <section>
      <h2 className="font-display text-3xl tracking-wider text-navy mb-4">
        ALL UPCOMING BOOKINGS
      </h2>

      {bookings.length === 0 ? (
        <div className="border-2 border-dashed border-navy/40 p-6 text-center font-display text-2xl tracking-wider text-navy/60">
          NONE
        </div>
      ) : (
        <div className="bg-white border-2 border-navy overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-navy text-cream">
              <tr>
                <th className="p-3 text-left font-display text-xl tracking-wider">
                  When
                </th>
                <th className="p-3 text-left font-display text-xl tracking-wider">
                  Bay
                </th>
                <th className="p-3 text-left font-display text-xl tracking-wider">
                  Member
                </th>
                <th className="p-3 text-left font-display text-xl tracking-wider">
                  Length
                </th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const start = new Date(b.start_time);
                const end = new Date(b.end_time);
                const hours = Math.round(
                  (end.getTime() - start.getTime()) / (60 * 60 * 1000),
                );
                return (
                  <tr key={b.id} className="border-t border-navy/20">
                    <td className="p-3">
                      {start.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3 font-semibold">Bay {b.bay_id}</td>
                    <td className="p-3">
                      <div className="font-semibold">{b.user_name}</div>
                      <div className="text-xs opacity-70">{b.user_email}</div>
                    </td>
                    <td className="p-3 uppercase tracking-wider">{hours}h</td>
                    <td className="p-3 text-right">
                      <button
                        disabled={loading}
                        onClick={() => cancel(b.id)}
                        className="bg-red text-cream uppercase tracking-wider px-3 py-1 text-xs font-semibold hover:bg-orange transition-colors disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
