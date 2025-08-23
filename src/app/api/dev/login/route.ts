import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

function tokenFromPass(pass: string) {
  return createHash("sha256").update(pass).digest("base64url");
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const submitted = body.password ?? "";
  const pass = process.env.ADMIN_PASSWORD;

  if (!pass) {
    return NextResponse.json({ ok: false, error: "ADMIN_PASSWORD not set" }, { status: 500 });
  }
  if (submitted !== pass) {
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }

  const token = tokenFromPass(pass);
  const res = NextResponse.json({ ok: true });

  res.cookies.set("kk_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}
