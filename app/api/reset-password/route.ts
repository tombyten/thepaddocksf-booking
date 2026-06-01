import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/password";

const MIN_LENGTH = 8;
const MAX_LENGTH = 256;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function POST(request: Request) {
  let body: { token?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token;
  const newPassword = body.newPassword;

  if (typeof token !== "string" || typeof newPassword !== "string") {
    return NextResponse.json(
      { error: "Token and new password are required." },
      { status: 400 },
    );
  }
  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (newPassword.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: "New password is too long." },
      { status: 400 },
    );
  }

  const tokenHash = hashToken(token);

  const { rows } = await sql<{ id: string; user_id: string; expires_at: string; used_at: string | null }>`
    SELECT id, user_id, expires_at, used_at
    FROM password_reset_tokens
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Reset link is invalid or has already been used." },
      { status: 400 },
    );
  }

  const record = rows[0];
  if (record.used_at) {
    return NextResponse.json(
      { error: "Reset link has already been used." },
      { status: 400 },
    );
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Reset link has expired. Request a new one." },
      { status: 400 },
    );
  }

  const newHash = await hashPassword(newPassword);
  await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${record.user_id}`;
  await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${record.id}`;
  // Defense in depth: also burn any sibling outstanding tokens.
  await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ${record.user_id} AND used_at IS NULL`;

  return NextResponse.json({ ok: true });
}
