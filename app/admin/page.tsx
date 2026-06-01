import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import AdminMembers from "@/components/AdminMembers";
import AdminBookings from "@/components/AdminBookings";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const [{ rows: members }, { rows: bookings }] = await Promise.all([
    sql<{
      id: string;
      email: string;
      name: string;
      role: "admin" | "member";
      created_at: string;
    }>`SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC`,
    sql<{
      id: string;
      bay_id: number;
      start_time: string;
      end_time: string;
      user_name: string;
      user_email: string;
    }>`
      SELECT b.id, b.bay_id, b.start_time, b.end_time,
             u.name AS user_name, u.email AS user_email
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      WHERE b.end_time > NOW()
      ORDER BY b.start_time ASC
    `,
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <header>
        <h1 className="font-display text-5xl tracking-wider text-navy">ADMIN</h1>
        <p className="font-sans uppercase tracking-[0.25em] text-orange text-sm">
          Manage members and review bookings
        </p>
      </header>

      <AdminMembers
        initialMembers={members}
        currentUserId={session.user.id}
      />
      <AdminBookings initialBookings={bookings} />
    </div>
  );
}
