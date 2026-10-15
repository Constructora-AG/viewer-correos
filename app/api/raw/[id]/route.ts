import { getRaw, getRow } from "@/lib/store";

export const runtime = "nodejs";

// Descarga el correo original (.eml) para abrirlo en Outlook, Mail o Thunderbird.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const row = await getRow(Number((await params).id));
  if (!row) return new Response("No encontrado", { status: 404 });
  const raw = await getRaw(row);
  if (!raw) return new Response("Archivo no disponible", { status: 404 });
  return new Response(raw, {
    headers: {
      "Content-Type": "message/rfc822",
      "Content-Disposition": `attachment; filename="correo-${row[0]}.eml"`,
      "Cache-Control": "private, no-store",
    },
  });
}
