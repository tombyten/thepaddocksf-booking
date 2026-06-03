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
  const [role, setRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastLink, setLastLink] = useState<{
    email: string;
    url: string;
    kind: "invite" | "reset";
  } | null>(null);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMembers([data.member, ...members]);
      setLastLink({
        email: data.member.email,
        url: data.setPasswordUrl,
        kind: "invite",
      });
      setName("");
      setEmail("");
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

  async function sendResetLink(member: Member) {
    if (
      !confirm(
        `Send a password reset link to ${member.email}? The link is valid for 24 hours.`,
      )
    )
      return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${member.id}/reset-link`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setLastLink({ email: member.email, url: data.resetUrl, kind: "reset" });
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
        className="bg-white border-2 border-navy p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
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

      {lastLink && (
        <div className="bg-navy text-cream p-4 mb-3 border-2 border-orange">
          <div className="uppercase tracking-wider text-xs font-semibold mb-2 text-orange">
            {lastLink.kind === "invite"
              ? `Invite sent to ${lastLink.email}`
              : `Reset link sent to ${lastLink.email}`}
          </div>
          <p className="text-sm mb-2">
            If the email does not arrive, share this link directly. It is valid for{" "}
            {lastLink.kind === "invite" ? "7 days" : "24 hours"}.
          </p>
          <input
            type="text"
            readOnly
            value={lastLink.url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full bg-cream text-navy border border-cream/40 px-2 py-1 font-mono text-xs"
          />
          <button
            onClick={() => setLastLink(null)}
            className="mt-2 text-xs uppercase tracking-wider underline"
          >
            Dismiss
          </button>
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
                    onClick={() => sendResetLink(m)}
                    disabled={loading}
                    className="bg-navy text-cream uppercase tracking-wider px-2 py-1 text-xs font-semibold hover:bg-orange transition-colors disabled:opacity-60"
                  >
                    Send Reset Link
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
