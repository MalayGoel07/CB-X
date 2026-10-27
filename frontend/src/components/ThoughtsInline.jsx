import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

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

function ThoughtsInline({ thought, loading, elapsedMs }) {
  const [open, setOpen] = useState(false);
  const logRef = useRef(null);
  const stickToBottom = useRef(true);

  // Follow the stream, unless the person has scrolled up to read.
  useEffect(() => {
    const el = logRef.current;
    if (open && el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [thought, open]);

  const handleScroll = () => {
    const el = logRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  const lines = thought ? thought.split("\n") : [];
  const seconds = Math.max(1, Math.round(elapsedMs / 1000));
  const label = loading ? `Working… ${seconds}s` : `Thought for ${seconds}s`;

  return (
    <div className="w-full max-w-[1000px] shrink-0 text-xs">      
    <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="thoughts-inline" className="flex items-center gap-1.5 font-medium text-zinc-400 transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"  >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-90" : ""}`} aria-hidden="true"/>
        {loading && (<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 motion-reduce:animate-none" aria-hidden="true" />)}{label}
      </button>

      {open && (
        <div
          id="thoughts-inline"
          ref={logRef}
          onScroll={handleScroll}
          role="log"
          aria-live="off"
          aria-label="Model thoughts"
          tabIndex={0}
          className="mt-2 ml-1.5 max-h-40 overflow-y-auto border-l border-zinc-700 pl-3 pr-2 leading-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {lines.length === 0 ? (
            <p className="text-zinc-400">Waiting for the models…</p>
          ) : (
            <ul>
              {lines.map((line, i) => {
                const { tag, text } = parseLine(line);
                return (
                  <li key={i} className="grid grid-cols-[5.5rem_1fr] gap-2 py-0.5">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                      {tag && (<><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TAG_DOTS[tag]}`} aria-hidden="true" />{tag}</>)}
                    </span>
                    <span className="whitespace-pre-wrap break-words text-zinc-400">{text || "\u00A0"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ThoughtsInline;