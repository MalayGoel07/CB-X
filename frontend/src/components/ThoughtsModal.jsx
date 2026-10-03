import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// Dots (not coloured text) so tags stay readable in both the dark and light themes.
const TAG_DOTS = {
  Router: "bg-red-400",
  Math: "bg-indigo-400",
  Merger: "bg-green-400",
  Coder: "bg-blue-400",
  Writer: "bg-yellow-300",
  Researcher: "bg-slate-400",
  Final: "bg-teal-400",
};

const TAG_PATTERN = /^\[(\w+)\]\s?/;

function parseLine(line) {
  const match = line.match(TAG_PATTERN);
  if (match && TAG_DOTS[match[1]]) {
    return { tag: match[1], text: line.slice(match[0].length) };
  }
  return { tag: null, text: line };
}

function ThoughtsModal({ thought, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const logRef = useRef(null);
  const stickToBottom = useRef(true);

  // Focus the dialog on open and hand focus back when it closes.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Follow the stream, unless the person has scrolled up to read.
  useEffect(() => {
    const el = logRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [thought]);

  const handleScroll = () => {
    const el = logRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  // Keep Tab inside the dialog.
  const handleKeyDown = (e) => {
    if (e.key !== "Tab") return;
    const focusable = dialogRef.current.querySelectorAll("button, [tabindex='0']");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const lines = thought ? thought.split("\n") : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="thoughts-title"
        onKeyDown={handleKeyDown}
        className="w-full max-w-[800px] rounded-3xl border border-zinc-500 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 id="thoughts-title" className="text-lg font-semibold text-cyan-400">
              AI thoughts
            </h2>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 motion-reduce:animate-none" aria-hidden="true" />
              Working
            </span>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close AI thoughts"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          ref={logRef}
          onScroll={handleScroll}
          role="log"
          aria-live="off"
          aria-label="Model thoughts"
          tabIndex={0}
          className="max-h-[60vh] overflow-y-auto rounded-lg pr-2 scrollbar-thin scrollbar-thumb-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {lines.length === 0 ? (
            <p className="text-sm text-zinc-300">No thoughts yet. They'll appear here as the models work.</p>
          ) : (
            <ul>
              {lines.map((line, i) => {
                const { tag, text } = parseLine(line);
                return (
                  <li key={i} className="grid grid-cols-[6.5rem_1fr] gap-2 py-0.5 text-sm leading-6">
                    <span className="flex items-center gap-2 font-medium text-zinc-100">
                      {tag && (
                        <>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${TAG_DOTS[tag]}`} aria-hidden="true" />
                          {tag}
                        </>
                      )}
                    </span>
                    <span className="whitespace-pre-wrap break-words text-zinc-300">{text || "\u00A0"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ThoughtsModal;