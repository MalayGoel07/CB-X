import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Route, Layers, Merge, Search, Code, PenLine, Sigma, ArrowRight, Cpu } from "lucide-react";
import { fetchConfiguredModels } from "../api/models";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00e5ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f18]";

const SPECIALISTS = [
  { key: "research", label: "Researcher", Icon: Search },
  { key: "code", label: "Coder", Icon: Code },
  { key: "write", label: "Writer", Icon: PenLine },
  { key: "math", label: "Math", Icon: Sigma },
];

const ROLE_ICONS = { router: Route, research: Search, cod: Code, writ: PenLine, math: Sigma, merg: Merge };

const STEPS = [
  { label: "Router", text: "Deciding which specialists to call…" },
  { label: "Router", text: "Calling ['Researcher']" },
  { label: "Researcher", text: "Compiling an answer from the query…" },
  { label: "Merger", text: "Merging outputs…" },
  { label: "Final", text: "Response ready." },
];

const FEATURES = [
  { title: "Smart routing", desc: "A router model reads your question and picks the best specialists. No manual model switching.", Icon: Route },
  { title: "Specialist models", desc: "Dedicated models for research, code, writing and math work on the parts of the task they're best at.", Icon: Layers },
  { title: "One merged answer", desc: "A merger model combines the specialists' output into a single, coherent reply.", Icon: Merge },
];

// Steps through the demo and holds on the final step for a moment.
function useDemoStep(total) {
  const [tick, setTick] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? total - 1 : 0
  );
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => (t + 1) % (total + 2)), 1100);
    return () => clearInterval(id);
  }, [total]);
  return Math.min(tick, total - 1);
}

function Node({ Icon, label, state }) {
  const styles = {
    active: "border-[#00e5ff] bg-[#00e5ff]/10 text-white shadow-[0_0_24px_-6px_#00e5ff]",
    picked: "border-[#4a9eff]/60 bg-[#4a9eff]/10 text-gray-200",
    idle: "border-white/10 bg-black/20 text-gray-500",
  }[state];
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors duration-300 ${styles}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </div>
  );
}

function Connector({ on }) {
  return <div className={`mx-auto h-4 w-px transition-colors duration-300 ${on ? "bg-[#00e5ff]" : "bg-white/15"}`} />;
}

