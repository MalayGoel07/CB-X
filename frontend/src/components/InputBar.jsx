import { useEffect, useRef, useState } from "react";
import { Paperclip, SendHorizontal, Loader2, X, FileText, Image as ImageIcon } from "lucide-react";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const MAX_INPUT_HEIGHT = 160;
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp",
  ".pdf", ".docx", ".txt", ".md", ".py", ".js", ".json", ".csv", ".html", ".css",
]);

const getExtension = (name) => {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
};

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
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const canSend = !loading && (input.trim() !== "" || attachments.length > 0);

  // Grow the textarea with its content, up to a maximum height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [input]);

  const processFiles = (selectedFiles) => {
    if (loading || selectedFiles.length === 0) return;
    onAttachmentError("");

    const unsupported = selectedFiles.find((file) => !ALLOWED_EXTENSIONS.has(getExtension(file.name)));
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

  const handleFileInput = (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    processFiles(selectedFiles);
  };

  const removeFile = (indexToRemove) => {
    onAttachmentsChange(attachments.filter((_, index) => index !== indexToRemove));
    onAttachmentError("");
  };

  const handleKeyDown = (e) => {
    // Enter sends; Shift+Enter adds a new line; ignore Enter while an IME is composing.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  const handlePaste = (e) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer?.files ?? []));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!loading) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex w-full max-w-[800px] flex-col gap-2 rounded-[24px] border px-3 py-2 shadow-2xl backdrop-blur-xl transition-all duration-300 focus-within:border-blue-500 focus-within:bg-slate-950 hover:border-blue-500 hover:shadow-lg hover:shadow-cyan-500/20 ${
        dragging
          ? "border-dashed border-cyan-400 bg-cyan-500/10"
          : "border-slate-900 bg-slate-900 hover:bg-slate-950"
      }`}
    >
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Attached files">
          {attachments.map((file, index) => {
            const Icon = file.type?.startsWith("image/") ? ImageIcon : FileText;
            return (
              <li
                key={`${file.name}-${index}`}
                className="flex max-w-full items-center gap-1.5 rounded-lg bg-slate-800 py-1 pl-2 pr-1 text-xs text-zinc-300"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
                <span className="max-w-[220px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={loading}
                  aria-label={`Remove ${file.name}`}
                  className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {attachmentError && (
        <p role="alert" className="text-xs text-red-400">
          {attachmentError}
        </p>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.docx,.txt,.md,.py,.js,.json,.csv,.html,.css"
          onChange={handleFileInput}
          disabled={loading}
          className="hidden"
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          aria-label="Attach images or files"
          title="Attach images or files (or drop them here)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:border-cyan-500 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Paperclip className="h-4 w-4" aria-hidden="true" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask anything..."
          aria-label="Message"
          autoFocus
          className="min-w-0 flex-1 resize-none self-center bg-transparent py-2 text-sm leading-5 text-white outline-none placeholder:text-zinc-500"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-sm font-semibold text-black shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:scale-105 hover:from-cyan-300 hover:to-blue-400 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Thinking…
            </>
          ) : (
            <>
              Send
              <SendHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default InputBar;