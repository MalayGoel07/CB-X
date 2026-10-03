import { Plus, History, Cpu, User, Settings } from "lucide-react";

function ActionBar({ onNewChat, onHistory, onModels, onProfile, onSettings, loading }) {
  const items = [
    { label: "New chat", Icon: Plus, onClick: onNewChat, disabled: loading },
    { label: "History", Icon: History, onClick: onHistory },
    { label: "Models", Icon: Cpu, onClick: onModels },
    { label: "Profile", Icon: User, onClick: onProfile },
    { label: "Settings", Icon: Settings, onClick: onSettings },
  ];

  const btn =
    "group relative flex h-[40px] w-[40px] items-center justify-center rounded-xl border border-zinc-700/50 bg-slate-900 text-zinc-300 transition-all duration-300 hover:scale-105 hover:border-blue-500 hover:bg-slate-950 hover:text-white hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label="Chat actions"
      className="flex w-[57px] flex-col items-center justify-center gap-5 rounded-[30px] border border-zinc-800 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl"
    >
      {items.map(({ label, Icon, onClick, disabled }) => (
        <button key={label} onClick={onClick} disabled={disabled} aria-label={label} className={btn}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          <span
            role="tooltip"
            className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md border border-zinc-700 bg-slate-950 px-2 py-1 text-xs text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
}

export default ActionBar;