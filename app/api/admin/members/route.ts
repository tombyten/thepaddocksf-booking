import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/password";
import { sendMemberWelcome } from "@/lib/mail";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
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
  password?: string;
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
  const password = body.password;
  const role: "admin" | "member" = body.role === "admin" ? "admin" : "member";

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "email, name, password required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const hash = await hashPassword(password);

  try {
    const { rows } = await sql`
      INSERT INTO users (email, name, password_hash, role)
      VALUES (${email}, ${name}, ${hash}, ${role})
      RETURNING id, email, name, role, created_at
    `;

    const loginUrl = `${process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
    await sendMemberWelcome({
      userEmail: email,
      userName: name,
      tempPassword: password,
      loginUrl,
    });

    return NextResponse.json({ member: rows[0] }, { status: 201 });
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
