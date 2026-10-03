import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, LogOut, Loader2 } from "lucide-react";

const API = "http://localhost:8000";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-slate-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40";

const initials = (text) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

function ProfilePanel({ onClose }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [saved, setSaved] = useState({ name: "", nickname: "", systemPrompt: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { kind: "ok" | "error", text }

  useEffect(() => {
    async function fetchProfile() {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
      const data = await res.json();
      setUsername(data.username || "");
      setName(data.full_name || "");
      setEmail(data.email || "");
      setNickname(data.nickname || "");
      setSystemPrompt(data.system_prompt || "");
      setSaved({
        name: data.full_name || "",
        nickname: data.nickname || "",
        systemPrompt: data.system_prompt || "",
      });
      setLoaded(true);
    }
    fetchProfile().catch((error) => {
      console.error("Failed to fetch profile:", error);
      setStatus({ kind: "error", text: "Unable to load profile." });
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dirty =
    name !== saved.name || nickname !== saved.nickname || systemPrompt !== saved.systemPrompt;

  async function saveProfile(e) {
    e.preventDefault();
    if (!loaded || !dirty || saving) return;
    setSaving(true);
    setStatus(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: name, nickname, system_prompt: systemPrompt }),
      });
      if (!response.ok) throw new Error(`Failed to save profile: ${response.status}`);
      setSaved({ name, nickname, systemPrompt });
      setStatus({ kind: "ok", text: "Profile saved." });
    } catch (error) {
      console.error("Failed to save profile:", error);
      setStatus({ kind: "error", text: "Unable to save profile. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const displayName = name || username || "User";

  return (
    <div className="profile-scrollbar box-border z-50 flex h-screen w-[360px] max-w-[100vw] shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-slate-900 px-3 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between px-2 py-5">
        <span className="font-mono text-[16px] font-bold uppercase tracking-[0.25em] text-blue-500">Profile</span>
        <button
          onClick={onClose}
          aria-label="Close profile"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-3.5 border-b border-zinc-800 px-1 pb-5">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#2563eb44] bg-gradient-to-br from-[#1e3a5f] to-[#2563eb22] font-mono text-lg text-blue-400"
        >
          {initials(nickname || name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-200">{displayName}</p>
          {email && <p className="truncate text-xs text-zinc-400">{email}</p>}
        </div>
      </div>

      <form onSubmit={saveProfile} className="flex min-h-0 flex-1 flex-col px-1">
        <div className="space-y-5 py-5">
          <div>
            <p className="mb-1.5 text-xs text-zinc-400">Username</p>
            <p className="break-all font-mono text-sm text-zinc-300">{username || "—"}</p>
          </div>

          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-xs text-zinc-400">Name</label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              autoComplete="name"
              disabled={!loaded}
              className={`${inputClass} disabled:opacity-60`}
            />
          </div>

          <div>
            <label htmlFor="profile-nickname" className="mb-1.5 block text-xs text-zinc-400">
              What should CB-X call you?
            </label>
            <input
              id="profile-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              type="text"
              autoComplete="nickname"
              disabled={!loaded}
              className={`${inputClass} disabled:opacity-60`}
            />
          </div>

          <div>
            <label htmlFor="custom-system-prompt" className="mb-1.5 block text-xs text-zinc-400">
              Custom system prompt for the director AI
            </label>
            <textarea
              id="custom-system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Add extra guidance for how CB-X should route and handle your requests..."
              disabled={!loaded}
              className={`${inputClass} h-[140px] resize-none font-mono text-xs disabled:opacity-60`}
            />
            <p className="mt-1.5 text-[11px] text-zinc-400">
              This is appended after the director's default system prompt.
            </p>
          </div>
        </div>

        <div className="mt-auto space-y-3 pb-6 pt-2">
          <p
            role="status"
            className={`min-h-[1rem] text-xs ${status?.kind === "error" ? "text-red-400" : "text-green-400"}`}
          >
            {status?.text}
          </p>
          <button
            type="submit"
            disabled={!loaded || !dirty || saving}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-semibold text-black shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:from-cyan-300 hover:to-blue-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 text-sm font-medium text-red-300 transition-colors hover:border-red-400 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfilePanel;