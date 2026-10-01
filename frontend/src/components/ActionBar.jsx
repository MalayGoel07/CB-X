function ActionBar({ onNewChat, onHistory, onModels, loading }) {
  const btn = "flex items-center justify-center bg-slate-900 hover:bg-slate-950 border border-zinc-700/50 text-white hover:border-blue-500 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-105 transition-all duration-300 text-sm font-medium px-4 h-[40px] w-[40px] rounded-xl active:scale-95";
  return (
    <div className="flex flex-col items-center justify-center gap-6 bg-slate-900 backdrop-blur-xl hover:border-blue-500 rounded-[30px] w-[57px] shadow-2xl p-2">
      <button onClick={onNewChat} disabled={loading} className={`${btn} disabled:opacity-40 disabled:cursor-not-allowed`} title="New Chat">+</button>
      <button onClick={onHistory} className={btn} title="History">His</button>
      <button onClick={onModels} className={btn} title="Models">Ai</button>
    </div>
  );
}
export default ActionBar