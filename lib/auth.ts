// Sesión firmada con HMAC (Web Crypto, funciona en middleware y en rutas).
export const COOKIE = "vc_session";
export const SESSION_HOURS = 12;

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no configurado");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSession(): Promise<string> {
  const exp = String(Date.now() + SESSION_HOURS * 3600_000);
  return `${exp}.${await hmac(exp)}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(exp));
}

export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.VIEWER_PASSWORD;
  if (!expected) return false;
  // Comparar hashes evita filtrar la longitud de la clave.
  return safeEqual(await hmac("pw:" + input), await hmac("pw:" + expected));
}
