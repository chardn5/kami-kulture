// middleware.ts
import { NextResponse } from "next/server";

export function middleware(req: Request) {
  const url = new URL(req.url);

  if (url.pathname.startsWith("/admin")) {
    const auth = req.headers.get("authorization") || "";
    const [scheme, b64] = auth.split(" ");
    if (scheme !== "Basic" || !b64) {
      return new NextResponse("Auth required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Admin Area"' },
      });
    }
    const [u, p] = Buffer.from(b64, "base64").toString().split(":");
    if (u !== process.env.ADMIN_USER || p !== process.env.ADMIN_PASS) {
      return new NextResponse("Auth required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Admin Area"' },
      });
    }
  }

  return NextResponse.next();
}

// Limit scope of middleware only to /admin
export const config = {
  matcher: ["/admin/:path*"],
};
