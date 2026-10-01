import { useEffect, useState } from "react";
import { fetchConfiguredModels } from "../api/models";

function ModelsPanel({ onClose }) {
  const [models, setModels] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetchConfiguredModels()
      .then(setModels)
      .catch((error) => {
        console.error("Failed to load configured models:", error);
        setLoadError("Unable to load configured models.");
      });
  }, []);

  return (
    <div className="w-[350px] border-r border-zinc-800 bg-slate-900 p-4 flex flex-col z-50">
      <div className="flex items-baseline justify-between mb-5">
        <span className="text-[18px] font-medium text-blue-500 uppercase tracking-widest">Models</span>
        <button onClick={onClose} className="text-[12px] font-mono text-red-400 transition-colors">✕ close</button>
      </div>
      <div className="flex flex-col">
        {loadError ? (
          <p className="py-3 text-sm text-red-400">{loadError}</p>
        ) : models.map(({ role, model }, i) => (
          <div key={role} className={`flex items-center justify-between py-3 ${i < models.length - 1 ? "border-b border-zinc-800" : ""}`}>
            <span className="text-sm font-medium text-zinc-100">{role}</span>
            <div className="flex items-center gap-2"><span className="text-xs font-mono text-zinc-400">{model || "Not configured"}</span><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default ModelsPanel