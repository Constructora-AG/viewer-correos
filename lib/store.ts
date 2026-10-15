import { gunzipSync } from "node:zlib";
import PostalMime from "postal-mime";

// Orden de columnas del índice generado por scripts/exportar-indice.py
export type Row = [
  id: number, cuenta: string, carpeta: string, fecha: string, asunto: string,
  deNombre: string, de: string, para: string, cc: string, nAdj: number,
  adjuntos: string, extracto: string, tamano: number, ruta: string,
];

type Indexed = { row: Row; ts: number; texto: string; dest: string; de: string };

const INDEX_PATH = "index/index.json.gz";
let cache: Promise<{ rows: Indexed[]; byId: Map<number, Row> }> | null = null;

// Los archivos viven en el servidor privado de AG (FILES_URL), protegido con FILES_TOKEN.
async function readBlob(pathname: string): Promise<Uint8Array<ArrayBuffer> | null> {
  const base = process.env.FILES_URL;
  const token = process.env.FILES_TOKEN;
  if (!base || !token) throw new Error("FILES_URL / FILES_TOKEN no configurados");
  const url = base.replace(/\/$/, "") + "/" + pathname.split("/").map(encodeURIComponent).join("/");
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Servidor de archivos respondió ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function loadIndex() {
  if (!cache) {
    cache = (async () => {
      const buf = await readBlob(INDEX_PATH);
      if (!buf) throw new Error("No se encontró el índice en Blob");
      const data = JSON.parse(gunzipSync(buf).toString("utf8")) as Row[];
      const rows = data.map((row) => ({
        row,
        ts: row[3] ? Date.parse(row[3]) : 0,
        de: norm(`${row[5]} ${row[6]}`),
        dest: norm(`${row[7]} ${row[8]}`),
        texto: norm(`${row[4]} ${row[11]} ${row[10]} ${row[5]} ${row[6]} ${row[7]} ${row[8]}`),
      }));
      rows.sort((a, b) => b.ts - a.ts);
      return { rows, byId: new Map(data.map((r) => [r[0], r])) };
    })().catch((e) => { cache = null; throw e; });
  }
  return cache;
}

export type Filtros = {
  cuenta?: string; carpeta?: string; q?: string; de?: string; para?: string;
  desde?: string; hasta?: string; adjuntos?: boolean; pagina?: number;
};

export const PAGE_SIZE = 50;

export async function buscar(f: Filtros) {
  const { rows } = await loadIndex();
  const q = f.q ? norm(f.q.trim()).split(/\s+/).filter(Boolean) : [];
  const de = f.de ? norm(f.de.trim()) : "";
  const para = f.para ? norm(f.para.trim()) : "";
  const desde = f.desde ? Date.parse(f.desde + "T00:00:00") : 0;
  const hasta = f.hasta ? Date.parse(f.hasta + "T23:59:59") : 0;

  const cuentas = new Map<string, number>();
  const carpetas = new Map<string, number>();
  const res: Row[] = [];

  for (const r of rows) {
    const row = r.row;
    if (de && !r.de.includes(de)) continue;
    if (para && !r.dest.includes(para)) continue;
    if (desde && r.ts < desde) continue;
    if (hasta && r.ts > hasta) continue;
    if (f.adjuntos && row[9] === 0) continue;
    if (q.length && !q.every((t) => r.texto.includes(t))) continue;
    // Conteos por cuenta antes de filtrar por cuenta, y por carpeta antes de filtrar por carpeta.
    cuentas.set(row[1], (cuentas.get(row[1]) ?? 0) + 1);
    if (f.cuenta && row[1] !== f.cuenta) continue;
    carpetas.set(row[2], (carpetas.get(row[2]) ?? 0) + 1);
    if (f.carpeta && row[2] !== f.carpeta) continue;
    res.push(row);
  }

  const pagina = Math.max(1, f.pagina ?? 1);
  return {
    total: res.length,
    pagina,
    paginas: Math.max(1, Math.ceil(res.length / PAGE_SIZE)),
    items: res.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE).map((row) => ({
      id: row[0], cuenta: row[1], carpeta: row[2], fecha: row[3], asunto: row[4],
      deNombre: row[5], de: row[6], para: row[7], nAdj: row[9], extracto: row[11].slice(0, 160),
    })),
    cuentas: [...cuentas].sort((a, b) => a[0].localeCompare(b[0])),
    carpetas: [...carpetas].sort((a, b) => b[1] - a[1]),
  };
}

export async function getRow(id: number) {
  const { byId } = await loadIndex();
  return byId.get(id) ?? null;
}

export async function getRaw(row: Row) {
  return readBlob("eml/" + row[13]);
}

export async function parseMessage(row: Row) {
  const raw = await getRaw(row);
  if (!raw) return null;
  return { raw, email: await PostalMime.parse(raw) };
}
