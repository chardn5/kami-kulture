import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SandboxBanner from "@/components/SandboxBanner";

export const metadata: Metadata = {
  title: "Kami Kulture",
  description: "Anime-inspired memes & quotes on premium tees — printed on demand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0B0F19] text-white antialiased">
        <SandboxBanner />
        <Navbar />
        <main className="mx-auto max-w-6xl px-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
