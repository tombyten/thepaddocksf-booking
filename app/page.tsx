import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Calendar from "@/components/Calendar";
import { toIsoDate } from "@/lib/slots";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const today = toIsoDate(new Date());
  const date =
    searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : today;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Calendar
        initialDate={date}
        currentUserId={session.user.id}
        isAdmin={session.user.role === "admin"}
      />
    </div>
  );
}
