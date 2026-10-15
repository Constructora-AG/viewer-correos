import { NextResponse } from "next/server";
import { getRow, parseMessage } from "@/lib/store";

export const runtime = "nodejs";

const MAX_INLINE = 1_500_000;

function toBase64(content: ArrayBuffer | Uint8Array | string) {
  if (typeof content === "string") return Buffer.from(content).toString("base64");
  return Buffer.from(content instanceof Uint8Array ? content : new Uint8Array(content)).toString("base64");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const row = await getRow(Number((await params).id));
  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const parsed = await parseMessage(row);
  if (!parsed) return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
  const { email } = parsed;

  // Reemplaza imágenes incrustadas (cid:) por data URIs para que se vean dentro del correo.
  let html = email.html ?? null;
  if (html) {
    for (const a of email.attachments) {
      const cid = a.contentId?.replace(/^<|>$/g, "");
      if (!cid || !a.content) continue;
      const size = typeof a.content === "string" ? a.content.length : a.content.byteLength;
      if (size > MAX_INLINE) continue;
      html = html.split(`cid:${cid}`).join(`data:${a.mimeType};base64,${toBase64(a.content)}`);
    }
  }

  const fmt = (list?: { name?: string; address?: string }[]) =>
    (list ?? []).map((x) => (x.name ? `${x.name} <${x.address ?? ""}>` : x.address ?? "")).join(", ");

  return NextResponse.json({
    id: row[0], cuenta: row[1], carpeta: row[2], fecha: row[3],
    asunto: email.subject ?? row[4],
    de: email.from ? fmt([email.from]) : row[6],
    para: fmt(email.to), cc: fmt(email.cc),
    html, texto: email.text ?? null,
    adjuntos: email.attachments
      .map((a, i) => ({
        i, nombre: a.filename || `adjunto-${i + 1}`, tipo: a.mimeType,
        tamano: typeof a.content === "string" ? a.content.length : a.content?.byteLength ?? 0,
        inline: a.disposition === "inline" && !!a.contentId,
      }))
      .filter((a) => !a.inline || !a.tipo.startsWith("image/")),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
