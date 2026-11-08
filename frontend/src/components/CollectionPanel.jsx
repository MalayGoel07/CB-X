import { useEffect, useMemo, useState } from "react";
import { X, Trash2, Search, Download, RefreshCw, FolderOpen, FileText, FileSpreadsheet, FileImage, FileCode, File as FileIcon } from "lucide-react";
import { ConfirmButton, downloadFile, focusRing, iconBtn } from "./ui";

const TTL = 7; // days, keep in sync with expireAfterSeconds in db.py
const TYPES = [[FileSpreadsheet, "xlsx xls csv"], [FileImage, "png jpg jpeg webp gif svg"], [FileCode, "py js jsx ts json html css md"], [FileText, "pdf docx doc pptx txt"]];

const iconFor = (n) => TYPES.find(([, e]) => e.split(" ").includes(n.split(".").pop().toLowerCase()))?.[0] ?? FileIcon;
const size = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const msLeft = (created) => new Date(created).getTime() + TTL * 864e5 - Date.now();
const expiresIn = (created) => {
  const left = msLeft(created);
  const d = Math.floor(left / 864e5);
  return d >= 1 ? `Expires in ${d}d` : `Expires in ${Math.max(1, Math.floor(left / 36e5))}h`;
};
const req = async (url, opts) => {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
};

function CollectionPanel({ apiBase, onClose }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let off = false;
    req(`${apiBase}/files`)
      .then((r) => r.json())
      .then((d) => { if (!off) { setFiles(d.files ?? []); setStatus("ready"); } })
      .catch((e) => { if (!off) { console.error("Failed to load files:", e); setStatus("error"); } });
    return () => { off = true; };
  }, [apiBase, tick]);

  const refresh = () => { setStatus("loading"); setTick((t) => t + 1); };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const act = async (file, fn, verb) => {
    setBusyId(file.id); setError("");
    try { await fn(); } catch { setError(`Could not ${verb} ${file.name}.`); }
    finally { setBusyId(null); }
  };

  const download = (f) => act(f, () => downloadFile(apiBase, { url: `/files/${f.id}`, name: f.name }), "download");
  const remove = (f) => act(f, async () => {
    await req(`${apiBase}/files/${f.id}`, { method: "DELETE" });
    setFiles((p) => p.filter((x) => x.id !== f.id));
  }, "delete");

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => files.filter((f) => !q || f.name.toLowerCase().includes(q)),
    [files, q],
  );

  return (
    <div className="side-panel z-50 box-border flex h-screen w-[350px] max-w-[100vw] shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-slate-900 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between py-2">
        <span className="text-[18px] font-medium uppercase tracking-widest text-blue-500">Collection</span>
        <div className="flex items-center gap-1">
          <button onClick={refresh} disabled={status === "loading"} aria-label="Refresh files" title="Refresh" className={`${iconBtn} hover:text-cyan-300`}>
            <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
          </button>
          <button onClick={onClose} aria-label="Close collection" className={`${iconBtn} hover:text-red-400`}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">Files your orchestrator created. Kept for {TTL} days.</p>
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}

      {files.length > 0 && (
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files"
            aria-label="Search files"
            className="w-full rounded-xl border border-zinc-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
          />
        </div>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-200">
        {status === "error" && <p className="text-sm text-red-400">Couldn&apos;t load files. Try refresh.</p>}
        {status === "ready" && !files.length && (
          <div className="mt-10 flex flex-col items-center gap-2 text-center text-zinc-500">
            <FolderOpen className="h-10 w-10" aria-hidden="true" />
            <p className="text-sm">No files yet. Ask for a document, sheet or image and it will show up here.</p>
          </div>
        )}
        {status === "ready" && files.length > 0 && visible.length === 0 && (
          <p role="status" className="text-sm text-zinc-400">No files match &ldquo;{query.trim()}&rdquo;.</p>
        )}

        <ul className="space-y-2">
          {visible.map((f) => {
            const Icon = iconFor(f.name);
            const busy = busyId === f.id;
            const expired = msLeft(f.created) <= 0;
            return (
              <li key={f.id} className={`flex items-center gap-2 rounded-2xl border bg-slate-950 px-3 py-2 text-sm transition-colors ${expired ? "border-zinc-800 opacity-70" : "border-zinc-700 hover:border-blue-500"}`}>
                <Icon className={`h-5 w-5 shrink-0 ${expired ? "text-zinc-500" : "text-cyan-400"}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-100" title={f.name}>{f.name}</p>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500">
                    <span>{size(f.size)} · {new Date(f.created).toLocaleDateString()}</span>
                    {expired
                      ? <span className="rounded bg-red-500/10 px-1.5 text-[10px] font-medium uppercase text-red-300">Expired</span>
                      : <span>· {expiresIn(f.created)}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    onClick={() => download(f)}
                    disabled={busy || expired}
                    aria-label={expired ? `${f.name} has expired` : `Download ${f.name}`}
                    title={expired ? "Expired" : "Download"}
                    className={`${iconBtn} hover:text-cyan-300`}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <ConfirmButton onConfirm={() => remove(f)} label={`Delete ${f.name}`} disabled={busy}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </ConfirmButton>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default CollectionPanel;