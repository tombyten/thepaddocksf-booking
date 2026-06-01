"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white border-2 border-navy p-8 shadow-[6px_6px_0_#1B2F6B]">
        <div className="mb-6 text-center">
          <h1 className="font-display text-5xl text-navy tracking-wide">THE PADDOCK</h1>
          <p className="font-sans uppercase tracking-[0.3em] text-orange text-sm mt-1">
            Reset Password
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <p className="font-sans text-navy">
              If an account exists for that email, we just sent a reset link. Check
              your inbox — the link expires in 60 minutes.
            </p>
            <Link
              href="/login"
              className="block text-center uppercase tracking-wider text-navy text-sm font-semibold underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="font-sans text-navy/80 text-sm">
              Enter your email and we'll send you a link to set a new password.
            </p>
            <div>
              <label className="block uppercase tracking-wider text-navy text-sm font-semibold mb-1">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
            <Link
              href="/login"
              className="block text-center uppercase tracking-wider text-navy/70 text-xs font-semibold mt-4"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
