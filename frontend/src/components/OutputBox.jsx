import { useState, useEffect } from "react";

const MESSAGES = [
  "The One Piece is Real!",
  "Work Hard bud!",
  "Need Help?",
  "How can I assist you today?",
  "What are your today's goals?",
  "Keep Going! Keep Growing!"
];

function OutputBox({ output,onSend,loading }) {
  const [copied, setCopied] = useState(false);
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random()*MESSAGES.length));

  useEffect(() => {
    if (output)
      return;
    const id = setInterval(() => {setMsgIndex(i => (i + 1) % MESSAGES.length);}, 3000);
    return () => clearInterval(id);},
    [output]);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {setCopied(true);setTimeout(() => setCopied(false), 1800);});
  };

  const wordCount = output ? output.trim().split(/\s+/).length : 0;
  const charCount = output ? output.length : 0;
  const estTokens = Math.round(charCount / 4);

  return (
    <div className="bg-slate-900 rounded-[20px] w-full h-[65vh] max-h-[525px] min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-zinc-700">
        <p className="text-zinc-100 leading-8 text-[14px] whitespace-pre-wrap"><span className="text-[14px] text-blue-400 uppercase tracking-widest font-medium mb-2">CB-X : </span>{output || MESSAGES[msgIndex]}</p>
      </div>
      <div className="flex items-center w-full justify-between px-4 py-2.5 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${output ? 'bg-blue-400' : 'bg-blue-400 animate-pulse'}`} />
          <span className="text-[11px] font-medium text-blue-400 uppercase tracking-widest">CB-X</span>
        </div>
        {output && (
        <div className="flex items-center gap-4">
        <button
          onClick={handleCopy}
          className={`text-xs px-2 py-1 rounded-lg border transition-all hover:bg-slate-950 bg-slate-900
          ${copied ? 'border-green-400 text-green-400' : 'border-zinc-700 text-zinc-300 hover:text-zinc-200 hover:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed'}`}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <button
          onClick={onSend}
          className={`text-xs px-2 py-1 rounded-lg border transition-all hover:bg-slate-950 bg-slate-900
          ${loading ? 'border-green-400 text-green-400' : 'border-zinc-700 text-zinc-300 hover:text-zinc-200 hover:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed'}`}>
          {loading ? "trying..." : "Rethink"}
        </button>
        </div>)}
      </div>
      {output && (
        <div className="flex justify-between px-4 py-2 border-t border-zinc-800">
          <span className="text-[11px] font-mono text-zinc-500">{wordCount} words</span>
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-mono text-zinc-500">{charCount} chars</span>
            <span className="text-[11px] font-mono text-zinc-500">{estTokens} tokens</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default OutputBox;