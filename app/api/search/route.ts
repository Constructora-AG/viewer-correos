import { NextResponse } from "next/server";
import { buscar } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const data = await buscar({
    cuenta: p.get("cuenta") || undefined,
    carpeta: p.get("carpeta") || undefined,
    q: p.get("q") || undefined,
    de: p.get("de") || undefined,
    para: p.get("para") || undefined,
    desde: p.get("desde") || undefined,
    hasta: p.get("hasta") || undefined,
    adjuntos: p.get("adjuntos") === "1",
    pagina: Number(p.get("pagina")) || 1,
  });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
