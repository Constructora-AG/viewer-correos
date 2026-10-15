"use client";
import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const r = await fetch("/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (r.ok) window.location.href = "/";
    else setError("Clave incorrecta. Inténtalo de nuevo.");
  }

  return (
    <main className="min-h-full flex items-center justify-center bg-subtle px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-line rounded-xl p-6 space-y-4">
        <div>
          <h1 className="text-lg font-bold">Respaldo de correos</h1>
          <p className="text-sm text-muted">AG Constructora · solo consulta</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="pw" className="text-sm font-medium">Clave de acceso</label>
          <input
            id="pw" type="password" autoFocus required value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-3 border border-line rounded-lg focus:border-primary outline-none"
            aria-invalid={!!error} aria-describedby={error ? "pw-error" : undefined}
          />
          {error && <p id="pw-error" className="text-sm text-danger">{error}</p>}
        </div>
        <button
          disabled={loading}
          className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-60"
        >
          {loading ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
