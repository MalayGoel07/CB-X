import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE as API } from "../api/config";
import { authHeaders, handleUnauthorized } from "../api/auth";

const hasToken = () => !!localStorage.getItem("token");
const DAY = 864e5;
const GROUPS = ["Today", "Yesterday", "Previous 7 days", "Older"];

// The backend drops unknown fields on /chats, so created/updated live in localStorage.
const TIMES_KEY = "cbx:chat-times";
const readTimes = () => {
  try { return JSON.parse(localStorage.getItem(TIMES_KEY)) || {}; } catch { return {}; }
};
// Rewritten from the live chat list, so deleted chats are pruned automatically.
const writeTimes = (chats) => {
  const next = {};
  chats.forEach((c) => {
    if (c.created != null || c.updated != null) next[c.id] = { created: c.created, updated: c.updated };
  });
  try { localStorage.setItem(TIMES_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
};
const withTimes = (list) => {
  const times = readTimes();
  return list.map((c) => (times[c.id] ? { ...c, ...times[c.id] } : c));
};

export const newChatObj = () => {
  const t = Date.now();
  return { id: crypto.randomUUID(), title: "New chat", created: t, updated: t, messages: [] };
};

async function saveChats(chats) {
  const response = await fetch(`${API}/chats`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ chats }),
  });
  if (handleUnauthorized(response)) throw new Error("Session expired. Please log in again.");
  if (!response.ok) throw new Error(`Failed to save chats: ${response.status}`);
}

/* ---------- pure helpers (grouping + search) ---------- */
function excerpt(text, q) {
  const flat = text.replace(/\s+/g, " ");
  const i = flat.toLowerCase().indexOf(q);
  const start = Math.max(0, i - 30);
  return `${start > 0 ? "…" : ""}${flat.slice(start, i + q.length + 60)}…`;
}

/** Filters by title and message text, sorts newest first, groups by day. Chats are stored oldest-first. */
export function groupChats(chats, query = "", nowMs = Date.now()) {
  const q = query.trim().toLowerCase();
  const startOfToday = new Date(nowMs).setHours(0, 0, 0, 0);
  const bucket = (ts) =>
    ts == null ? "Older"
    : ts >= startOfToday ? "Today"
    : ts >= startOfToday - DAY ? "Yesterday"
    : ts >= startOfToday - 7 * DAY ? "Previous 7 days"
    : "Older";

  const rows = [];
  chats.forEach((chat, index) => {
    let snippet = null;
    if (q) {
      const titleHit = chat.title.toLowerCase().includes(q);
      const hit = chat.messages.find((m) => (m.content ?? "").toLowerCase().includes(q));
      if (!titleHit && !hit) return;
      if (hit) snippet = excerpt(hit.content, q);
    }
    rows.push({ chat, index, snippet, ts: chat.updated ?? chat.created ?? null });
  });

  rows.sort((a, b) => (b.ts ?? -Infinity) - (a.ts ?? -Infinity) || b.index - a.index);

  const byLabel = new Map(GROUPS.map((label) => [label, []]));
  rows.forEach((row) => byLabel.get(bucket(row.ts)).push(row));
  return GROUPS.filter((label) => byLabel.get(label).length).map((label) => ({ label, items: byLabel.get(label) }));
}

/* ---------- hook ---------- */
export default function useChats({ onLoaded } = {}) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [ready, setReady] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const loaded = useRef(false);
  const skipNextSave = useRef(false);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => { onLoadedRef.current = onLoaded; });

  // Load once.
  useEffect(() => {
    if (!hasToken()) return undefined;
    let off = false;
    fetch(`${API}/chats`, { headers: authHeaders() })
      .then((response) => {
        if (handleUnauthorized(response)) throw new Error("Session expired. Please log in again.");
        if (!response.ok) throw new Error(`Failed to load chats: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (off) return;
        const list = withTimes(data.chats || []);
        const selected = list[list.length - 1];
        skipNextSave.current = true;
        loaded.current = true;
        setTutorialDone(Boolean(data.tutorial_done));
        setReady(true);
        setChats(list);
        if (selected) {
          setActiveChatId(selected.id);
          onLoadedRef.current?.(selected);
        }
      })
      .catch((error) => {
        console.error("Failed to load chats:", error);
        if (!off) setSyncError(error.message);
      });
    return () => { off = true; };
  }, []);

  // Save on every change after the initial load.
  useEffect(() => {
    if (!hasToken() || !loaded.current) return;
    writeTimes(chats);
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveChats(chats)
      .then(() => setSyncError(null))
      .catch((error) => {
        console.error("Failed to save chats:", error);
        setSyncError(error.message);
      });
  }, [chats]);

  /** Reuses an existing empty chat, otherwise creates one. Returns its id. */
  const startChat = useCallback(() => {
    const empty = [...chats].reverse().find((c) => c.messages.length === 0);
    if (empty) {
      setActiveChatId(empty.id);
      return empty.id;
    }
    const chat = newChatObj();
    setChats((prev) => [...prev, chat]);
    setActiveChatId(chat.id);
    return chat.id;
  }, [chats]);

  const renameChat = useCallback((id, title) => {
    const next = String(title).trim().slice(0, 80);
    if (!next) return;
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: next } : c)));
  }, []);

  /** Returns the chat that becomes active when the active one is deleted, otherwise null. */
  const removeChat = useCallback((id) => {
    const remaining = chats.filter((c) => c.id !== id);
    setChats(remaining);
    if (id !== activeChatId) return null;
    const next = remaining[remaining.length - 1] ?? null;
    setActiveChatId(next?.id ?? null);
    return next;
  }, [chats, activeChatId]);

  const clearChats = useCallback(() => {
    setChats([]);
    setActiveChatId(null);
  }, []);

  return {
    chats, setChats, activeChatId, setActiveChatId, ready,
    tutorialDone, setTutorialDone, syncError,
    startChat, renameChat, removeChat, clearChats,
  };
}