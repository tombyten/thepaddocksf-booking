import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot delete yourself." },
      { status: 400 },
    );
  }

  const { rowCount } = await sql`DELETE FROM users WHERE id = ${params.id}`;
  if (rowCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

type PatchBody = { role?: "admin" | "member" };

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.role === "admin" || body.role === "member") {
    if (params.id === session.user.id && body.role !== "admin") {
      return NextResponse.json(
        { error: "You cannot demote yourself." },
        { status: 400 },
      );
    }
    await sql`UPDATE users SET role = ${body.role} WHERE id = ${params.id}`;
  }

  return NextResponse.json({ ok: true });
}
