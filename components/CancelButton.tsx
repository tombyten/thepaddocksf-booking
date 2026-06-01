"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (!confirm("Cancel this booking?")) return;
    setLoading(true);
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Cancel failed");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="bg-red text-cream uppercase tracking-wider px-3 py-2 text-sm font-semibold hover:bg-orange transition-colors disabled:opacity-60"
    >
      {loading ? "…" : "Cancel"}
    </button>
  );
}
