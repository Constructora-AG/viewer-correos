"use client";
import { useEffect, useMemo, useState } from "react";

type Item = {
  id: number; cuenta: string; carpeta: string; fecha: string; asunto: string;
  deNombre: string; de: string; para: string; nAdj: number; extracto: string;
};
type Resultado = {
  total: number; pagina: number; paginas: number; items: Item[];
  cuentas: [string, number][]; carpetas: [string, number][];
};
type Mensaje = {
  id: number; cuenta: string; carpeta: string; fecha: string; asunto: string;
  de: string; para: string; cc: string; html: string | null; texto: string | null;
  adjuntos: { i: number; nombre: string; tipo: string; tamano: number }[];
};

const CARPETAS: Record<string, string> = {
  INBOX: "Recibidos", Sent: "Enviados", Drafts: "Borradores", Trash: "Papelera",
  Junk: "Spam", Archive: "Archivo", Borrador: "Borradores",
};
const nombreCarpeta = (c: string) => c.split("/").map((p) => CARPETAS[p] ?? p).join(" / ");

const fechaCorta = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
};
const fechaLarga = (iso: string) =>
  iso ? new Date(iso).toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" }) : "Sin fecha";
const tamano = (b: number) =>
  b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

function Icon({ d, className = "w-4 h-4" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  );
}
const CLIP = "M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48";
const DOWNLOAD = "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3";
const CLOSE = "M18 6L6 18M6 6l12 12";

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function Visor() {
  const [cuenta, setCuenta] = useState("");
  const [carpeta, setCarpeta] = useState("");
  const [q, setQ] = useState("");
  const [de, setDe] = useState("");
  const [para, setPara] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [adjuntos, setAdjuntos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [data, setData] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState<number | null>(null);

  const filtros = useDebounced({ q, de, para, desde, hasta });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (cuenta) p.set("cuenta", cuenta);
    if (carpeta) p.set("carpeta", carpeta);
    for (const [k, v] of Object.entries(filtros)) if (v) p.set(k, v);
    if (adjuntos) p.set("adjuntos", "1");
    p.set("pagina", String(pagina));
    return p.toString();
  }, [cuenta, carpeta, filtros, adjuntos, pagina]);

  useEffect(() => { setPagina(1); }, [cuenta, carpeta, filtros, adjuntos]);

  useEffect(() => {
    let cancel = false;
    setCargando(true);
    fetch("/api/search?" + query)
      .then(async (r) => {
        if (r.status === 401) { window.location.href = "/login"; return; }
        if (!r.ok) throw new Error();
        const d = (await r.json()) as Resultado;
        if (!cancel) { setData(d); setError(""); }
      })
      .catch(() => !cancel && setError("No se pudieron cargar los correos. Recarga la página."))
      .finally(() => !cancel && setCargando(false));
    return () => { cancel = true; };
  }, [query]);

  const limpiar = () => { setQ(""); setDe(""); setPara(""); setDesde(""); setHasta(""); setAdjuntos(false); };
  const hayFiltros = q || de || para || desde || hasta || adjuntos;
  const totalCuentas = data?.cuentas.reduce((s, [, n]) => s + n, 0) ?? 0;

  async function salir() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const input = "h-10 px-3 text-sm border border-line rounded-lg bg-white focus:border-primary outline-none w-full";

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-line">
        <div>
          <h1 className="text-base font-bold leading-tight">Respaldo de correos</h1>
          <p className="text-xs text-muted">AG Constructora · solo consulta</p>
        </div>
        <button onClick={salir} className="text-sm text-muted hover:text-fg cursor-pointer px-3 h-10">Salir</button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Cuentas y carpetas */}
        <aside className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-line overflow-y-auto bg-subtle/60">
          <nav aria-label="Cuentas" className="p-3">
            <h2 className="px-2 mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Cuentas</h2>
            <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1">
              <li>
                <button onClick={() => { setCuenta(""); setCarpeta(""); }}
                  className={`w-full whitespace-nowrap flex justify-between gap-3 px-2 h-9 items-center rounded-md text-sm cursor-pointer ${!cuenta ? "bg-primary text-white" : "hover:bg-white"}`}>
                  <span>Todas</span><span className="tabular-nums opacity-80">{totalCuentas.toLocaleString("es-CO")}</span>
                </button>
              </li>
              {data?.cuentas.map(([c, n]) => (
                <li key={c}>
                  <button onClick={() => { setCuenta(c); setCarpeta(""); }}
                    className={`w-full whitespace-nowrap flex justify-between gap-3 px-2 h-9 items-center rounded-md text-sm cursor-pointer ${cuenta === c ? "bg-primary text-white" : "hover:bg-white"}`}>
                    <span className="truncate">{c}</span><span className="tabular-nums opacity-80">{n.toLocaleString("es-CO")}</span>
                  </button>
                </li>
              ))}
            </ul>
            {cuenta && data && (
              <>
                <h2 className="px-2 mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Carpetas</h2>
                <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1">
                  <li>
                    <button onClick={() => setCarpeta("")}
                      className={`w-full whitespace-nowrap text-left px-2 h-8 rounded-md text-sm cursor-pointer ${!carpeta ? "font-semibold text-primary" : "hover:bg-white"}`}>
                      Todas las carpetas
                    </button>
                  </li>
                  {data.carpetas.map(([c, n]) => (
                    <li key={c}>
                      <button onClick={() => setCarpeta(c)}
                        className={`w-full whitespace-nowrap flex justify-between gap-3 px-2 h-8 items-center rounded-md text-sm cursor-pointer ${carpeta === c ? "font-semibold text-primary" : "hover:bg-white"}`}>
                        <span className="truncate">{nombreCarpeta(c)}</span><span className="tabular-nums text-muted">{n}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>
        </aside>

        {/* Filtros y lista */}
        <section className="flex-1 min-w-0 min-h-0 flex flex-col" aria-label="Correos">
          <div className="p-3 border-b border-line grid gap-2 grid-cols-2 md:grid-cols-6">
            <div className="col-span-2 md:col-span-6">
              <label htmlFor="q" className="sr-only">Buscar en asunto, texto o adjuntos</label>
              <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar en asunto, texto o nombre de adjunto…" className={input} />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label htmlFor="de" className="block text-xs font-medium text-muted mb-1">De (remitente)</label>
              <input id="de" value={de} onChange={(e) => setDe(e.target.value)} placeholder="correo o nombre" className={input} />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label htmlFor="para" className="block text-xs font-medium text-muted mb-1">Para / CC (destinatario)</label>
              <input id="para" value={para} onChange={(e) => setPara(e.target.value)} placeholder="correo o nombre" className={input} />
            </div>
            <div>
              <label htmlFor="desde" className="block text-xs font-medium text-muted mb-1">Desde</label>
              <input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="hasta" className="block text-xs font-medium text-muted mb-1">Hasta</label>
              <input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={input} />
            </div>
            <div className="col-span-2 md:col-span-6 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={adjuntos} onChange={(e) => setAdjuntos(e.target.checked)} className="w-4 h-4 accent-primary" />
                Solo con adjuntos
              </label>
              <div className="flex items-center gap-3 text-sm text-muted">
                <span aria-live="polite">{data ? `${data.total.toLocaleString("es-CO")} correos` : ""}</span>
                {hayFiltros && <button onClick={limpiar} className="text-primary hover:underline cursor-pointer">Limpiar filtros</button>}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {error && <p role="alert" className="p-4 text-sm text-danger">{error}</p>}
            {!error && cargando && !data && <p className="p-4 text-sm text-muted">Cargando correos…</p>}
            {!error && data?.total === 0 && <p className="p-4 text-sm text-muted">No hay correos con esos filtros.</p>}
            <ul className={cargando ? "opacity-60 transition-opacity" : "transition-opacity"}>
              {data?.items.map((m) => (
                <li key={m.id}>
                  <button onClick={() => setAbierto(m.id)}
                    className={`w-full text-left px-4 py-3 border-b border-line cursor-pointer transition-colors ${abierto === m.id ? "bg-subtle" : "hover:bg-subtle/60"}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold truncate">
                        {m.carpeta.startsWith("Sent") ? `Para: ${m.para || "—"}` : m.deNombre || m.de || "(sin remitente)"}
                      </span>
                      <span className="text-xs text-muted shrink-0 tabular-nums">{fechaCorta(m.fecha)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm truncate">{m.asunto || "(sin asunto)"}</span>
                      {m.nAdj > 0 && <span className="text-muted shrink-0" title={`${m.nAdj} adjunto(s)`}><Icon d={CLIP} className="w-3.5 h-3.5" /></span>}
                    </div>
                    <div className="flex gap-2 mt-0.5 text-xs text-muted">
                      {!cuenta && <span className="shrink-0 font-medium text-primary">{m.cuenta}</span>}
                      <span className="shrink-0">{nombreCarpeta(m.carpeta)}</span>
                      <span className="truncate">{m.extracto}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {data && data.paginas > 1 && (
              <nav className="flex items-center justify-center gap-3 p-4 text-sm" aria-label="Paginación">
                <button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}
                  className="h-10 px-4 border border-line rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-default">Anterior</button>
                <span className="tabular-nums">Página {data.pagina} de {data.paginas}</span>
                <button disabled={pagina >= data.paginas} onClick={() => setPagina(pagina + 1)}
                  className="h-10 px-4 border border-line rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-default">Siguiente</button>
              </nav>
            )}
          </div>
        </section>

        {abierto !== null && <Lector id={abierto} onClose={() => setAbierto(null)} />}
      </div>
    </div>
  );
}

function Lector({ id, onClose }: { id: number; onClose: () => void }) {
  const [m, setM] = useState<Mensaje | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    setM(null); setError("");
    fetch(`/api/msg/${id}`)
      .then(async (r) => { if (!r.ok) throw new Error(); const d = await r.json(); if (!cancel) setM(d); })
      .catch(() => !cancel && setError("No se pudo abrir este correo."));
    return () => { cancel = true; };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const doc = m?.html
    ? `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font-family:Arial,sans-serif;font-size:14px;color:#0f172a;margin:16px;word-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${m.html}</body></html>`
    : null;

  return (
    <article className="fixed inset-0 z-20 bg-white lg:static lg:z-auto lg:w-[46%] xl:w-[50%] shrink-0 lg:border-l border-line flex flex-col min-h-0" aria-label="Correo">
      <div className="flex items-start justify-between gap-3 p-4 border-b border-line">
        <div className="min-w-0">
          <h2 className="text-base font-bold break-words">{m ? m.asunto || "(sin asunto)" : error ? "Error" : "Cargando…"}</h2>
          {m && (
            <dl className="mt-2 text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <dt className="text-muted">De</dt><dd className="break-all">{m.de}</dd>
              <dt className="text-muted">Para</dt><dd className="break-all">{m.para || "—"}</dd>
              {m.cc && (<><dt className="text-muted">CC</dt><dd className="break-all">{m.cc}</dd></>)}
              <dt className="text-muted">Fecha</dt><dd>{fechaLarga(m.fecha)}</dd>
              <dt className="text-muted">Cuenta</dt><dd>{m.cuenta} · {nombreCarpeta(m.carpeta)}</dd>
            </dl>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {m && (
            <a href={`/api/raw/${m.id}`} title="Descargar correo original (.eml)"
              className="h-10 px-3 inline-flex items-center gap-1.5 text-sm border border-line rounded-lg hover:bg-subtle">
              <Icon d={DOWNLOAD} /> .eml
            </a>
          )}
          <button onClick={onClose} aria-label="Cerrar correo" className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-subtle cursor-pointer">
            <Icon d={CLOSE} className="w-5 h-5" />
          </button>
        </div>
      </div>

      {m && m.adjuntos.length > 0 && (
        <ul className="flex flex-wrap gap-2 p-3 border-b border-line" aria-label="Adjuntos">
          {m.adjuntos.map((a) => (
            <li key={a.i}>
              <a href={`/api/att/${m.id}/${a.i}`}
                className="inline-flex items-center gap-2 h-9 px-3 text-sm border border-line rounded-lg hover:bg-subtle max-w-72">
                <Icon d={CLIP} className="w-3.5 h-3.5 shrink-0 text-muted" />
                <span className="truncate">{a.nombre}</span>
                <span className="text-xs text-muted shrink-0">{tamano(a.tamano)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {error && <p role="alert" className="p-4 text-sm text-danger">{error}</p>}
        {doc ? (
          // sandbox sin permisos: el HTML del correo no puede ejecutar scripts ni acceder al visor.
          <iframe title="Contenido del correo" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={doc} className="w-full h-full min-h-[60vh] border-0" />
        ) : m ? (
          <pre className="p-4 text-sm whitespace-pre-wrap break-words font-sans">{m.texto || "(correo sin contenido de texto)"}</pre>
        ) : null}
      </div>
    </article>
  );
}
