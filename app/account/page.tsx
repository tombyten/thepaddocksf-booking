import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-5xl tracking-wider text-navy">ACCOUNT</h1>
        <p className="font-sans uppercase tracking-[0.25em] text-orange text-sm">
          {session.user.email}
        </p>
      </div>

      <section className="border-2 border-navy bg-white p-6">
        <h2 className="font-display text-3xl tracking-wider text-navy mb-4">
          CHANGE PASSWORD
        </h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
