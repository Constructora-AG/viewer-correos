"""Indexa los .eml del respaldo en SQLite (metadatos + texto) para el visor."""
import os, sys, sqlite3, email, re
from email import policy
from email.utils import getaddresses, parsedate_to_datetime

SRC = os.path.expanduser("~/Desktop/Respaldo_correos_AG")
DB = os.path.expanduser("~/visor-correos-ag/data/index.db")
os.makedirs(os.path.dirname(DB), exist_ok=True)

def addrs(msg, h):
    try:
        return [(n, a.lower()) for n, a in getaddresses([str(v) for v in msg.get_all(h, [])]) if a]
    except Exception:
        return []

def text_of(msg):
    plain, html = None, None
    for part in msg.walk():
        if part.is_multipart() or part.get_content_disposition() == "attachment":
            continue
        ct = part.get_content_type()
        try:
            c = part.get_content()
        except Exception:
            continue
        if ct == "text/plain" and plain is None:
            plain = c
        elif ct == "text/html" and html is None:
            html = c
    if plain is None and html:
        plain = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(script|style).*?</\1>", " ", html)))
    return (plain or "").strip()

db = sqlite3.connect(DB)
db.executescript("""
CREATE TABLE IF NOT EXISTS mensajes(id INTEGER PRIMARY KEY, cuenta TEXT, carpeta TEXT, ruta TEXT UNIQUE,
  fecha TEXT, asunto TEXT, de_nombre TEXT, de TEXT, para TEXT, cc TEXT, tamano INTEGER,
  adjuntos TEXT, n_adjuntos INTEGER, texto TEXT);
""")
done = {r[0] for r in db.execute("SELECT ruta FROM mensajes")}
n = 0
for root, _, files in os.walk(SRC):
    for f in files:
        if not f.endswith(".eml"):
            continue
        p = os.path.join(root, f)
        rel = os.path.relpath(p, SRC)
        if rel in done:
            continue
        parts = rel.split(os.sep)
        try:
            with open(p, "rb") as fh:
                msg = email.message_from_binary_file(fh, policy=policy.default)
            try:
                fecha = parsedate_to_datetime(msg["date"]).isoformat() if msg["date"] else None
            except Exception:
                fecha = None
            de = addrs(msg, "from")
            att = [(a.get_filename() or "sin_nombre") for a in msg.iter_attachments()] if msg.is_multipart() else []
            db.execute("INSERT INTO mensajes(cuenta,carpeta,ruta,fecha,asunto,de_nombre,de,para,cc,tamano,adjuntos,n_adjuntos,texto) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (parts[0], "/".join(parts[1:-1]), rel, fecha, str(msg["subject"] or ""),
                 de[0][0] if de else "", de[0][1] if de else "",
                 ", ".join(a for _, a in addrs(msg, "to")), ", ".join(a for _, a in addrs(msg, "cc")),
                 os.path.getsize(p), " | ".join(att), len(att), text_of(msg)[:20000]))
        except Exception as e:
            print("ERR", rel, e, file=sys.stderr)
        n += 1
        if n % 1000 == 0:
            db.commit(); print(n, flush=True)
db.commit()
print("TOTAL", db.execute("SELECT COUNT(*) FROM mensajes").fetchone()[0])
