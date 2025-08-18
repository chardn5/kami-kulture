import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Inter, Bebas_Neue } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-brand' });

export const metadata: Metadata = {
  title: { default: 'Kami Kulture', template: '%s • Kami Kulture' },
  description: 'Anime-inspired memes & quotes on premium tees— printed on demand.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable}`}>
      <body className="kk-grid min-h-dvh font-sans text-slate-200">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
