import { Plus, History, Cpu, User, Settings, FolderOpen, Laptop } from "lucide-react";

function ActionBar({ onNewChat, onHistory, onModels, onProfile, onSettings, loading, onCollection, onLocal, active = null, badges = {} }) {
  const items = [
    { label: "New chat", Icon: Plus, onClick: onNewChat, disabled: loading, panel: false },
    { label: "History", Icon: History, onClick: onHistory },
    { label: "Models", Icon: Cpu, onClick: onModels },
    { label: "Profile", Icon: User, onClick: onProfile },
    { label: "Settings", Icon: Settings, onClick: onSettings },
    { label: "Collection", Icon: FolderOpen, onClick: onCollection },
    { label: "Local Ollama", Icon: Laptop, onClick: onLocal },
  ];

  const btn =
    "group relative flex h-[40px] w-[40px] items-center justify-center rounded-xl border border-zinc-700/50 bg-slate-900 text-zinc-300 transition-all duration-300 hover:scale-105 hover:border-blue-500 hover:bg-slate-950 hover:text-white hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";
  const activeCls = "!border-cyan-500/70 !bg-slate-950 !text-cyan-300";

  return (
    <nav
      aria-label="Chat actions"
      className="action-bar flex w-[57px] flex-col items-center justify-center gap-5 rounded-[30px] border border-zinc-800 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl"
    >
      {items.map(({ label, Icon, onClick, disabled, panel = true }) => {
        const isActive = panel && active === label;
        const count = badges[label];
        return (
          <button
            key={label}
            data-tour={label === "New chat" ? "new-chat" : label === "History" ? "history" : undefined}
            onClick={onClick}
            disabled={disabled}
            aria-label={count ? `${label}, ${count}` : label}
            aria-pressed={panel ? isActive : undefined}
            className={`${btn} ${isActive ? activeCls : ""}`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            {count > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-semibold leading-none text-black"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md border border-zinc-700 bg-slate-950 px-2 py-1 text-xs text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default ActionBar;