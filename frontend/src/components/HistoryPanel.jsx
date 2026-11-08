import { useEffect, useMemo, useState } from "react";
import { X, Trash2, Search } from "lucide-react";
import { ConfirmButton, focusRing, iconBtn } from "./ui";
import { groupChats } from "../hooks/useChats";

const messageCount = (n) => (n === 0 ? "No messages yet" : `${n} ${n === 1 ? "message" : "messages"}`);

function HistoryPanel({ chats, activeChatId, onSelectChat, onDeleteChat, onClear, onClose, loading }) {
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = useMemo(() => groupChats(chats, query), [chats, query]);
  const q = query.trim();

  return (
    <div className="side-panel z-50 box-border flex h-screen w-[350px] max-w-[100vw] shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-slate-900 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between py-2">
        <span className="text-[18px] font-medium uppercase tracking-widest text-blue-500">Chats</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setConfirmClear(true)}
            disabled={loading || chats.length === 0}
            className={`rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
          >
            Clear all
          </button>
          <button onClick={onClose} aria-label="Close chats" className={`${iconBtn} hover:text-red-400`}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {confirmClear && (
        <div role="alertdialog" aria-label="Confirm clear all chats" className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-300">Delete all {chats.length} chats? This can&apos;t be undone.</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => { onClear(); setConfirmClear(false); }}
              disabled={loading}
              className="rounded-lg border border-red-500/50 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:border-red-400 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40"
            >
              Delete all
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className={`rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-blue-500 ${focusRing}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {chats.length > 0 && (
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and messages"
            aria-label="Search chats"
            className="w-full rounded-xl border border-zinc-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
          />
        </div>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-200">
        {chats.length === 0 && <p className="text-sm text-zinc-400">No chats yet. Start one with the + button.</p>}
        {chats.length > 0 && groups.length === 0 && (
          <p role="status" className="text-sm text-zinc-400">No chats match &ldquo;{q}&rdquo;.</p>
        )}

        {groups.map(({ label, items }) => (
          <section key={label} aria-label={label} className="mb-4">
            <h3 className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</h3>
            <ul className="space-y-2">
              {items.map(({ chat, snippet }) => {
                const last = chat.messages[chat.messages.length - 1];
                const active = chat.id === activeChatId;
                const preview = snippet ?? last?.content;
                return (
                  <li
                    key={chat.id}
                    className={`flex items-center gap-1 rounded-2xl border px-3 py-2 text-sm transition-colors ${
                      active ? "border-cyan-500/50 bg-cyan-500/10 shadow-sm" : "border-zinc-700 bg-slate-950 hover:border-blue-500"
                    }`}
                  >
                    <button
                      onClick={() => onSelectChat(chat.id)}
                      disabled={loading}
                      aria-current={active ? "true" : undefined}
                      className={`min-w-0 flex-1 rounded-lg py-1 text-left disabled:cursor-not-allowed ${focusRing}`}
                    >
                      <p className="mb-1 truncate font-semibold text-cyan-400">{chat.title}</p>
                      <p className="text-xs text-zinc-400">{messageCount(chat.messages.length)}</p>
                      {preview && <p className="mt-2 truncate text-zinc-300">{preview}</p>}
                    </button>
                    <ConfirmButton onConfirm={() => onDeleteChat(chat.id)} label={`Delete ${chat.title}`} disabled={loading}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </ConfirmButton>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export default HistoryPanel;