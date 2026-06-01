"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  created_at: string;
};

export default function AdminMembers({
  initialMembers,
  currentUserId,
}: {
  initialMembers: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMembers([data.member, ...members]);
      setName("");
      setEmail("");
      setPassword("");
      setRole("member");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteMember(id: string) {
    if (
      !confirm(
        "Delete this member? Their bookings will also be deleted. This cannot be undone.",
      )
    )
      return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed");
      }
      setMembers(members.filter((m) => m.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(id: string) {
    const pw = prompt("Enter new password (min 8 chars):");
    if (!pw) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed");
      }
      alert("Password updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleRole(m: Member) {
    const next = m.role === "admin" ? "member" : "admin";
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed");
      }
      setMembers(
        members.map((x) => (x.id === m.id ? { ...x, role: next } : x)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2 className="font-display text-3xl tracking-wider text-navy mb-4">
        MEMBERS
      </h2>

      <form
        onSubmit={addMember}
        className="bg-white border-2 border-navy p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block uppercase tracking-wider text-navy text-xs font-semibold mb-1">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border-2 border-navy bg-cream px-3 py-2"
          />
        </div>
        <div>
          <label className="block uppercase tracking-wider text-navy text-xs font-semibold mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border-2 border-navy bg-cream px-3 py-2"
          />
        </div>
        <div>
          <label className="block uppercase tracking-wider text-navy text-xs font-semibold mb-1">
            Password
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full border-2 border-navy bg-cream px-3 py-2"
          />
        </div>
        <div>
          <label className="block uppercase tracking-wider text-navy text-xs font-semibold mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "member")}
            className="w-full border-2 border-navy bg-cream px-3 py-2"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-orange text-cream uppercase tracking-wider font-semibold py-2 hover:bg-red transition-colors disabled:opacity-60"
        >
          {loading ? "…" : "Add Member"}
        </button>
      </form>

      {error && (
        <div className="bg-red text-cream px-4 py-2 mb-3 uppercase tracking-wider text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border-2 border-navy overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-navy text-cream">
            <tr>
              <th className="p-3 text-left font-display text-xl tracking-wider">
                Name
              </th>
              <th className="p-3 text-left font-display text-xl tracking-wider">
                Email
              </th>
              <th className="p-3 text-left font-display text-xl tracking-wider">
                Role
              </th>
              <th className="p-3 text-left font-display text-xl tracking-wider">
                Joined
              </th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-navy/20">
                <td className="p-3 font-semibold">{m.name}</td>
                <td className="p-3">{m.email}</td>
                <td className="p-3 uppercase tracking-wider">
                  <span
                    className={
                      m.role === "admin"
                        ? "bg-orange text-cream px-2 py-1 text-xs"
                        : "bg-navy/10 px-2 py-1 text-xs"
                    }
                  >
                    {m.role}
                  </span>
                </td>
                <td className="p-3 text-sm">
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => toggleRole(m)}
                    disabled={loading || m.id === currentUserId}
                    className="bg-navy text-cream uppercase tracking-wider px-2 py-1 text-xs font-semibold hover:bg-orange transition-colors disabled:opacity-40"
                  >
                    {m.role === "admin" ? "Make Member" : "Make Admin"}
                  </button>
                  <button
                    onClick={() => resetPassword(m.id)}
                    disabled={loading}
                    className="bg-navy text-cream uppercase tracking-wider px-2 py-1 text-xs font-semibold hover:bg-orange transition-colors disabled:opacity-60"
                  >
                    Reset PW
                  </button>
                  <button
                    onClick={() => deleteMember(m.id)}
                    disabled={loading || m.id === currentUserId}
                    className="bg-red text-cream uppercase tracking-wider px-2 py-1 text-xs font-semibold hover:bg-orange transition-colors disabled:opacity-40"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
