"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const MIN_LENGTH = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const isWelcome = params.get("welcome") === "1";
  const subtitle = isWelcome ? "Set Your Password" : "New Password";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not reset password.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white border-2 border-navy p-8 shadow-[6px_6px_0_#1B2F6B]">
        <div className="mb-6 text-center">
          <h1 className="font-display text-5xl text-navy tracking-wide">THE PADDOCK</h1>
          <p className="font-sans uppercase tracking-[0.3em] text-orange text-sm mt-1">
            {subtitle}
          </p>
        </div>

        {!token ? (
          <div className="space-y-4">
            <p className="font-sans text-navy">
              This reset link is missing its token. Request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="block text-center uppercase tracking-wider text-navy text-sm font-semibold underline"
            >
              Request reset link
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4">
            <div className="bg-navy text-cream px-3 py-2 text-sm uppercase tracking-wider text-center">
              Password updated. Redirecting…
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block uppercase tracking-wider text-navy text-sm font-semibold mb-1">
                New password
              </label>
              <input
                type="password"
                required
                minLength={MIN_LENGTH}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border-2 border-navy bg-cream px-3 py-2 font-sans focus:outline-none focus:border-orange"
              />
              <p className="mt-1 text-xs uppercase tracking-wider text-navy/60">
                Minimum {MIN_LENGTH} characters.
              </p>
            </div>
            <div>
              <label className="block uppercase tracking-wider text-navy text-sm font-semibold mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                required
                minLength={MIN_LENGTH}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border-2 border-navy bg-cream px-3 py-2 font-sans focus:outline-none focus:border-orange"
              />
            </div>
            {error && (
              <div className="bg-red text-cream px-3 py-2 text-sm uppercase tracking-wider">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-cream py-3 font-display text-2xl tracking-widest hover:bg-orange transition-colors disabled:opacity-60"
            >
              {loading ? "Updating…" : "Set Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
