import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, Check, CheckCircle2, Copy } from "lucide-react";

/* ---------- shared class tokens ---------- */
export const ico = "h-3.5 w-3.5 shrink-0";
export const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";
export const iconBtn = `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;
export const downloadFile = async (apiBase, f) => {
  const r = await fetch(`${apiBase}${f.url}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const url = URL.createObjectURL(await r.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: f.name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
/* ---------- copy ---------- */
export function useCopy(text) {
  const [copied, setCopied] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(() => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  }, [text]);
  return [copied, copy];
}

export const CopyIcon = ({ copied }) => {
  const Icon = copied ? Check : Copy;
  return <Icon className={ico} aria-hidden="true" />;
};

/** Icon-only when `label` is omitted, otherwise icon + text. */
export function CopyButton({ text, label, className = "" }) {
  const [copied, copy] = useCopy(text);
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label ? `${label}` : "Copy"}
      title={copied ? "Copied" : "Copy"}
      className={`inline-flex items-center gap-1.5 rounded-md text-xs transition-colors ${focusRing} ${
        copied ? "text-green-400" : "text-zinc-400 hover:text-zinc-200"
      } ${label ? "px-1" : "h-7 w-7 justify-center"} ${className}`}
    >
      <CopyIcon copied={copied} />
      {label && (copied ? "Copied" : label)}
    </button>
  );
}

/* ---------- two-click confirm ---------- */
/** First click arms ("Delete?" for 3s), second click confirms. `children` is the idle content (an icon). */
export function ConfirmButton({
  onConfirm, label, confirmText = "Delete?", timeoutMs = 3000, disabled = false, className = "", children,
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (disabled) {
      clearTimeout(timer.current);
      setArmed(false);
    }
  }, [disabled]);

  const click = (e) => {
    e.stopPropagation();
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), timeoutMs);
      return;
    }
    clearTimeout(timer.current);
    setArmed(false);
    onConfirm();
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={disabled}
      aria-label={armed ? `Confirm: ${label}` : label}
      title={armed ? "Click again to confirm" : label}
      className={`${iconBtn} min-w-8 ${armed ? "w-auto px-2 text-red-400 hover:text-red-300" : "hover:text-red-400"} ${className}`}
    >
      {armed ? <span className="text-xs font-medium">{confirmText}</span> : children}
      {armed && <span role="status" className="sr-only">{label}. Press again to confirm.</span>}
    </button>
  );
}

/* ---------- Markdown (never uses dangerouslySetInnerHTML) ---------- */
function CodeBlock({ children }) {
  const child = Array.isArray(children) ? children[0] : children;
  const code = String(child?.props?.children ?? "").replace(/\n$/, "");
  const language = /language-(\w+)/.exec(child?.props?.className || "")?.[1];
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700 bg-slate-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <span className="font-mono text-xs text-zinc-400">{language || "code"}</span>
        <CopyButton text={code} label="Copy" />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-6 text-zinc-100"><code>{code}</code></pre>
    </div>
  );
}

// react-markdown passes a `node` prop that must not reach the DOM.
const omit = (props, ...keys) => Object.fromEntries(Object.entries(props).filter(([k]) => !keys.includes(k)));
const el = (Tag, cls) => (props) => <Tag className={cls} {...omit(props, "node")} />;

const mdComponents = {
  p: el("p", ""),
  h1: el("h1", "pt-1 text-lg font-semibold text-zinc-100"),
  h2: el("h2", "pt-1 text-base font-semibold text-zinc-100"),
  h3: el("h3", "text-sm font-semibold text-zinc-100"),
  ul: el("ul", "list-disc space-y-1 pl-5"),
  ol: el("ol", "list-decimal space-y-1 pl-5"),
  blockquote: el("blockquote", "border-l-2 border-zinc-700 pl-3 text-zinc-400"),
  hr: el("hr", "border-zinc-800"),
  th: el("th", "border border-zinc-700 bg-slate-800 px-3 py-1.5 font-semibold"),
  td: el("td", "border border-zinc-700 px-3 py-1.5"),
  a: (p) => (
    <a target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300" {...omit(p, "node")} />
  ),
  table: (p) => (
    <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs" {...omit(p, "node")} /></div>
  ),
  pre: CodeBlock,
  code: (p) => (
    <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-300" {...omit(p, "node", "className")} />
  ),
};

export const Markdown = ({ content, className = "" }) => (
  <div className={`space-y-3 break-words text-sm leading-7 text-zinc-100 ${className}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{content}</ReactMarkdown>
  </div>
);

/* ---------- Toast ---------- */
const ToastContext = createContext(() => {});
/** const toast = useToast(); toast("Saved"); toast("Failed", "error"); */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const toast = useCallback((text, kind = "ok") => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => {
          const Icon = t.kind === "error" ? AlertCircle : CheckCircle2;
          return (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded-xl border bg-slate-900 px-3.5 py-2 text-sm shadow-lg shadow-black/40 ${
                t.kind === "error" ? "border-red-500/40 text-red-300" : "border-emerald-500/40 text-emerald-300"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t.text}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}