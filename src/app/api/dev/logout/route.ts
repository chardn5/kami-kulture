import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("kk_admin", "", { path: "/", httpOnly: true, maxAge: 0, sameSite: "lax", secure: true });
  return res;
}
