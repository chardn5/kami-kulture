import "./globals.css";
import { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kami Kulture — Coming Soon",
  description: "Anime-inspired memes & quotes. New drops soon.",
  openGraph: {
    title: "Kami Kulture",
    description: "Anime-inspired memes & quotes. New drops soon.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={bebas.className}>{children}</body>
    </html>
  );
}
