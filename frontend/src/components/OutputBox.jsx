import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Check, Copy, Loader2, RotateCw, Sparkles, Image as ImageIcon, Paperclip } from "lucide-react";

const MESSAGES = [
  "The One Piece is Real!",
  "Work Hard bud!",
  "Need Help?",
  "How can I assist you today?",
  "What are your today's goals?",
  "Keep Going! Keep Growing!",
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";

function useCopy(text) {
  const [copied, setCopied] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = () => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  };
  return [copied, copy];
}

/* ---------- Markdown ---------- */

function CodeBlock({ children }) {
  const child = Array.isArray(children) ? children[0] : children;
  const code = String(child?.props?.children ?? "").replace(/\n$/, "");
  const language = /language-(\w+)/.exec(child?.props?.className || "")?.[1];
  const [copied, copy] = useCopy(code);
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700 bg-slate-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <span className="font-mono text-xs text-zinc-400">{language || "code"}</span>
        <button
          onClick={copy}
          className={`inline-flex items-center gap-1.5 rounded text-xs transition-colors ${focusRing} ${
            copied ? "text-green-400" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-6 text-zinc-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// react-markdown passes a `node` prop that must not reach the DOM.
const omitProps = (props, keys) => {
  const domProps = { ...props };
  keys.forEach((key) => delete domProps[key]);
  return domProps;
};

const el = (Tag, className) =>
  function Element(props) {
    return <Tag className={className} {...omitProps(props, ["node"])} />;
  };

const mdComponents = {
  p: el("p", ""),
  h1: el("h1", "pt-1 text-lg font-semibold text-zinc-100"),
  h2: el("h2", "pt-1 text-base font-semibold text-zinc-100"),
  h3: el("h3", "text-sm font-semibold text-zinc-100"),
  ul: el("ul", "list-disc space-y-1 pl-5"),
  ol: el("ol", "list-decimal space-y-1 pl-5"),
  blockquote: el("blockquote", "border-l-2 border-zinc-700 pl-3 text-zinc-400"),
  hr: el("hr", "border-zinc-800"),
  th: el("th", "border border-zinc-700 bg-slate-800 px-3 py-1.5 font-semibold"),
  td: el("td", "border border-zinc-700 px-3 py-1.5"),
  a: (props) => (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
      {...omitProps(props, ["node"])}
    />
  ),
  table: (props) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs" {...omitProps(props, ["node"])} />
    </div>
  ),
  pre: CodeBlock,
  code: (props) => {
    const { children, ...codeProps } = omitProps(props, ["node", "className"]);
    return (
      <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-300" {...codeProps}>
        {children}
      </code>
    );
  },
};

function Markdown({ content }) {
  return (
    <div className="space-y-3 break-words text-sm leading-7 text-zinc-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ---------- Messages ---------- */

function Attachments({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap justify-end gap-2" aria-label="Attached files">
      {items.map((a, i) => {
        const Icon = a.type?.startsWith("image/") ? ImageIcon : Paperclip;
        return (
          <li key={`${a.name}-${i}`} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2 py-1 text-xs text-zinc-300">
            <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
            <span className="max-w-[200px] truncate">{a.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

function UserMessage({ content, attachments }) {
  return (
    <div className="flex flex-col items-end">
      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-cyan-500/10 px-4 py-2.5 text-sm leading-7 text-zinc-100">
        <span className="sr-only">You: </span>
        {content}
      </p>
      <Attachments items={attachments} />
    </div>
  );
}

function AssistantMessage({ content, tokenCount, showLabel = true }) {
  return (
    <div>
      {showLabel && (
        <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" aria-hidden="true" />
          CB-X
        </p>
      )}
      <Markdown content={content} />
      {Number.isSafeInteger(tokenCount) && (
        <span className="mt-2 block font-mono text-[11px] text-zinc-500">{Math.round(tokenCount)} tokens</span>
      )}
    </div>
  );
}

function Thinking() {
  return (
    <div role="status" className="flex items-center gap-1.5">
      <span className="sr-only">CB-X is thinking</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 motion-reduce:animate-none"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
    </div>
  );
}

function Greeting({ text }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-lg font-medium text-zinc-100">{text}</p>
    </div>
  );
}

/* ---------- OutputBox ---------- */

function OutputBox({
  output,
  tokenCount,
  onSend,
  loading,
  elapsedMs,
  conversation,
  conversationTitle,
  onBackToChats,
  pendingPrompt,
  pendingAttachments = [],
}) {
  const [copied, copy] = useCopy(output);
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (output || loading) return;
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 3000);
    return () => clearInterval(id);
  }, [output, loading]);

  // A new prompt always jumps to the bottom.
  useEffect(() => {
    if (pendingPrompt) stickToBottom.current = true;
  }, [pendingPrompt]);

  // Follow the stream, unless the person has scrolled up to read.
  useEffect(() => {
    const node = scrollRef.current;
    if (node && stickToBottom.current) node.scrollTop = node.scrollHeight;
  }, [conversation, output, pendingPrompt, loading]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (node) stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
  };

  const wordCount = output ? output.trim().split(/\s+/).length : 0;
  const charCount = output ? output.length : 0;
  const elapsedSeconds = (elapsedMs / 1000).toFixed(1);
  const lastConversationMessage = conversation?.[conversation.length - 1];
  const showStreamingReply = output && (loading || lastConversationMessage?.content !== output);

  const barButton = `inline-flex items-center gap-1.5 rounded-lg border bg-slate-900 px-2.5 py-1 text-xs transition-colors hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

  return (
    <div className="flex h-[calc(100vh-14rem)] max-h-[900px] min-h-[320px] w-full flex-col overflow-hidden rounded-[20px] bg-slate-900">
      {(conversation || output) && (
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2">
        {conversation ? (
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={onBackToChats}
              className={`inline-flex shrink-0 items-center gap-1 rounded text-xs text-cyan-300 transition-colors hover:text-cyan-200 ${focusRing}`}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back
            </button>
            <span className="truncate text-sm font-medium text-zinc-200">{conversationTitle || "Chat"}</span>
          </div>
        ) : (
          <div />
        )}

        {output && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={copy}
              className={`${barButton} ${copied ? "border-green-400 text-green-400" : "border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-zinc-200"}`}
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={onSend}
              disabled={loading}
              className={`${barButton} ${loading ? "border-green-400 text-green-400" : "border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-zinc-200"}`}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {loading ? "Thinking…" : "Rethink"}
            </button>
          </div>
        )}
      </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        aria-busy={loading}
        className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-700"
      >
        {conversation ? (
          <div className="mx-auto flex max-w-5xl flex-col gap-5">
            {conversation.length === 0 && !pendingPrompt && (
              <p className="py-10 text-center text-sm text-zinc-500">This chat is empty. Ask something below.</p>
            )}
            {conversation.map((message, index) =>
              message.role === "user" ? (
                <UserMessage key={`${message.role}-${index}`} content={message.content} attachments={message.attachments} />
              ) : (
                <AssistantMessage key={`${message.role}-${index}`} content={message.content} tokenCount={message.token_count} />
              )
            )}
            {pendingPrompt && <UserMessage content={pendingPrompt} attachments={pendingAttachments} />}
            {loading && !output && <Thinking />}
            {showStreamingReply && <AssistantMessage content={output} />}
          </div>
        ) : (
          <div className="mx-auto max-w-5xl">
            {output ? (
              <AssistantMessage content={output} showLabel={false} />
            ) : loading ? (
              <Thinking />
            ) : (
              <Greeting text={MESSAGES[msgIndex]} />
            )}
          </div>
        )}
      </div>

      {(output || loading) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-zinc-800 px-4 py-2 font-mono text-[11px] text-zinc-500">
          <span>{wordCount} words</span>
          <span className="flex items-center gap-6">
            <span>{charCount} chars</span>
            <span>{Number.isSafeInteger(tokenCount) ? `${Math.round(tokenCount)} tokens` : "0 tokens"}</span>
            <span>{elapsedSeconds}s</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default OutputBox;