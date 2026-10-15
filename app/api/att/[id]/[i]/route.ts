import { getRow, parseMessage } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; i: string }> }) {
  const { id, i } = await params;
  const row = await getRow(Number(id));
  if (!row) return new Response("No encontrado", { status: 404 });
  const parsed = await parseMessage(row);
  const att = parsed?.email.attachments[Number(i)];
  if (!att?.content) return new Response("Adjunto no encontrado", { status: 404 });

  const name = att.filename || `adjunto-${Number(i) + 1}`;
  const body = typeof att.content === "string" ? Buffer.from(att.content) : new Uint8Array(att.content);
  return new Response(body, {
    headers: {
      "Content-Type": att.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name.replace(/["\\\r\n]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
