"use client";

import { useState } from "react";

const MIN_LENGTH = 8;

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < MIN_LENGTH) {
      setError(`New password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must differ from the current one.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update password.");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  const inputClass =
    "w-full border-2 border-navy bg-cream px-3 py-2 font-sans focus:outline-none focus:border-orange";
  const labelClass =
    "block uppercase tracking-wider text-navy text-sm font-semibold mb-1";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Current password</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>New password</label>
        <input
          type="password"
          required
          minLength={MIN_LENGTH}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs uppercase tracking-wider text-navy/60">
          Minimum {MIN_LENGTH} characters.
        </p>
      </div>
      <div>
        <label className={labelClass}>Confirm new password</label>
        <input
          type="password"
          required
          minLength={MIN_LENGTH}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <div className="bg-red text-cream px-3 py-2 text-sm uppercase tracking-wider">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-navy text-cream px-3 py-2 text-sm uppercase tracking-wider">
          Password updated.
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-navy text-cream py-3 px-6 font-display text-2xl tracking-widest hover:bg-orange transition-colors disabled:opacity-60"
      >
        {loading ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}
