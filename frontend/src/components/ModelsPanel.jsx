import { useEffect, useState } from "react";
import { X, Cpu, Route, Search, Code, PenLine, Sigma, Merge, RotateCw, RotateCcw, KeyRound } from "lucide-react";
import { isLocalMode, listLocalModels } from "../api/localBase";

const ROLE_ICONS = { router: Route, research: Search, cod: Code, writ: PenLine, math: Sigma, merg: Merge };
const iconForRole = (role) => ROLE_ICONS[Object.keys(ROLE_ICONS).find((k) => String(role).toLowerCase().includes(k))] ?? Cpu;
const toDraft = (list) => Object.fromEntries(list.map((r) => [r.role, r.custom ? r.model : ""]));
const toKeyDraft = (list) => Object.fromEntries(list.map((r) => [r.role, r.key || ""]));

const req = async (url, opts = {}) => {
  const r = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, ...(opts.body && { "Content-Type": "application/json" }) },
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.detail ?? `HTTP ${r.status}`);
  if (d === null) throw new Error("Server returned a non-JSON response");
  return d;
};

function ModelsPanel({ apiBase, onClose }) {
  const localMode = isLocalMode();
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({}); // role -> text typed by the user, "" = default
  const [keyDraft, setKeyDraft] = useState({});
  const [commonKey, setCommonKey] = useState("");
  const [commonProvider, setCommonProvider] = useState("openai");
  const [providerDraft, setProviderDraft] = useState({});
  const [savedCommonKey, setSavedCommonKey] = useState("");
  const [installed, setInstalled] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  useEffect(() => {
    let off = false;
    Promise.all([
      req(`${apiBase}/me/models`),
      localMode ? listLocalModels().catch(() => []) : Promise.resolve([]),
    ])
      .then(([m, i]) => {
        if (off) return;
        setRows(m.models); setDraft(toDraft(m.models)); setKeyDraft(toKeyDraft(m.models)); setProviderDraft(Object.fromEntries(m.models.map((r) => [r.role, r.provider || "openai"]))); setCommonKey(m.common_key || ""); setCommonProvider(m.common_provider || "openai"); setSavedCommonKey(m.common_key || ""); setInstalled(i); setStatus("ready");
      })
      .catch((e) => { if (!off) { console.error("Failed to load models:", e); setStatus("error"); } });
    return () => { off = true; };
  }, [apiBase, localMode, tick]);

  const retry = () => { setStatus("loading"); setTick((t) => t + 1); };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasApiKey = (role) => Boolean(commonKey.trim() || (keyDraft[role] ?? "").trim());
  const dirty = rows.some((r) => (draft[r.role] ?? "").trim() !== (r.model || "") || (keyDraft[r.role] ?? "").trim() !== (r.key || "")) || commonKey.trim() !== savedCommonKey;

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const keys = Object.fromEntries(rows.map((r) => [r.role, { key: keyDraft[r.role] || "", provider: providerDraft[r.role] || "openai" }]));
      const d = await req(`${apiBase}/me/models`, { method: "PUT", body: JSON.stringify({ models: draft, keys, common_key: commonKey, common_provider: commonProvider }) });
      setRows(d.models); setDraft(toDraft(d.models)); setKeyDraft(toKeyDraft(d.models)); setProviderDraft(Object.fromEntries(d.models.map((r) => [r.role, r.provider || "openai"]))); setCommonKey(d.common_key || ""); setCommonProvider(d.common_provider || "openai"); setSavedCommonKey(d.common_key || ""); setMsg({ ok: true, text: "Saved." });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="models-scrollbar z-50 flex w-[350px] flex-col overflow-y-auto border-r border-zinc-800 bg-slate-900 p-4">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-[18px] font-medium uppercase tracking-widest text-blue-500">Models</span>
        <button onClick={onClose} aria-label="Close models" className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mb-3 text-xs text-zinc-400">Choose a model for each worker and optionally add its API key. Leave a model blank to use the default.</p>

      {status === "loading" && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading models">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-950 motion-reduce:animate-none" />)}
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">Unable to load models.</p>
          <button onClick={retry} className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-300 transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {status === "ready" && (
        <>
          {localMode && <datalist id="installed-models">{installed.map((m) => <option key={m} value={m} />)}</datalist>}
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5">
            <label htmlFor="main-common-key" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-100"><KeyRound className="h-4 w-4 text-blue-400" aria-hidden="true" /> Main common API key</label>
            <div className="flex items-center gap-1">
              <select value={commonProvider} onChange={(e) => setCommonProvider(e.target.value)} className="rounded-lg border border-zinc-700 bg-slate-950 px-2 py-1.5 text-xs text-zinc-100">{["openai","openrouter","anthropic","google","grok"].map((p) => <option key={p} value={p}>{p}</option>)}</select>
              <input id="main-common-key" type="password" value={commonKey} placeholder="Optional shared key" onChange={(e) => setCommonKey(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-blue-500" />
              <button onClick={() => setCommonKey("")} disabled={!commonKey} aria-label="Remove common API key" title="Remove key" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </div>
            <p className="mt-1.5 text-[11px] text-red-300">(Only used for single api key case)</p>
          </div>
          {rows.length === 0 ? (
            <p className="rounded-lg border border-zinc-800 bg-slate-950 p-3 text-xs text-zinc-400">No API models configured.</p>
          ) : (
          <ul className="flex flex-col">
            {rows.map(({ role, default: def, custom }, i) => {
              const Icon = iconForRole(role);
              const value = draft[role] ?? "";
              const apiConfigured = hasApiKey(role);
              return (
                <li key={role} className={`py-3 ${i < rows.length - 1 ? "border-b border-zinc-800" : ""}`}>
                  <label htmlFor={`m-${role}`} className="mb-1.5 flex items-center gap-2.5 text-sm font-medium text-zinc-100">
                    <Icon className="h-4 w-4 text-blue-400" aria-hidden="true" />
                    {role}
                    {custom && <span className="rounded bg-cyan-500/10 px-1.5 text-[10px] uppercase text-cyan-300">custom</span>}
                    {apiConfigured && <span className="rounded bg-emerald-500/10 px-1.5 text-[10px] uppercase text-emerald-300">(Api)</span>}
                  </label>
                  <div className="flex items-center gap-1">
                    <select id={`m-${role}`} value={value} onChange={(e) => setDraft((d) => ({ ...d, [role]: e.target.value }))} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-zinc-100 outline-none focus:border-blue-500">
                      <option value="">{localMode && def ? `Local default (${def})` : "Use provider default"}</option>
                      {[...new Set([(localMode ? def : ""), ...(localMode ? installed : []), value].filter(Boolean))].map((model) => <option key={model} value={model}>{model}</option>)}
                    </select>
                    <button
                      onClick={() => setDraft((d) => ({ ...d, [role]: "" }))} disabled={!value}
                      aria-label={`Reset ${role} to default`} title="Reset to default"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <select value={providerDraft[role] || "openai"} onChange={(e) => setProviderDraft((d) => ({ ...d, [role]: e.target.value }))} className="rounded-lg border border-zinc-700 bg-slate-950 px-2 py-1.5 text-xs text-zinc-100">{["openai","openrouter","anthropic","google","grok"].map((p) => <option key={p} value={p}>{p}</option>)}</select>
                    <input id={`k-${role}`} type="password" value={keyDraft[role] ?? ""} placeholder="Optional worker API key" onChange={(e) => setKeyDraft((d) => ({ ...d, [role]: e.target.value }))} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-blue-500" />
                    <button onClick={() => setKeyDraft((d) => ({ ...d, [role]: "" }))} disabled={!keyDraft[role]} aria-label={`Remove ${role} API key`} title="Remove key" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
          )}

          {msg && <p role="status" className={`mt-3 text-xs ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
          <button
            onClick={save} disabled={!dirty || saving}
            className="mt-3 rounded-xl border border-cyan-500/50 px-3 py-2 text-sm text-cyan-300 transition-colors hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </>
      )}
    </div>
  );
}

export default ModelsPanel;