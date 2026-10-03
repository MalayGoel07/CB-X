import { useEffect, useState } from "react";
import { X, Cpu, Route, Search, Code, PenLine, Sigma, Merge, RotateCw } from "lucide-react";
import { fetchConfiguredModels } from "../api/models";

const ROLE_ICONS = { router: Route, research: Search, cod: Code, writ: PenLine, math: Sigma, merg: Merge };

const iconForRole = (role) => {
  const key = Object.keys(ROLE_ICONS).find((k) => String(role).toLowerCase().includes(k));
  return key ? ROLE_ICONS[key] : Cpu;
};

function ModelsPanel({ onClose }) {
  const [models, setModels] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isCurrentRequest = true;
    fetchConfiguredModels()
      .then((data) => {
        if (isCurrentRequest) {
          setModels(data);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (isCurrentRequest) {
          console.error("Failed to load configured models:", error);
          setStatus("error");
        }
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [retryCount]);

  const load = () => {
    setStatus("loading");
    setRetryCount((count) => count + 1);
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="z-50 flex w-[350px] flex-col overflow-y-auto border-r border-zinc-800 bg-slate-900 p-4">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-[18px] font-medium uppercase tracking-widest text-blue-500">Models</span>
        <button
          onClick={onClose}
          aria-label="Close models"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p className="mb-3 text-xs text-zinc-400">The model currently configured for each role.</p>

      {status === "loading" && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading models">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-950 motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">Unable to load configured models.</p>
          <button
            onClick={load}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-300 transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
        </div>
      )}

      {status === "ready" && models.length === 0 && (
        <p className="py-3 text-sm text-zinc-400">No models are configured yet.</p>
      )}

      {status === "ready" && models.length > 0 && (
        <ul className="flex flex-col">
          {models.map(({ role, model }, i) => {
            const Icon = iconForRole(role);
            return (
              <li
                key={role}
                className={`flex items-center justify-between gap-3 py-3 ${
                  i < models.length - 1 ? "border-b border-zinc-800" : ""
                }`}
              >
                <span className="flex shrink-0 items-center gap-2.5 text-sm font-medium text-zinc-100">
                  <Icon className="h-4 w-4 text-blue-400" aria-hidden="true" />
                  {role}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-mono text-xs text-zinc-400" title={model || undefined}>
                    {model || "Not configured"}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${model ? "bg-emerald-500" : "bg-zinc-600"}`}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ModelsPanel;