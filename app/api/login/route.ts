import { NextResponse } from "next/server";
import { COOKIE, SESSION_HOURS, checkPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  // Pequeña espera para frenar intentos de fuerza bruta.
  await new Promise((r) => setTimeout(r, 400));
  if (!password || !(await checkPassword(password))) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createSession(), {
    httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
