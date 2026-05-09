// /src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kamikulture.com";
const DEFAULT_DESC = "Anime-inspired streetwear - premium prints, fast shipping.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kami Kulture",
    template: "%s | Kami Kulture",
  },
  description: DEFAULT_DESC,
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Kami Kulture",
    description: DEFAULT_DESC,
    type: "website",
    siteName: "Kami Kulture",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Kami Kulture" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kami Kulture",
    description: DEFAULT_DESC,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0F0F0C",
};

// ...imports unchanged
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="kk-grid kk-page-shell min-h-screen text-[#f7f1df] antialiased">
        {/* Skip link */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-[#d6ff57] focus:px-3 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>

        <Navbar />
        <main id="content" className="min-h-[calc(100vh-9rem)]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
