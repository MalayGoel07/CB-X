function HistoryPanel({ chats, activeChatId, onSelectChat, onDeleteChat, onClear, onClose, loading }) {
  return (
    <div className="w-[350px] border-r border-zinc-800 bg-slate-900 backdrop-blur-xl p-5 flex flex-col z-50">
      <div className="flex items-center justify-between py-2">
        <span className="text-[18px] font-medium text-blue-500 uppercase tracking-widest">Chats</span>
        <div className="flex items-center gap-3">
          <button onClick={onClear} disabled={loading || chats.length === 0} className="text-[13px] font-mono text-red-400 transition-colors disabled:opacity-40">clear all</button>
          <div className="w-px h-3 bg-zinc-700" />
          <button onClick={onClose} className="text-[13px] font-mono text-red-400 transition-colors"> ✕ close</button>
        </div>
      </div>
      <div className="flex-1 max-h-screen overflow-y-auto space-y-4 pr-2 scrollbar-thumb-cyan-200 scrollbar-thin">
        {chats.length === 0 && (<div className="text-zinc-400 text-sm">No chats yet...</div>)}
        {chats.map((chat) => {
          const lastMessage = chat.messages[chat.messages.length - 1];
          return (
            <div
              key={chat.id}
              className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm shadow-lg border transition-colors ${
                chat.id === activeChatId
                  ? "bg-cyan-500/10 border-cyan-500/50"
                  : "bg-slate-950 border-zinc-700 hover:border-blue-500"
              }`}
            >
              <button
                onClick={() => onSelectChat(chat.id)}
                disabled={loading}
                className="flex-1 min-w-0 text-left py-1 disabled:cursor-not-allowed"
              >
                <p className="font-semibold mb-1 text-cyan-400 truncate">{chat.title}</p>
                <p className="text-zinc-400 text-xs">{chat.messages.length} messages</p>
                {lastMessage && <p className="text-zinc-300 mt-2 truncate">{lastMessage.content}</p>}
              </button>
              <button
                onClick={() => onDeleteChat(chat.id)}
                disabled={loading}
                aria-label={`Delete ${chat.title}`}
                title="Delete chat"
                className="shrink-0 p-2 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default HistoryPanel