// Sube el índice al Blob store privado.
// Uso: node --env-file=.env.local scripts/subir-indice.mjs ~/visor-correos-ag/data/index.json.gz
import { put } from "@vercel/blob";
import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) throw new Error("Falta la ruta del índice");
const r = await put("index/index.json.gz", await readFile(file), {
  access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/gzip",
});
console.log("índice subido:", r.pathname);
