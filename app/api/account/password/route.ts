import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { hashPassword, verifyPassword } from "@/lib/password";

const MIN_LENGTH = 8;
const MAX_LENGTH = 256;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json(
      { error: "Both current and new passwords are required." },
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
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "New password must differ from the current one." },
      { status: 400 },
    );
  }

  const { rows } = await sql<{ password_hash: string }>`
    SELECT password_hash FROM users WHERE id = ${session.user.id} LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const ok = await verifyPassword(currentPassword, rows[0].password_hash);
  if (!ok) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 },
    );
  }

  const newHash = await hashPassword(newPassword);
  await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${session.user.id}`;

  return NextResponse.json({ ok: true });
}
