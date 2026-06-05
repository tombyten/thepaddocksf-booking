"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white border-2 border-navy p-8 shadow-[6px_6px_0_#1B2F6B]">
        <div className="mb-6 text-center">
          <h1 className="font-display text-5xl text-navy tracking-wide">THE PADDOCK</h1>
          <p className="font-sans uppercase tracking-[0.3em] text-orange text-sm mt-1">
            Lift Bay Booking
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
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
          <div>
            <label className="block uppercase tracking-wider text-navy text-sm font-semibold mb-1">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <Link
            href="/forgot-password"
            className="block text-center uppercase tracking-wider text-navy/70 text-xs font-semibold mt-2"
          >
            Forgot password?
          </Link>
        </form>
        <p className="mt-6 text-xs uppercase tracking-wider text-navy/60 text-center">
          Members only · Contact admin for access
        </p>
      </div>
    </div>
  );
}
