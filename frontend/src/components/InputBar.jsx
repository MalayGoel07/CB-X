import { useState } from "react";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp",
  ".pdf", ".docx", ".txt", ".md", ".py", ".js", ".json", ".csv", ".html", ".css",
]);

function InputBar({
  input,
  onChange,
  onSend,
  loading,
  attachments,
  onAttachmentsChange,
  attachmentError,
  onAttachmentError,
}) {
  const [focused, setFocused] = useState(false);
  const fileInputId = "chat-attachments";

  const addFiles = (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    onAttachmentError("");

    const unsupported = selectedFiles.find((file) => {
      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      return !ALLOWED_EXTENSIONS.has(extension);
    });
    if (unsupported) {
      onAttachmentError(`Unsupported file type: ${unsupported.name}`);
      return;
    }
    const oversized = selectedFiles.find((file) => file.size > MAX_ATTACHMENT_SIZE);
    if (oversized) {
      onAttachmentError(`${oversized.name} exceeds the 10 MB file limit.`);
      return;
    }
    if (attachments.length + selectedFiles.length > MAX_ATTACHMENTS) {
      onAttachmentError(`Attach no more than ${MAX_ATTACHMENTS} files.`);
      return;
    }
    onAttachmentsChange([...attachments, ...selectedFiles]);
  };

  const removeFile = (indexToRemove) => {
    onAttachmentsChange(attachments.filter((_, index) => index !== indexToRemove));
    onAttachmentError("");
  };

  return (
    <div className={`flex flex-col w-[800px] max-w-[1000px] min-w-[600px] backdrop-blur-xl border rounded-[24px] shadow-2xl px-3 py-2 gap-2 hover:border-blue-500 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300
      ${focused ? 'bg-slate-950 border-blue-500' : 'bg-slate-900 hover:bg-slate-950 border-slate-900 hover:border-blue-500'}`}>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <span key={`${file.name}-${index}`} className="flex items-center gap-2 max-w-full rounded-lg bg-slate-800 px-2 py-1 text-xs text-zinc-300">
              <span className="truncate max-w-[220px]">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={loading}
                aria-label={`Remove ${file.name}`}
                className="text-zinc-400 hover:text-red-400 disabled:opacity-40"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      {attachmentError && <p role="alert" className="text-xs text-red-400">{attachmentError}</p>}
      <div className="flex items-center gap-2">
        <input
          id={fileInputId}
          type="file"
          multiple
          accept="image/*,.pdf,.docx,.txt,.md,.py,.js,.json,.csv,.html,.css"
          onChange={addFiles}
          disabled={loading}
          className="hidden"
        />
        <label
          htmlFor={fileInputId}
          title="Attach images or files"
          className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-zinc-700 text-zinc-300 hover:text-cyan-300 hover:border-cyan-500 transition-colors ${loading ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </label>
        <div className="w-px h-6 bg-blue-500 shrink-0" />
        <input
          type="text"
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && onSend()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask anything..."
          autoFocus
          className="flex-1 min-w-0 bg-transparent text-white placeholder:text-zinc-500 text-sm outline-none"
        />
        <button onClick={onSend} disabled={loading || (!input.trim() && attachments.length === 0)} className="shrink-0 flex items-center justify-center bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm px-5 h-[35px] rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-cyan-500/20 disabled:hover:scale-100 disabled:shadow-none">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Thinking…
            </span>
          ) : ("Send")}
        </button>
      </div>
    </div>
  );
}

export default InputBar;