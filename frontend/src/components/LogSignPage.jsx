import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, Route, Layers, Merge } from "lucide-react";
import api from "../api/api";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e5ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f18]";

const inputClass =
  "w-full rounded-lg border border-[#1e2d3d] bg-[#131c2b] px-4 py-2.5 text-sm text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-[#4a9eff] focus:ring-1 focus:ring-[#4a9eff]/40 disabled:opacity-60";

const PITCH = [
  { Icon: Route, text: "Each question goes to the specialist best suited to it." },
  { Icon: Layers, text: "Researcher, coder, writer and math models work on their part of the task." },
  { Icon: Merge, text: "You get one merged answer, and can watch the thinking." },
];

function Field({ id, label, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs text-gray-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, disabled }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={onChange}
        type={visible ? "text" : "password"}
        placeholder="••••••••"
        autoComplete={autoComplete}
        disabled={disabled}
        required
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 transition-colors hover:text-gray-200 ${focusRing}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function LogSignPage() {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const isLogin = mode === "login";

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);
        const { data } = await api.post("/auth/login", formData);
        localStorage.setItem("token", data.access_token);
      } else {
        const { data } = await api.post("/auth/signup", {
          username: email,
          email: email,
          full_name: fullName,
          password: password,
        });
        localStorage.setItem("token", data.access_token);
      }
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const tab = (active) =>
    `flex-1 py-3 text-sm font-medium transition-colors ${focusRing} ${
      active ? "border-b-2 border-[#4a9eff] text-[#4a9eff]" : "text-gray-500 hover:text-gray-300"
    }`;

  return (
    <div className="flex min-h-screen flex-col overflow-y-auto bg-[#0a0f18] font-sans text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="strip absolute top-[20%] h-px w-full" style={{ animationDuration: "2.8s" }}></div>
        <div className="strip absolute top-[20%] h-[3px] w-full opacity-50 blur-sm" style={{ animationDuration: "2.8s" }}></div>
        <div className="strip absolute top-[55%] h-px w-full opacity-40" style={{ animationDuration: "3.5s", animationDelay: "-1.5s" }}></div>
        <div className="strip absolute top-[55%] h-[3px] w-full opacity-30 blur-sm" style={{ animationDuration: "3.5s", animationDelay: "-1.5s" }}></div>
        <div className="strip absolute top-[80%] h-px w-full opacity-20" style={{ animationDuration: "4s", animationDelay: "-2.8s" }}></div>
      </div>

      <nav className="z-50 flex items-center justify-between border-b border-white/10 bg-[#0a0f18]/60 px-6 py-4 backdrop-blur-xl">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-[#4a9eff]">CB</span>
          <span className="text-[#00e5ff]">-X</span>
        </span>
        <button
          onClick={() => navigate("/")}
          className={`inline-flex items-center gap-1.5 rounded text-sm text-gray-400 transition-colors hover:text-[#4a9eff] ${focusRing}`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
      </nav>

      <main className="z-10 flex flex-1 items-center justify-center gap-16 px-6 py-10">
        <div className="hidden max-w-sm lg:block">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Your questions, routed to the right model.
          </h1>
          <ul className="mt-8 space-y-5">
            {PITCH.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm leading-relaxed text-gray-400">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#00e5ff]" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div role="tablist" aria-label="Account" className="flex border-b border-white/10">
            <button role="tab" aria-selected={isLogin} onClick={() => switchMode("login")} className={tab(isLogin)}>
              Log in
            </button>
            <button role="tab" aria-selected={!isLogin} onClick={() => switchMode("signup")} className={tab(!isLogin)}>
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <h2 className="mb-1 text-lg font-semibold">{isLogin ? "Welcome back" : "Create your account"}</h2>
              <p className="text-xs text-gray-500">
                {isLogin ? "Log in to your CB-X workspace." : "Start orchestrating AI models today."}
              </p>
            </div>

            {!isLogin && (
              <Field id="full-name" label="Full name">
                <input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  disabled={submitting}
                  required
                  className={inputClass}
                />
              </Field>
            )}

            <Field id="email" label="Email">
              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                autoComplete={isLogin ? "username" : "email"}
                autoFocus
                disabled={submitting}
                required
                className={inputClass}
              />
            </Field>

            <Field id="password" label="Password">
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                disabled={submitting}
              />
            </Field>

            {!isLogin && (
              <Field id="confirm-password" label="Confirm password">
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </Field>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`flex w-full items-center justify-center gap-2 rounded-lg bg-[#4a9eff] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3a8eef] disabled:cursor-not-allowed disabled:opacity-70 ${focusRing}`}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? (isLogin ? "Logging in…" : "Creating account…") : isLogin ? "Log in" : "Create account"}
            </button>

            <p className="text-center text-xs text-gray-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(isLogin ? "signup" : "login")}
                className={`rounded text-[#4a9eff] transition-colors hover:text-[#00e5ff] ${focusRing}`}
              >
                {isLogin ? "Sign up" : "Log in"}
              </button>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}