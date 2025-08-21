import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Kami Kulture",
  description: "Anime-inspired streetwear — premium prints, fast shipping.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Kami Kulture",
    description: "Anime-inspired streetwear — premium prints, fast shipping.",
    type: "website",
    siteName: "Kami Kulture",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kami Kulture",
    description: "Anime-inspired streetwear — premium prints, fast shipping.",
  },
  themeColor: "#0B0F19",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0B0F19] text-white antialiased">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
