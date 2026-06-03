import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes, createHash } from "crypto";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/password";
import { sendMemberWelcome } from "@/lib/mail";

const WELCOME_EXPIRY_DAYS = 7;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { rows } = await sql`
    SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC
  `;
  return NextResponse.json({ members: rows });
}

type CreateBody = {
  email?: string;
  name?: string;
  role?: "admin" | "member";
};

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  const name = body.name?.trim();
  const role: "admin" | "member" = body.role === "admin" ? "admin" : "member";

  if (!email || !name) {
    return NextResponse.json(
      { error: "email and name required" },
      { status: 400 },
    );
  }

  // Unguessable placeholder hash so the row is valid; the member cannot sign in
  // until they complete the set-password flow.
  const placeholderPassword = randomBytes(48).toString("base64url");
  const hash = await hashPassword(placeholderPassword);

  try {
    const { rows } = await sql<{
      id: string;
      email: string;
      name: string;
      role: "admin" | "member";
      created_at: string;
    }>`
      INSERT INTO users (email, name, password_hash, role)
      VALUES (${email}, ${name}, ${hash}, ${role})
      RETURNING id, email, name, role, created_at
    `;
    const member = rows[0];

    // Issue a long-lived reset token used as the set-password link.
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + WELCOME_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    await sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${member.id}, ${tokenHash}, ${expiresAt.toISOString()})
    `;

    const base =
      process.env.APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const setPasswordUrl = `${base}/reset-password?token=${encodeURIComponent(rawToken)}&welcome=1`;

    await sendMemberWelcome({
      userEmail: member.email,
      userName: member.name,
      setPasswordUrl,
      expiresInDays: WELCOME_EXPIRY_DAYS,
    });

    return NextResponse.json({ member, setPasswordUrl }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "A user with that email already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
