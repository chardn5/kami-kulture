export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t mt-16">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="opacity-70">© {year} Kami Kulture. All rights reserved.</p>
        <div className="flex items-center gap-4 opacity-80">
          <span>PayPal (Sandbox)</span>
          <span>•</span>
          <a href="mailto:orders@kamikulture.com" className="underline">
            orders@kamikulture.com
          </a>
        </div>
      </div>
    </footer>
  );
}
