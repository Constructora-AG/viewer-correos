"""Exporta el índice SQLite a index.json.gz con el formato que espera lib/store.ts."""
import gzip, json, os, re, sqlite3, sys

DB = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/visor-correos-ag/data/index.db")
OUT = os.path.expanduser(sys.argv[2] if len(sys.argv) > 2 else "~/visor-correos-ag/data/index.json.gz")

rows = []
for r in sqlite3.connect(DB).execute(
        "SELECT id,cuenta,carpeta,COALESCE(fecha,''),asunto,de_nombre,de,para,cc,n_adjuntos,adjuntos,texto,tamano,ruta FROM mensajes"):
    r = list(r)
    r[11] = re.sub(r"\s+", " ", r[11] or "")[:600]  # extracto para búsqueda
    rows.append(r)
with gzip.open(OUT, "wt", encoding="utf-8") as fh:
    json.dump(rows, fh, ensure_ascii=False, separators=(",", ":"))
print(len(rows), "mensajes ->", OUT, os.path.getsize(OUT) // 1024, "KB")
