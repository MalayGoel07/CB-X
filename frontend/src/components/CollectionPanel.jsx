import { useEffect, useState } from "react";
import { X, Trash2, Check, Download, RefreshCw, FolderOpen, FileText, FileSpreadsheet, FileImage, FileCode, File as FileIcon } from "lucide-react";

const TTL = 7; // days, keep in sync with expireAfterSeconds in db.py
const btn = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";
const TYPES = [[FileSpreadsheet, "xlsx xls csv"], [FileImage, "png jpg jpeg webp gif svg"], [FileCode, "py js jsx ts json html css md"], [FileText, "pdf docx doc pptx txt"]];

const iconFor = (n) => TYPES.find(([, e]) => e.split(" ").includes(n.split(".").pop().toLowerCase()))?.[0] ?? FileIcon;
const size = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const expiresIn = (c) => {
  const left = new Date(c).getTime() + TTL * 864e5 - Date.now();
  if (left <= 0) return "Expiring soon";
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
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

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
    finally { setBusyId(null); setConfirmId(null); }
  };

  const download = (f) => act(f, async () => {
    const url = URL.createObjectURL(await (await req(`${apiBase}/files/${f.id}`)).blob());
    Object.assign(document.createElement("a"), { href: url, download: f.name }).click();
    URL.revokeObjectURL(url);
  }, "download");

  const remove = (f) => act(f, async () => {
    await req(`${apiBase}/files/${f.id}`, { method: "DELETE" });
    setFiles((p) => p.filter((x) => x.id !== f.id));
  }, "delete");

  return (
    <div className="z-50 flex w-[350px] flex-col border-r border-zinc-800 bg-slate-900 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between py-2">
        <span className="text-[18px] font-medium uppercase tracking-widest text-blue-500">Collection</span>
        <div className="flex items-center gap-1">
          <button onClick={refresh} disabled={status === "loading"} aria-label="Refresh files" title="Refresh" className={`${btn} hover:text-cyan-300`}>
            <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
          <button onClick={onClose} aria-label="Close collection" className={`${btn} hover:text-red-400`}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">Files your orchestrator created. Kept for {TTL} days.</p>
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-200">
        {status === "error" && <p className="text-sm text-red-400">Couldn't load files. Try refresh.</p>}
        {status === "ready" && !files.length && (
          <div className="mt-10 flex flex-col items-center gap-2 text-center text-zinc-500">
            <FolderOpen className="h-10 w-10" aria-hidden="true" />
            <p className="text-sm">No files yet. Ask for a document, sheet or image and it will show up here.</p>
          </div>
        )}
        <ul className="space-y-2">
          {files.map((f) => {
            const Icon = iconFor(f.name), busy = busyId === f.id;
            return (
              <li key={f.id} className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-slate-950 px-3 py-2 text-sm transition-colors hover:border-blue-500">
                <Icon className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-100" title={f.name}>{f.name}</p>
                  <p className="text-xs text-zinc-500">{size(f.size)} · {new Date(f.created).toLocaleDateString()} · {expiresIn(f.created)}</p>
                </div>
                <div className="flex shrink-0 items-center">
                  {confirmId === f.id ? (
                    <>
                      <button onClick={() => remove(f)} disabled={busy} aria-label={`Confirm delete ${f.name}`} className={`${btn} text-red-400 hover:text-red-300`}><Check className="h-4 w-4" aria-hidden="true" /></button>
                      <button onClick={() => setConfirmId(null)} aria-label="Cancel delete" className={`${btn} hover:text-zinc-100`}><X className="h-4 w-4" aria-hidden="true" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => download(f)} disabled={busy} aria-label={`Download ${f.name}`} title="Download" className={`${btn} hover:text-cyan-300`}><Download className="h-4 w-4" aria-hidden="true" /></button>
                      <button onClick={() => setConfirmId(f.id)} disabled={busy} aria-label={`Delete ${f.name}`} title="Delete" className={`${btn} hover:text-red-400`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                    </>
                  )}
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