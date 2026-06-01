"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BAY_IDS,
  MAX_CONSECUTIVE_SLOTS,
  SLOTS_PER_DAY,
  SLOT_HOURS,
  addDays,
  formatHour,
  fromIsoDate,
  slotIndexToHour,
  slotToTimestamps,
} from "@/lib/slots";

type Booking = {
  id: string;
  user_id: string;
  bay_id: number;
  start_time: string;
  end_time: string;
  user_name: string;
  user_email: string;
};

type Props = {
  initialDate: string;
  currentUserId: string;
  isAdmin: boolean;
};

type CellState =
  | { kind: "free" }
  | { kind: "booked"; booking: Booking; isStart: boolean; span: number }
  | { kind: "covered" }; // continuation of a multi-slot booking

export default function Calendar({ initialDate, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    bayId: number;
    startSlot: number;
  } | null>(null);
  const [pendingCount, setPendingCount] = useState(1);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings?date=${date}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load bookings");
      const data = await res.json();
      setBookings(data.bookings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Build a per-bay grid of cell states.
  const grid = useMemo(() => {
    const result: Record<number, CellState[]> = {};
    for (const bay of BAY_IDS) {
      result[bay] = Array.from({ length: SLOTS_PER_DAY }, () => ({
        kind: "free" as const,
      }));
    }
    const dayStart = fromIsoDate(date);
    for (const b of bookings) {
      if (!result[b.bay_id]) continue;
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      // Compute slot indices intersecting this day.
      const startMin = Math.max(start.getTime(), dayStart.getTime());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const endMin = Math.min(end.getTime(), dayEnd.getTime());
      if (endMin <= startMin) continue;

      const startSlot = Math.floor(
        (startMin - dayStart.getTime()) / (SLOT_HOURS * 60 * 60 * 1000),
      );
      const endSlot = Math.ceil(
        (endMin - dayStart.getTime()) / (SLOT_HOURS * 60 * 60 * 1000),
      );
      const span = endSlot - startSlot;
      if (span <= 0) continue;
      result[b.bay_id][startSlot] = {
        kind: "booked",
        booking: b,
        isStart: true,
        span,
      };
      for (let i = 1; i < span && startSlot + i < SLOTS_PER_DAY; i++) {
        result[b.bay_id][startSlot + i] = { kind: "covered" };
      }
    }
    return result;
  }, [bookings, date]);

  // Max consecutive free slots starting at (bayId, startSlot).
  function maxAvailableFrom(bayId: number, startSlot: number): number {
    const cells = grid[bayId];
    let n = 0;
    for (
      let i = startSlot;
      i < SLOTS_PER_DAY && n < MAX_CONSECUTIVE_SLOTS;
      i++
    ) {
      if (cells[i].kind !== "free") break;
      // Disallow booking past the end of the day or fully past start times.
      const { end } = slotToTimestamps(date, i);
      if (end.getTime() <= Date.now()) break;
      n++;
    }
    return n;
  }

  function openBooking(bayId: number, startSlot: number) {
    const max = maxAvailableFrom(bayId, startSlot);
    if (max === 0) return;
    setPending({ bayId, startSlot });
    setPendingCount(1);
    setError(null);
  }

  async function confirmBooking() {
    if (!pending) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          bayId: pending.bayId,
          startSlot: pending.startSlot,
          slotCount: pendingCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Booking failed");
      setPending(null);
      await fetchBookings();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Cancel failed");
      }
      await fetchBookings();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setLoading(false);
    }
  }

  const friendlyDate = fromIsoDate(date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const maxForPending = pending
    ? maxAvailableFrom(pending.bayId, pending.startSlot)
    : 0;

  return (
    <div>
      {/* Header / date controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-5xl tracking-wider text-navy">
            LIFT BAY CALENDAR
          </h1>
          <p className="font-sans uppercase tracking-[0.25em] text-orange text-sm">
            {friendlyDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="bg-navy text-cream px-3 py-2 uppercase tracking-wider font-semibold hover:bg-orange transition-colors"
          >
            ← Prev
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="border-2 border-navy bg-cream px-3 py-2 font-sans"
          />
          <button
            onClick={() => setDate(addDays(date, 1))}
            className="bg-navy text-cream px-3 py-2 uppercase tracking-wider font-semibold hover:bg-orange transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red text-cream px-4 py-2 mb-4 uppercase tracking-wider text-sm">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="border-2 border-navy bg-white overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-navy text-cream">
              <th className="w-32 p-3 text-left font-display text-2xl tracking-wider">
                TIME
              </th>
              {BAY_IDS.map((bay) => (
                <th
                  key={bay}
                  className="p-3 text-left font-display text-2xl tracking-wider border-l border-cream/30"
                >
                  BAY {bay}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SLOTS_PER_DAY }).map((_, slot) => {
              const hour = slotIndexToHour(slot);
              return (
                <tr key={slot} className="border-t border-navy/20">
                  <td className="p-3 align-top font-sans font-semibold text-navy uppercase tracking-wider text-sm">
                    {formatHour(hour)}
                    <div className="text-xs opacity-60 normal-case">
                      to {formatHour((hour + SLOT_HOURS) % 24 || 24)}
                    </div>
                  </td>
                  {BAY_IDS.map((bay) => {
                    const cell = grid[bay][slot];
                    if (cell.kind === "covered") return null;
                    const isPast =
                      slotToTimestamps(date, slot).end.getTime() <= Date.now();

                    if (cell.kind === "booked") {
                      const owned = cell.booking.user_id === currentUserId;
                      return (
                        <td
                          key={bay}
                          rowSpan={cell.span}
                          className={`p-2 align-top border-l border-navy/20 ${
                            owned ? "bg-orange/30" : "bg-navy/10"
                          }`}
                        >
                          <div className="font-display text-xl tracking-wider text-navy">
                            {owned ? "YOUR BOOKING" : "BOOKED"}
                          </div>
                          <div className="font-sans text-sm text-navy/80">
                            {cell.booking.user_name}
                          </div>
                          <div className="text-xs uppercase tracking-wider text-navy/60 mt-1">
                            {cell.span * SLOT_HOURS}h block
                          </div>
                          {(owned || isAdmin) && (
                            <button
                              onClick={() => cancelBooking(cell.booking.id)}
                              disabled={loading}
                              className="mt-2 bg-red text-cream uppercase tracking-wider px-2 py-1 text-xs font-semibold hover:bg-orange transition-colors disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={bay}
                        className="p-2 align-top border-l border-navy/20"
                      >
                        <button
                          disabled={isPast || loading}
                          onClick={() => openBooking(bay, slot)}
                          className={`w-full h-full min-h-[60px] uppercase tracking-wider text-sm font-semibold transition-colors ${
                            isPast
                              ? "bg-cream/40 text-navy/30 cursor-not-allowed"
                              : "bg-cream hover:bg-orange hover:text-cream text-navy border border-dashed border-navy/40"
                          }`}
                        >
                          {isPast ? "—" : "Book"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Booking modal */}
      {pending && (
        <div
          className="fixed inset-0 bg-navy/70 flex items-center justify-center z-50 px-4"
          onClick={() => !loading && setPending(null)}
        >
          <div
            className="bg-cream border-2 border-navy p-6 max-w-md w-full shadow-[6px_6px_0_#1B2F6B]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-3xl tracking-wider text-navy">
              CONFIRM BOOKING
            </h2>
            <p className="uppercase tracking-wider text-orange text-sm mb-4">
              Bay {pending.bayId} ·{" "}
              {formatHour(slotIndexToHour(pending.startSlot))}
            </p>

            <label className="block uppercase tracking-wider text-navy text-sm font-semibold mb-1">
              Duration
            </label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {Array.from({ length: maxForPending }).map((_, i) => {
                const count = i + 1;
                const active = pendingCount === count;
                return (
                  <button
                    key={count}
                    onClick={() => setPendingCount(count)}
                    className={`py-3 font-display text-2xl tracking-wider border-2 ${
                      active
                        ? "bg-navy text-cream border-navy"
                        : "border-navy text-navy hover:bg-navy hover:text-cream"
                    }`}
                  >
                    {count * SLOT_HOURS}H
                  </button>
                );
              })}
            </div>
            <p className="text-xs uppercase tracking-wider text-navy/60 mb-4">
              Max {MAX_CONSECUTIVE_SLOTS * SLOT_HOURS}h per booking. Available
              here: {maxForPending * SLOT_HOURS}h.
            </p>

            <div className="flex gap-2">
              <button
                disabled={loading}
                onClick={() => setPending(null)}
                className="flex-1 border-2 border-navy text-navy uppercase tracking-wider font-semibold py-3 hover:bg-navy hover:text-cream transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={confirmBooking}
                className="flex-1 bg-orange text-cream uppercase tracking-wider font-semibold py-3 hover:bg-red transition-colors disabled:opacity-60"
              >
                {loading ? "Booking…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
