export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 mt-16">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-white/80">
        <p>© {year} Kami Kulture. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a href="mailto:orders@kamikulture.com" className="underline">orders@kamikulture.com</a>
          <span aria-hidden>•</span>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white">Facebook</a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>
          <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-white">X</a>
        </div>
      </div>
    </footer>
  );
}
