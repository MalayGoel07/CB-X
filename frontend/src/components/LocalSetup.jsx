import { useEffect, useState } from "react";
import {
  X, Cpu, Route, Search, Code, PenLine, Sigma, Plug, CheckCircle2, AlertCircle,
  Loader2, Copy, Check, Terminal,
} from "lucide-react";
import {
  listLocalModels, getCfg, setCfg, isLocalMode, setLocalMode, ollamaUrl,
} from "../api/localBase";
import { LS } from "../api/config";

const ROLES = ["router", "research", "writer", "coder", "maths"];
const ROLE_ICONS = { router: Route, research: Search, coder: Code, writer: PenLine, maths: Sigma };

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";
const inputCls = `min-w-0 flex-1 rounded-lg border border-zinc-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-blue-500`;

function OriginStep() {
  const origin = window.location.origin;
  const [os, setOs] = useState("windows");
  const [copied, setCopied] = useState(false);

  const cmds = {
    windows: `setx OLLAMA_ORIGINS "${origin}"`,
    mac: `launchctl setenv OLLAMA_ORIGINS "${origin}"`,
    linux: `sudo systemctl edit ollama
# in the editor add:
[Service]
Environment="OLLAMA_ORIGINS=${origin}"
# save, then:
sudo systemctl restart ollama`,
  };
  const after = {
    windows: "Then quit Ollama from the system tray and open it again.",
    mac: "Then quit and reopen the Ollama app.",
    linux: "The restart command applies the change.",
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmds[os]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <section className="mt-5 border-t border-zinc-800 pt-4">
      <h4 className="mb-1 flex items-center gap-2 text-sm font-medium text-zinc-100">
        <Terminal className="h-4 w-4 text-blue-400" aria-hidden="true" />
        Allow this site to reach Ollama
      </h4>
      <p className="mb-3 text-xs text-zinc-400">Run this once on the machine where Ollama is installed.</p>

      <div role="tablist" aria-label="Operating system" className="mb-2 inline-flex rounded-lg border border-zinc-700 bg-slate-950 p-0.5">
        {Object.keys(cmds).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={os === key}
            onClick={() => { setOs(key); setCopied(false); }}
            className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${focusRing} ${
              os === key ? "bg-cyan-500/10 text-cyan-300" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="relative">
        <pre className="models-scrollbar overflow-x-auto rounded-lg border border-zinc-700 bg-slate-950 p-3 pr-10 font-mono text-[11px] leading-relaxed text-zinc-200">{cmds[os]}</pre>
        <button
          onClick={copy}
          aria-label="Copy command"
          title={copied ? "Copied" : "Copy"}
          className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-cyan-300 ${focusRing}`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </div>

      <p className="mt-2 text-xs text-zinc-400">
        {after[os]} If you already use OLLAMA_ORIGINS, add this site to it, comma-separated.{" "}
        <span className="text-red-400">Never use *.</span>
      </p>
    </section>
  );
}

export default function LocalSetup({ onClose }) {
  const [on, setOn] = useState(isLocalMode());
  const [url, setUrl] = useState(ollamaUrl());
  const [models, setModels] = useState([]);
  const [cfg, setLocalCfg] = useState(getCfg());
  const [status, setStatus] = useState("idle"); // idle | testing | ok | fail

  async function test() {
    setStatus("testing");
    localStorage.setItem(LS.url, url.trim());
    try {
      const list = await listLocalModels();
      setModels(list);
      setStatus("ok");
    } catch {
      setStatus("fail");
    }
  }

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    setCfg(cfg);
    setLocalMode(on);
    onClose?.();
    location.reload();
  }

  const ready = ROLES.every((role) => cfg[role]);

  return (
    <div className="models-scrollbar z-50 box-border flex h-screen w-[350px] max-w-[100vw] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-l border-zinc-800 bg-slate-900 p-4">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-[18px] font-medium uppercase tracking-widest text-blue-500">Local mode</span>
        {onClose && (
          <button onClick={onClose} aria-label="Close local setup" className={`flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-red-400 ${focusRing}`}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-zinc-400">Run the workers on your own Ollama instead of the server.</p>

      {/* Toggle */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-slate-950 p-2.5">
        <label htmlFor="local-toggle" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-100">
          <Cpu className="h-4 w-4 text-blue-400" aria-hidden="true" />
          Use my local Ollama
        </label>
        <button
          id="local-toggle"
          role="switch"
          aria-checked={on}
          onClick={() => setOn((v) => !v)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${focusRing} ${on ? "bg-cyan-500" : "bg-zinc-700"}`}
        >
          <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform motion-reduce:transition-none ${on ? "translate-x-4" : ""}`} />
        </button>
      </div>

      {/* Connection */}
      <label htmlFor="ollama-url" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-100">
        <Plug className="h-4 w-4 text-blue-400" aria-hidden="true" />
        Ollama address
      </label>
      <div className="flex items-center gap-1">
        <input id="ollama-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:11434" className={inputCls} />
        <button
          onClick={test}
          disabled={status === "testing" || !url.trim()}
          className={`shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
        >
          Test
        </button>
      </div>

      <div aria-live="polite" className="mt-2">
        {status === "testing" && (
          <p className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Connecting…
          </p>
        )}
        {status === "ok" && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Connected. {models.length} {models.length === 1 ? "model" : "models"} found.
          </p>
        )}
        {status === "fail" && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" aria-hidden="true" /> Couldn&apos;t reach Ollama
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-300 marker:text-zinc-500">
              <li>Ollama is running</li>
              <li>
                OLLAMA_ORIGINS includes{" "}
                <code className="rounded bg-slate-950 px-1 py-0.5 font-mono text-[11px] text-cyan-300">{window.location.origin}</code>{" "}
                and Ollama was restarted (see below)
              </li>
              <li>You clicked Allow on the browser&apos;s local network prompt</li>
              <li>You are not using Safari</li>
            </ul>
          </div>
        )}
      </div>

      {/* Role → model */}
      {status === "ok" && (
        <ul className="mt-3 flex flex-col">
          {ROLES.map((role, i) => {
            const Icon = ROLE_ICONS[role] ?? Cpu;
            return (
              <li key={role} className={`py-3 ${i < ROLES.length - 1 ? "border-b border-zinc-800" : ""}`}>
                <label htmlFor={`lm-${role}`} className="mb-1.5 flex items-center gap-2.5 text-sm font-medium text-zinc-100">
                  <Icon className="h-4 w-4 text-blue-400" aria-hidden="true" />
                  {role}
                </label>
                <select
                  id={`lm-${role}`}
                  value={cfg[role] || ""}
                  onChange={(e) => setLocalCfg({ ...cfg, [role]: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs text-zinc-100 outline-none focus:border-blue-500"
                >
                  <option value="">Select a model</option>
                  {models.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
              </li>
            );
          })}
        </ul>
      )}

      <OriginStep />

      {on && !ready && (
        <p role="status" className="mt-4 text-xs text-zinc-400">Pick a model for every role to enable Save.</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={save}
          disabled={on && !ready}
          className={`rounded-xl border border-cyan-500/50 px-3 py-2 text-sm text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
        >
          Save changes
        </button>
        <button
          onClick={onClose}
          className={`rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200 ${focusRing}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}