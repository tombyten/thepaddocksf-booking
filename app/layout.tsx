import type { Metadata } from "next";
import { Anton, Barlow_Condensed } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Providers from "./providers";
import NavBar from "@/components/NavBar";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Paddock SF · Lift Bay Booking",
  description: "Reserve a lift bay at The Paddock SF.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en" className={`${anton.variable} ${barlow.variable}`}>
      <body className="bg-cream text-navy min-h-screen">
        <Providers>
          {session?.user && <NavBar user={session.user} />}
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
