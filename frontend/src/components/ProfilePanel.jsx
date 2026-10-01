import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ProfilePanel({ onClose }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function fetchProfile() {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8000/me", {
        headers: {Authorization: `Bearer ${token}`}
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch profile: ${res.status}`);
    }
    const data = await res.json();
    setUsername(data.username || "");
    setName(data.full_name || "");
    setEmail(data.email);
    setNickname(data.nickname || "");
    setSystemPrompt(data.system_prompt || "");
    }
    fetchProfile().catch((error) => {
      console.error("Failed to fetch profile:", error);
      setStatus("Unable to load profile.");
    });},
    []);

  async function saveProfile() {
    const token = localStorage.getItem("token");

    const response = await fetch("http://localhost:8000/me", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            full_name: name,
            nickname: nickname,
            system_prompt: systemPrompt,
        })
    });
    if (!response.ok) {
      throw new Error(`Failed to save profile: ${response.status}`);
    }
    setStatus("Profile saved.");
}
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };
  return (
    <div className="profile-scrollbar box-border h-screen w-[360px] max-w-[100vw] shrink-0 bg-slate-900 flex flex-col overflow-y-auto overflow-x-hidden px-3 z-50 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between px-2 py-5">
        <span className="font-mono text-[16px] font-bold tracking-[0.25em] text-blue-500 uppercase flex items-center gap-2">Profile</span>
        <button onClick={onClose} className="text-[13px] font-mono text-red-400 transition-colors">✕ close</button>
      </div>

      <div className="flex items-center gap-3.5 px-1 py-5 border-b border-[#1a1d27]">
        <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2563eb22] border border-[#2563eb44] flex items-center justify-center font-mono text-lg text-blue-400 shrink-0">
           {(nickname || name || "U")
            .split(" ")
            .map(x => x[0])
            .join("")
            .slice(0,2)
            .toUpperCase()}
        </div>
        <div className="text-sm font-medium text-slate-200">{name || username || "User"}</div>
      </div>

      <div className="flex min-w-0 flex-col px-1">
        <div className="flex min-w-0 items-center justify-between gap-3 py-3 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-100">Username</span>
          <span className="min-w-0 break-all text-xs text-right font-mono text-zinc-300">{username}</span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 py-3 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-100">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-36 min-w-0 text-xs text-center font-mono text-white outline-none border border-blue-300"/>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 py-3 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-100">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="text" className="w-36 min-w-0 text-xs text-center font-mono text-white outline-none border border-blue-300" readOnly/>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 py-3 border-b border-zinc-800">
          <span className="text-sm font-medium text-zinc-100">What should CB-X call u?</span>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} type="text" className="w-36 min-w-0 text-xs text-center font-mono text-white outline-none border border-blue-300"/>
        </div>
        <div className="flex flex-col item-start justify-between py-3 gap-2">
          <label htmlFor="custom-system-prompt" className="text-sm font-medium text-zinc-100">
            Custom system prompt for the director AI
          </label>
          <textarea
            id="custom-system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Add extra guidance for how CB-X should route and handle your requests..."
            className="text-xs p-2 font-mono text-white bg-slate-950 rounded w-full h-[140px] outline-none border border-blue-300"
          />
          <p className="text-[11px] text-zinc-400">
            This is appended after the director's default system prompt.
          </p>
        </div>
      </div>

      <div className="mt-auto px-6 pb-6 pt-5">
        {status && <p role="status" className="text-xs text-zinc-300 mb-2">{status}</p>}
        <button onClick={() => saveProfile().catch((error) => {
          console.error("Failed to save profile:", error);
          setStatus("Unable to save profile.");
        })} className="w-[300px] h-[50px] flex items-center justify-center bg-slate-900 hover:bg-slate-950 border border-zinc-500 text-white hover:border-blue-500 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-105 transition-all duration-300 text-sm font-medium px-4 rounded-xl active:scale-95">Save Changes</button>
        <button onClick={handleLogout} className="w-[300px] h-[44px] mt-3 flex items-center justify-center border border-red-500/40 text-red-300 hover:border-red-400 hover:text-red-200 transition-colors text-sm font-medium rounded-xl">
          Log out
        </button>
      </div>
    </div>
  );
}
export default ProfilePanel;