import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2, Loader2 } from "lucide-react";
import { useToast, focusRing } from "./ui";
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

function SettingPanel({ apiBase, onClose, onGuide }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [theme, setThemeState] = useState(getStoredTheme);
  const [scale, setScaleState] = useState(getStoredFontScale);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const cancelRef = useRef(null);

  // Panel Escape closes the panel, but not while the delete dialog is open.
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e) => e.key === "Escape" && !confirmDelete && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, confirmDelete]);

  // Dialog: focus Cancel, Escape closes it (capture phase so the panel never sees it).
  useEffect(() => {
    if (!confirmDelete) return undefined;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !deleting) {
        e.stopPropagation();
        setConfirmDelete(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [confirmDelete, deleting]);

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
    toast("Appearance reset to defaults");
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`${apiBase}/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      localStorage.removeItem("token");
      navigate("/");
    } catch {
      setDeleteError("Unable to delete your account. Please try again.");
      setDeleting(false);
    }
  };

  const option = (active) =>
    `rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${focusRing} ${
      active
        ? "border-blue-500 bg-cyan-500/10 text-cyan-300"
        : "border-zinc-700 bg-slate-950 text-zinc-300 hover:border-blue-500"
    }`;

  return (
    <div className="side-panel box-border h-screen w-[360px] max-w-[100vw] shrink-0 bg-slate-900 flex flex-col overflow-y-auto overflow-x-hidden px-3 z-50 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between px-2 py-5">
        <span className="font-mono text-[16px] font-bold tracking-[0.25em] text-blue-500 uppercase">Settings</span>
        <button
          onClick={onClose}
          aria-label="Close settings"
          className={`rounded px-1 text-[13px] font-mono text-red-400 transition-colors hover:text-red-300 ${focusRing}`}
        >
          <span aria-hidden="true">✕ </span>close
        </button>
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
        <p className="mt-2 text-[11px] text-zinc-400">System follows your device&apos;s light or dark setting.</p>
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
          className={`w-full accent-cyan-400 ${focusRing}`}
        />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {FONT_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => chooseScale(p.value)}
              aria-pressed={Math.abs(scale - p.value) < 0.01}
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
          onClick={onGuide}
          className={`mb-3 h-[44px] w-full rounded-xl border border-cyan-500/50 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/10 ${focusRing}`}
        >
          Take the tour
        </button>
        <button
          onClick={reset}
          className={`w-full h-[44px] rounded-xl border border-zinc-500 text-sm font-medium text-zinc-200 hover:border-blue-500 transition-colors ${focusRing}`}
        >
          Reset to defaults
        </button>
      </div>

      <section className="space-y-2 border-t border-zinc-800 px-1 py-4" aria-labelledby="account-heading">
        <h2 id="account-heading" className="mb-3 text-sm font-medium text-zinc-100">Account</h2>
        <button
          onClick={logout}
          className={`flex h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-500 text-sm font-medium text-zinc-200 transition-colors hover:border-blue-500 ${focusRing}`}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
        </button>
        <button
          onClick={() => { setDeleteError(""); setConfirmDelete(true); }}
          className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-500/60 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete account
        </button>
      </section>

      {confirmDelete &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="del-title"
              aria-describedby="del-desc"
              className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-slate-900 p-5 shadow-2xl shadow-black/60"
            >
              <h2 id="del-title" className="text-base font-semibold text-zinc-100">Delete your account?</h2>
              <p id="del-desc" className="mt-2 text-sm text-zinc-400">
                This permanently deletes your account, chats and all stored files. It can&apos;t be undone.
              </p>
              {deleteError && <p role="alert" className="mt-3 text-xs text-red-400">{deleteError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  ref={cancelRef}
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className={`rounded-xl border border-zinc-600 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-blue-500 disabled:opacity-40 ${focusRing}`}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="flex items-center gap-2 rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                  {deleting ? "Deleting…" : "Delete account"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default SettingPanel;