import { useState } from "react";
import {
  FONT_MIN,
  FONT_MAX,
  FONT_PRESETS,
  getStoredTheme,
  getStoredFontScale,
  setTheme,
  setFontScale,
} from "../appearance";

const THEMES = [
  { id: "dark", label: "Dark", swatch: ["#0a0f18", "#0f172a", "#22d3ee"] },
  { id: "light", label: "Light", swatch: ["#f4f6fb", "#ffffff", "#0e7490"] },
  { id: "system", label: "System", swatch: ["#0a0f18", "#f4f6fb", "#3b82f6"] },
];

function SettingPanel({ onClose }) {
  const [theme, setThemeState] = useState(getStoredTheme);
  const [scale, setScaleState] = useState(getStoredFontScale);

  const chooseTheme = (id) => {
    setThemeState(id);
    setTheme(id);
  };

  const chooseScale = (value) => {
    setScaleState(value);
    setFontScale(value);
  };

  const reset = () => {
    chooseTheme("dark");
    chooseScale(1);
  };

  const option = (active) =>
    `rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
      active
        ? "border-blue-500 bg-cyan-500/10 text-cyan-300"
        : "border-zinc-700 bg-slate-950 text-zinc-300 hover:border-blue-500"
    }`;

  return (
    <div className="box-border h-screen w-[360px] max-w-[100vw] shrink-0 bg-slate-900 flex flex-col overflow-y-auto overflow-x-hidden px-3 z-50 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between px-2 py-5">
        <span className="font-mono text-[16px] font-bold tracking-[0.25em] text-blue-500 uppercase">Settings</span>
        <button onClick={onClose} className="text-[13px] font-mono text-red-400 transition-colors">✕ close</button>
      </div>

      <section className="px-1 py-4 border-b border-zinc-800" aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="text-sm font-medium text-zinc-100 mb-3">Theme</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="theme-heading">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={theme === t.id}
              onClick={() => chooseTheme(t.id)}
              className={`${option(theme === t.id)} flex flex-col items-center gap-2`}
            >
              <span className="flex h-8 w-full overflow-hidden rounded-lg border border-zinc-700">
                {t.swatch.map((c) => (
                  <span key={c} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </span>
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">System follows your device's light or dark setting.</p>
      </section>

      <section className="px-1 py-4 border-b border-zinc-800" aria-labelledby="font-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="font-heading" className="text-sm font-medium text-zinc-100">Font size</h2>
          <span className="text-xs font-mono text-zinc-400">{Math.round(scale * 100)}%</span>
        </div>
        <input
          type="range"
          min={FONT_MIN}
          max={FONT_MAX}
          step={0.05}
          value={scale}
          onChange={(e) => chooseScale(parseFloat(e.target.value))}
          aria-label="Font size"
          className="w-full accent-cyan-400"
        />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {FONT_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => chooseScale(p.value)}
              className={option(Math.abs(scale - p.value) < 0.01)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-slate-950 px-4 py-3">
          <p className="text-xs font-semibold mb-1 text-blue-400">Preview</p>
          <p className="text-sm leading-7 text-zinc-100">
            The quick brown fox jumps over the lazy dog.
          </p>
        </div>
      </section>

      <div className="px-1 py-4">
        <button
          onClick={reset}
          className="w-full h-[44px] rounded-xl border border-zinc-500 text-sm font-medium text-zinc-200 hover:border-blue-500 transition-colors"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

export default SettingPanel;