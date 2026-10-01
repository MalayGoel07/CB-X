function SettingPanel({ onClose }) {
  return (
    <div className="w-[360px] min-h-screen bg-slate-900 flex flex-col relative overflow-hidden px-3 z-50">
      <div className="flex items-center justify-between px-2 py-5">
        <span className="font-mono text-[16px] font-bold tracking-[0.25em] text-blue-500 uppercase flex items-center gap-2">Settings</span>
        <button onClick={onClose} className="text-[13px] font-mono text-red-400 transition-colors">✕ close</button>
      </div>
      <div className="flex items-center justify-center h-full">
        <button className="w-[250px] rounded-[28px] text-[14px] font-medium rounded-xl active:scale-95 text-zinc-400 border bg-slate-900 border-slate-900 hover:border-blue-500 hover:bg-slate-950 hover:shadow-cyan-500/20 hover:scale-105 transition-all duration-300">Feature Coming soon...</button>
      </div>
    </div>
  );
}
export default SettingPanel;