import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes, createHash } from "crypto";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { sendPasswordReset } from "@/lib/mail";

const EXPIRY_MINUTES = 24 * 60;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { rows } = await sql<{ id: string; email: string; name: string }>`
    SELECT id, email, name FROM users WHERE id = ${params.id} LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  const user = rows[0];

  // Burn outstanding tokens, issue a fresh one.
  await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ${user.id} AND used_at IS NULL`;
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);
  await sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
  `;

  const base =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;

  await sendPasswordReset({
    userEmail: user.email,
    userName: user.name,
    resetUrl,
    expiresInMinutes: EXPIRY_MINUTES,
  });

  return NextResponse.json({ resetUrl, expiresAt: expiresAt.toISOString() });
}
