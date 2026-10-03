import { useEffect, useState } from "react";
import { X, Trash2, Search, Check } from "lucide-react";

const iconBtn =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";

const messageCount = (n) => (n === 0 ? "No messages yet" : `${n} ${n === 1 ? "message" : "messages"}`);

function HistoryPanel({ chats, activeChatId, onSelectChat, onDeleteChat, onClear, onClose, loading }) {
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  // Chats are stored oldest-first; show the newest at the top.
  const visible = [...chats].reverse().filter((chat) => {
    if (!q) return true;
    const last = chat.messages[chat.messages.length - 1];
    return chat.title.toLowerCase().includes(q) || (last?.content ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="z-50 flex w-[350px] flex-col border-r border-zinc-800 bg-slate-900 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between py-2">
        <span className="text-[18px] font-medium uppercase tracking-widest text-blue-500">Chats</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setConfirmClear(true)}
            disabled={loading || chats.length === 0}
            className="rounded-lg px-2 py-1 text-xs text-zinc-400 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
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
          <p className="text-sm text-red-300">Delete all {chats.length} chats? This can't be undone.</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                onClear();
                setConfirmClear(false);
              }}
              disabled={loading}
              className="rounded-lg border border-red-500/50 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:border-red-400 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40"
            >
              Delete all
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
            placeholder="Search chats"
            aria-label="Search chats"
            className="w-full rounded-xl border border-zinc-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
          />
        </div>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-200">
        {chats.length === 0 && <p className="text-sm text-zinc-400">No chats yet. Start one with the + button.</p>}
        {chats.length > 0 && visible.length === 0 && (
          <p className="text-sm text-zinc-400">No chats match &ldquo;{query.trim()}&rdquo;.</p>
        )}

        <ul className="space-y-2">
          {visible.map((chat) => {
            const lastMessage = chat.messages[chat.messages.length - 1];
            const active = chat.id === activeChatId;
            const confirming = confirmId === chat.id;
            return (
              <li
                key={chat.id}
                className={`flex items-center gap-1 rounded-2xl border px-3 py-2 text-sm transition-colors ${
                  active ? "border-cyan-500/50 bg-cyan-500/10" : "border-zinc-700 bg-slate-950 hover:border-blue-500"
                }`}
              >
                <button
                  onClick={() => onSelectChat(chat.id)}
                  disabled={loading}
                  aria-current={active ? "true" : undefined}
                  className="min-w-0 flex-1 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed"
                >
                  <p className="mb-1 truncate font-semibold text-cyan-400">{chat.title}</p>
                  <p className="text-xs text-zinc-400">{messageCount(chat.messages.length)}</p>
                  {lastMessage && <p className="mt-2 truncate text-zinc-300">{lastMessage.content}</p>}
                </button>

                {confirming ? (
                  <div className="flex shrink-0 items-center">
                    <button
                      onClick={() => {
                        onDeleteChat(chat.id);
                        setConfirmId(null);
                      }}
                      disabled={loading}
                      aria-label={`Confirm delete ${chat.title}`}
                      className={`${iconBtn} text-red-400 hover:text-red-300`}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button onClick={() => setConfirmId(null)} aria-label="Cancel delete" className={`${iconBtn} hover:text-zinc-100`}>
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(chat.id)}
                    disabled={loading}
                    aria-label={`Delete ${chat.title}`}
                    title="Delete chat"
                    className={`${iconBtn} hover:text-red-400`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default HistoryPanel;