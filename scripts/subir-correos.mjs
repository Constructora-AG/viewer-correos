// Sube los .eml del respaldo al Blob store PRIVADO (reanudable: omite los que ya existen).
// Uso: node --env-file=.env.local scripts/subir-correos.mjs ~/Desktop/Respaldo_correos_AG
import { put, list } from "@vercel/blob";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const SRC = process.argv[2];
const CONCURRENCIA = Number(process.env.CONCURRENCIA ?? 12);
if (!SRC) throw new Error("Falta la carpeta del respaldo");

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".eml")) yield p;
  }
}

const existentes = new Set();
let cursor;
do {
  const r = await list({ prefix: "eml/", cursor, limit: 1000 });
  r.blobs.forEach((b) => existentes.add(b.pathname));
  cursor = r.cursor;
} while (cursor);
console.log("ya en Blob:", existentes.size);

const pendientes = [];
for await (const p of walk(SRC)) {
  const pathname = "eml/" + relative(SRC, p).split(sep).join("/");
  if (!existentes.has(pathname)) pendientes.push([p, pathname]);
}
console.log("por subir:", pendientes.length);

let hechos = 0, errores = 0;
async function worker() {
  while (pendientes.length) {
    const [p, pathname] = pendientes.shift();
    for (let intento = 1; intento <= 4; intento++) {
      try {
        await put(pathname, await readFile(p), {
          access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "message/rfc822",
        });
        break;
      } catch (e) {
        if (intento === 4) { errores++; console.error("ERR", pathname, e.message); }
        else await new Promise((r) => setTimeout(r, 2000 * intento));
      }
    }
    if (++hechos % 500 === 0) console.log("subidos", hechos, "errores", errores);
  }
}
await Promise.all(Array.from({ length: CONCURRENCIA }, worker));
console.log("TERMINADO subidos", hechos, "errores", errores);
