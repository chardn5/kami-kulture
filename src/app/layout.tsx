import "./globals.css";
import { Bebas_Neue } from "next/font/google";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"] });

export const metadata = {
  title: "Kami Kulture — Coming Soon",
  description: "Anime‑inspired memes & quotes. New drops soon.",
  openGraph: { title: "Kami Kulture", description: "Anime‑inspired drops soon." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={bebas.className}>{children}</body>
    </html>
  );
}
