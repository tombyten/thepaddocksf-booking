import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { sql } from "@vercel/postgres";
import { sendPasswordReset } from "@/lib/mail";

const TOKEN_BYTES = 32;
const EXPIRY_MINUTES = 60;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const { rows } = await sql<{ id: string; name: string; email: string }>`
    SELECT id, name, email FROM users WHERE email = ${email} LIMIT 1
  `;

  // Always return success — don't leak whether the address is registered.
  if (rows.length > 0) {
    const user = rows[0];
    const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

    // Invalidate any outstanding tokens for this user before issuing a new one.
    await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ${user.id} AND used_at IS NULL`;
    await sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
    `;

    const base = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await sendPasswordReset({
      userEmail: user.email,
      userName: user.name,
      resetUrl,
      expiresInMinutes: EXPIRY_MINUTES,
    });
  }

  return NextResponse.json({ ok: true });
}
