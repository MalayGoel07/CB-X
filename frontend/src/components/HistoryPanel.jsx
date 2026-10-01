function HistoryPanel({ history, onClear, onClose }) {
  
  return (
    <div className="w-[350px] border-r border-zinc-800 bg-slate-900 backdrop-blur-xl p-5 flex flex-col z-50">
      <div className="flex items-center justify-between py-2">
        <span className="text-[18px] font-medium text-blue-500 uppercase tracking-widest">History</span>
        <div className="flex items-center gap-3">
          <button onClick={onClear} className="text-[13px] font-mono text-red-400 transition-colors">clear convo</button>
          <div className="w-px h-3 bg-zinc-700" />
          <button onClick={onClose} className="text-[13px] font-mono text-red-400 transition-colors"> ✕ close</button>
        </div>
      </div>
      <div className="flex-1 max-h-screen overflow-y-auto space-y-4 pr-2 scrollbar-thumb-cyan-200 scrollbar-thin">
        {history.length === 0 && (<div className="text-zinc-400 text-sm">No chats yet...</div>)}
        {history.map((msg, index) => (
          <div key={index} className={`rounded-2xl px-4 py-3 text-sm shadow-lg border ${ msg.role === "user" ? "bg-cyan-500/10 border-cyan-500/20" : "bg-slate-950 border-zinc-700"}`}>
            <p className={`font-semibold mb-1 ${msg.role === "user" ? "text-cyan-400" : "text-blue-400"}`}>{msg.role === "user" ? "You" : "CB-X"}</p>
            <p className="text-zinc-200 whitespace-pre-wrap leading-6">{msg.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
export default HistoryPanel