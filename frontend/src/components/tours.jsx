/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

function Cmd({ children }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };
  return (
    <div className="relative">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-zinc-700 bg-slate-950 p-2.5 pr-9 font-mono text-[11px] leading-relaxed text-zinc-200">{children}</pre>
      <button
        onClick={copy}
        aria-label="Copy command"
        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
    </div>
  );
}

const Ext = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 underline-offset-2 hover:underline">
    {children} <ExternalLink className="h-3 w-3" aria-hidden="true" />
  </a>
);

const guessOs = () => {
  const ua = navigator.userAgent;
  return /Mac/i.test(ua) ? "mac" : /Linux|X11/i.test(ua) ? "linux" : "windows";
};

/* ---------- Local LLM guide (also used standalone from the Local panel) ---------- */
export const localSteps = () => {
  const origin = window.location.origin;
  const os = guessOs();
  const originCmd = {
    windows: `setx OLLAMA_ORIGINS "${origin}"`,
    mac: `launchctl setenv OLLAMA_ORIGINS "${origin}"`,
    linux: `sudo systemctl edit ollama\n# add under [Service]:\nEnvironment="OLLAMA_ORIGINS=${origin}"\n# then:\nsudo systemctl restart ollama`,
  }[os];
  const restartNote = {
    windows: "Then quit Ollama from the system tray and open it again.",
    mac: "Then quit and reopen the Ollama app.",
    linux: "The restart command applies it.",
  }[os];

  return [
    {
      title: "Run models on your own PC",
      body: "Local mode sends your messages to Ollama on your machine, so it's free and private. It takes about 5 minutes to set up. The next steps walk through it.",
    },
    {
      title: "1. Install Ollama",
      body: "Ollama is the small app that runs models locally. Download it for Windows, macOS or Linux and install it.",
      content: <Ext href="https://ollama.com/download">ollama.com/download</Ext>,
    },
    {
      title: "2. Download a model",
      body: "Open a terminal (PowerShell on Windows) and pull a model. Pick one that fits your RAM and GPU: smaller models are faster, bigger ones are smarter.",
      content: (
        <>
          <Cmd>ollama pull llama3.2</Cmd>
          <p className="text-xs text-zinc-400">For code, something like <code className="font-mono text-cyan-300">qwen2.5-coder:7b</code> works well. Check what you have with:</p>
          <Cmd>ollama list</Cmd>
          <p className="text-xs text-zinc-400">Browse more at <Ext href="https://ollama.com/library">ollama.com/library</Ext>.</p>
        </>
      ),
    },
    {
      title: "3. Make sure Ollama is running",
      body: "The desktop app starts the server automatically (look for the tray or menu-bar icon). Check by opening this address in a browser; it should say \"Ollama is running\".",
      content: (
        <>
          <Cmd>http://localhost:11434</Cmd>
          <p className="text-xs text-zinc-400">If it doesn't load, start it manually. An \"address already in use\" error just means it was already running.</p>
          <Cmd>ollama serve</Cmd>
        </>
      ),
    },
    {
      title: "4. Allow this website",
      body: "Browsers block sites from talking to localhost unless Ollama allows them. Run this once, using the command for your system:",
      content: (
        <>
          <Cmd>{originCmd}</Cmd>
          <p className="text-xs text-zinc-400">{restartNote} If you start Ollama from a terminal with <code className="font-mono text-cyan-300">ollama serve</code>, set the variable in that same terminal first. Don't use <code className="font-mono text-red-300">*</code> as the value.</p>
        </>
      ),
    },
    {
      target: '[data-tour="local-url"]',
      placement: "left",
      title: "5. Test the connection",
      body: "Turn on \"Use my local Ollama\", then press Test. Your browser may ask to allow local network access: click Allow. Safari isn't supported.",
    },
    {
      target: '[data-tour="local-roles"]',
      placement: "left",
      title: "6. Pick a model for each role",
      body: "Once connected, each role (router, research, writer, coder, maths) gets a dropdown of your installed models. Using the same model for all of them is fine. Press Save and the page reloads in local mode.",
    },
  ];
};

/* ---------- Main first-visit tour ---------- */
export const mainSteps = ({ openModels, openLocal, closeAll }) => {
  const base = { onEnter: closeAll };
  return [
    {
      ...base,
      title: "Welcome to CB-X",
      body: "A quick tour of the app, including how to add API keys (optional) and how to run models locally. You can skip any time with Esc.",
    },
    {
      ...base,
      target: '[data-tour="input"]',
      placement: "top",
      title: "Ask anything",
      body: "Type here and press Send. The paperclip attaches images or files.",
    },
    {
      ...base,
      target: '[data-tour="mode"]',
      placement: "top",
      title: "Choose how it answers",
      body: "Choose API for hosted models or Local model for your Ollama setup. You can change it for each message.",
    },
    {
      ...base,
      target: '[data-tour="new-chat"]',
      placement: "left",
      title: "New chat",
      body: "Starts a fresh conversation. Your old ones are kept.",
    },
    {
      ...base,
      target: '[data-tour="history"]',
      placement: "left",
      title: "History",
      body: "Reopen or delete any previous chat.",
    },
    {
      onEnter: openModels,
      target: '[data-tour="models-panel"]',
      placement: "right",
      title: "Models",
      body: "Each worker (router, research, coder…) can use a different model. Leave a dropdown on Default if you don't care.",
    },
    {
      target: '[data-tour="common-key"]',
      placement: "right",
      title: "API keys (optional)",
      body: "You never need one. Add a key only if you want a hosted model like OpenAI, Anthropic, Google, Grok or OpenRouter. Pick the provider, paste one key here to share across all workers, or set a separate key per worker below.",
    },
    {
      onEnter: openLocal,
      target: '[data-tour="local-panel"]',
      placement: "left",
      title: "Local models",
      body: "This panel switches the app to your own Ollama. Here's the full setup, step by step.",
    },
    ...localSteps(),
  ];
};