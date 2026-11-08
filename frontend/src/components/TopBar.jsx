const STATES = {
  online: { dot: "bg-cyan-400", pulse: true, label: "Connected", hint: "Backend is reachable and your chats are syncing." },
  connecting: { dot: "bg-amber-400", pulse: true, label: "Connecting…", hint: "Loading your chats from the server." },
  offline: {
    dot: "bg-red-400",
    pulse: false,
    label: "Backend unreachable",
    hint: "Your chats may not be saved. Check your connection and try again.",
  },
};

function TopBar({ status = "online", detail }) {
  const s = STATES[status] ?? STATES.online;

  return (
    <header className="flex items-center justify-between w-full bg-[#0a0f18]">
      <div className="flex items-center gap-3">
        <span
          role="status"
          tabIndex={0}
          aria-label={`${s.label}. ${s.hint}`}
          className="group relative flex h-5 w-5 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <span
            aria-hidden="true"
            className={`h-3 w-3 rounded-full transition-colors ${s.dot} ${s.pulse ? "animate-pulse motion-reduce:animate-none" : ""}`}
          />
          <span
            role="tooltip"
            className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-max max-w-[260px] rounded-md border border-zinc-700 bg-slate-950 px-2.5 py-1.5 text-xs text-zinc-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
          >
            <span className="block font-medium">{s.label}</span>
            <span className="block text-zinc-400">{s.hint}</span>
            {status === "offline" && detail && <span className="mt-1 block font-mono text-[11px] text-red-300">{detail}</span>}
          </span>
        </span>
        <h1 className="text-[22px] font-extrabold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
          CB-X
        </h1>
      </div>
    </header>
  );
}

export default TopBar;