function RoutingDemo() {
  const s = useDemoStep(STEPS.length);
  const routerState = s <= 1 ? "active" : "picked";
  const mergerState = s === 3 ? "active" : s === 4 ? "picked" : "idle";
  const specialistState = (key) => {
    if (key !== "research") return "idle";
    if (s === 2) return "active";
    return s >= 1 ? "picked" : "idle";
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
        <span className="h-2 w-2 rounded-full bg-[#00e5ff]" />
        <span className="text-sm font-bold tracking-wide text-[#4a9eff]">CB-X</span>
      </div>

      <p className="sr-only">
        Example: for the question "what are llms?", the router picks the Researcher, and the merger combines its work
        into the final answer.
      </p>

      <div className="space-y-4 p-5" aria-hidden="true">
        <div className="ml-auto w-fit rounded-xl bg-white/[0.07] px-3 py-2 text-sm text-gray-200">what are llms?</div>

        <div>
          <Node Icon={Route} label="Router" state={routerState} />
          <Connector on={s >= 1} />
          <div className="grid grid-cols-2 gap-2">
            {SPECIALISTS.map(({ key, label, Icon }) => (
              <Node key={key} Icon={Icon} label={label} state={specialistState(key)} />
            ))}
          </div>
          <Connector on={s >= 3} />
          <Node Icon={Merge} label="Merger" state={mergerState} />
        </div>

        <p className="font-mono text-xs text-gray-400">
          <span className="text-[#4a9eff]">[{STEPS[s].label}]</span> {STEPS[s].text}
        </p>

        <div className="min-h-[104px]">
          <div
            className={`rounded-xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-relaxed text-gray-300 transition-opacity duration-500 ${
              s === 4 ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-xs font-semibold text-[#4a9eff]">CB-X : </span>
            LLMs are neural networks trained on huge amounts of text. By learning how language fits together, they can
            answer questions, summarize articles, write code and hold a conversation.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CBXLanding() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoadError, setModelsLoadError] = useState("");

  useEffect(() => {
    fetchConfiguredModels()
      .then((data) => {
        setModels(data);
        setModelsLoaded(true);
      })
      .catch((error) => {
        console.error("Failed to load configured models:", error);
        setModelsLoadError("Unable to load configured models.");
      });
  }, []);

  const iconForRole = (role) => {
    const key = Object.keys(ROLE_ICONS).find((k) => role.toLowerCase().includes(k));
    return key ? ROLE_ICONS[key] : Cpu;
  };

  const getStarted = () => navigate("/logsign");

  return (
    <div className="h-screen scroll-smooth overflow-y-auto bg-[#0a0f18] pt-14 font-sans text-white scrollbar-thin scrollbar-thumb-cyan-400">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-[8%] top-[12%] h-80 w-80 rounded-full bg-[#4a9eff]/20 blur-3xl"></div>
        <div className="absolute right-[6%] top-[40%] h-96 w-96 rounded-full bg-[#00e5ff]/15 blur-3xl"></div>
        <div className="absolute bottom-[8%] left-[30%] h-72 w-72 rounded-full bg-[#4a9eff]/15 blur-3xl"></div>
        <div className="strip absolute top-[20%] h-px w-full" style={{ animationDuration: "2.8s" }}></div>
        <div className="strip absolute top-[20%] h-[3px] w-full opacity-50 blur-sm" style={{ animationDuration: "2.8s" }}></div>
        <div className="strip absolute top-[50%] h-px w-full opacity-40" style={{ animationDuration: "3.5s", animationDelay: "-1.5s" }}></div>
        <div className="strip absolute top-[50%] h-[3px] w-full opacity-30 blur-sm" style={{ animationDuration: "3.5s", animationDelay: "-1.5s" }}></div>
        <div className="strip absolute top-[78%] h-px w-full opacity-30" style={{ animationDuration: "4s", animationDelay: "-2.8s" }}></div>
      </div>

      <nav className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-[#131c2b] bg-[#0a0f18]/60 px-6 py-4 backdrop-blur-xl">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-[#4a9eff]">CB</span>
          <span className="text-[#00e5ff]">-X</span>
        </span>
        <div className="hidden items-center gap-8 text-sm text-gray-400 md:flex">
          <a href="#features" className={`rounded transition-colors hover:text-white ${focusRing}`}>How it works</a>
          <a href="#models" className={`rounded transition-colors hover:text-white ${focusRing}`}>Models</a>
        </div>
        <button onClick={getStarted} className={`rounded-lg bg-[#4a9eff] px-4 py-1.5 text-sm text-white transition-colors hover:bg-[#3a8eef] ${focusRing}`}>
          Get started
        </button>
      </nav>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
              Ask once. The right models answer.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-gray-400">
              CB-X sends each question to the specialist best suited to it (researcher, coder, writer or
              mathematician), then merges their work into one clear answer.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={getStarted}
                className={`inline-flex items-center gap-2 rounded-lg bg-[#4a9eff] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#3a8eef] ${focusRing}`}
              >
                Start chatting
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="#models"
                className={`rounded-lg border border-[#1e2d3d] px-6 py-2.5 font-medium text-gray-300 transition-colors hover:border-[#4a9eff] hover:text-white ${focusRing}`}
              >
                View models
              </a>
            </div>
          </div>
          <RoutingDemo />
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="mb-10 text-3xl font-bold tracking-tight">How a question becomes an answer</h2>
          <div className="grid divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl md:grid-cols-3 md:divide-x md:divide-y-0">
            {FEATURES.map(({ title, desc, Icon }) => (
              <div key={title} className="p-8">
                <Icon className="mb-4 h-6 w-6 text-[#00e5ff]" aria-hidden="true" />
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="models" className="mx-auto max-w-4xl px-6 pb-20">
          <h2 className="mb-2 text-3xl font-bold tracking-tight">The specialist lineup</h2>
          <p className="mb-8 text-sm text-gray-400">The model currently configured for each role.</p>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            {modelsLoadError ? (
              <p className="px-6 py-4 text-sm text-red-400" role="alert">{modelsLoadError}</p>
            ) : !modelsLoaded ? (
              <p className="px-6 py-4 text-sm text-gray-500">Loading models…</p>
            ) : models.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-500">No models configured yet.</p>
            ) : (
              models.map((m, i) => {
                const Icon = iconForRole(m.role);
                return (
                  <div
                    key={m.role}
                    className={`flex items-center justify-between px-6 py-4 text-sm transition-colors hover:bg-white/[0.05] ${
                      i < models.length - 1 ? "border-b border-white/10" : ""
                    }`}
                  >
                    <span className="flex items-center gap-3 font-medium text-white">
                      <Icon className="h-4 w-4 text-[#4a9eff]" aria-hidden="true" />
                      {m.role}
                    </span>
                    <span className="flex items-center gap-2 font-mono text-xs text-gray-400">
                      {m.model || "Not configured"}
                      {m.model && <span className="h-1.5 w-1.5 rounded-full bg-green-400" aria-hidden="true" />}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="border-t border-[#131c2b] px-6 py-20 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">Try it on a real question</h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-gray-400">
            CB-X brings the best local and cloud models into one clean interface. Free to try.
          </p>
          <button onClick={getStarted} className={`rounded-lg bg-[#4a9eff] px-8 py-3 font-medium text-white transition-colors hover:bg-[#3a8eef] ${focusRing}`}>
            Launch CB-X
          </button>
        </section>
      </main>

      <footer className="relative z-10 flex flex-col gap-2 border-t border-[#131c2b] px-6 py-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="text-[#4a9eff]">CB</span>
          <span className="text-[#00e5ff]">-X</span> · Multi-model AI orchestration
        </span>
        <span>Local and cloud models</span>
      </footer>
    </div>
  );
}