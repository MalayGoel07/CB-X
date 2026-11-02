import { API_BASE, LS } from "./config";

const ROLES = ["research", "writer", "coder", "maths"];
const TEXT_EXT = /\.(txt|md|py|js|json|csv|html|css)$/i;
const MAX_DOC_CHARS = 50000;
const DOCUMENT_INTENT = /\b(create|make|generate|write|export|build|produce|prepare|draft)\b[\s\S]*\b(pdf|docx?|pptx?|powerpoint|slides?|presentation|xlsx?|excel|spreadsheet)\b/i;

export const ollamaUrl = () =>
  (localStorage.getItem(LS.url) || "http://localhost:11434").replace(/\/+$/, "");

export const getCfg = () => {
  try { return JSON.parse(localStorage.getItem(LS.models) || "{}"); }
  catch { return {}; }
};
export const setCfg = (cfg) => localStorage.setItem(LS.models, JSON.stringify(cfg));
export const isLocalMode = () => localStorage.getItem(LS.mode) === "1";
export const setLocalMode = (on) => localStorage.setItem(LS.mode, on ? "1" : "0");

export async function listLocalModels() {
  const r = await fetch(`${ollamaUrl()}/api/tags`);
  if (!r.ok) throw new Error(`Ollama HTTP ${r.status}`);
  const data = await r.json();
  return data.models.map((m) => m.name).sort();
}

async function* ndjson(res) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) if (l.trim()) yield JSON.parse(l);
    }
    if (buf.trim()) yield JSON.parse(buf);
  } finally {
    reader.releaseLock();
  }
}

async function chat({ model, messages, format, onToken, signal, think, options }) {
  let res;
  try {
    res = await fetch(`${ollamaUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, format, stream: true, think, options }),
      signal,
    });
  } catch {
    throw new Error(
      "Can't reach Ollama. Is it running, and does OLLAMA_ORIGINS include this site? (open Local mode setup)"
    );
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Ollama HTTP ${res.status}`);
  }
  let text = "";
  let tokens = null;
  for await (const j of ndjson(res)) {
    if (j.error) throw new Error(j.error);
    const t = j.message?.content ?? "";
    if (t) {
      text += t;
      onToken?.(t, text);
    }
    if (j.done) tokens = j.eval_count ?? null;
  }
  return { text, tokens };
}

const toBase64 = (file) =>
  new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = no;
    r.readAsDataURL(file);
  });

const ROUTER_PROMPT =
  'Classify the user request into exactly one role: "research" (facts, explanations, analysis), ' +
  '"writer" (emails, essays, rewriting, creative text), "coder" (programming, debugging), ' +
  '"maths" (calculations, proofs, equations). Reply ONLY with JSON: {"role":"<role>"}';

// Same signature and return shape as api/base.js
export default async function localBase(input, onchunk, history = [], attachments = []) {
  const cfg = getCfg();
  if (!cfg.router) throw new Error("Pick your local models first (Local mode setup).");

  let transcript = "";
  const note = (s) => {
    transcript += `${transcript ? "\n" : ""}${s}`;
    onchunk?.(transcript, "");
  };

  // attachments
  const images = [];
  let docs = "";
  for (const f of attachments) {
    if (f.type.startsWith("image/")) {
      images.push(await toBase64(f));
    } else if (TEXT_EXT.test(f.name)) {
      const room = Math.max(MAX_DOC_CHARS - docs.length, 0);
      docs += `--- ${f.name} ---\n${(await f.text()).slice(0, room)}\n\n`;
    } else {
      throw new Error(`${f.name}: PDF/DOCX isn't supported in local mode.`);
    }
  }

  // 1) route
  let role = "writer";
  try {
    const routed = await chat({
      model: cfg.router,
      format: "json",
      think: false,
      options: { num_predict: 64, temperature: 0 },
      messages: [
        { role: "system", content: ROUTER_PROMPT },
        { role: "user", content: input },
      ],
    });
    role = JSON.parse(routed.text).role;
  } catch (e) {
    if (String(e.message).startsWith("Can't reach")) throw e;
  }
  if (!ROLES.includes(role)) role = "writer";
  const model = cfg[role] || cfg.router;
  note(`[Router] ${role} -> ${model}`);

  // 2) answer, streamed into finalText
  const documentRequest = DOCUMENT_INTENT.test(input);
  const messages = [
    ...history.map(({ role, content }) => ({ role, content })),
    {
      role: "user",
      content: docs + (documentRequest
        ? `${input}\n\nReturn only the document content in Markdown. Do not discuss whether you can create a file; the application will convert your Markdown into the requested file.`
        : input),
      ...(images.length && { images }),
    },
  ];
  const { text, tokens } = await chat({
    model,
    messages,
    onToken: (_t, full) => onchunk?.(transcript, full),
  });
  if (!text.trim()) throw new Error("The model returned an empty answer.");
  let files = [];
  try {
    const response = await fetch(`${API_BASE}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ message: input, markdown: text }),
    });
    if (!response.ok) throw new Error(`Document service HTTP ${response.status}`);
    const data = await response.json();
    if (data.file) files = [data.file];
  } catch (error) {
    if (!String(error.message).includes("HTTP 400")) throw error;
  }
  return { text, tokenCount: tokens, files };
}
