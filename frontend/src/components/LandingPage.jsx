import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchConfiguredModels } from "../api/models";
const thoughts = [
  { label: "Router", text: "Deciding which specialists to call...", color: "text-cyan-400" },
  { label: "Router", text: "Calling ['Researcher']", color: "text-cyan-400" },
  { label: "Researcher", text: "Analyzing query context and compiling answer...", color: "text-green-400" },
  { label: "Merger", text: "Merging outputs...", color: "text-yellow-400" },
  { label: "Final", text: "Response ready. [DONE]", color: "text-cyan-300" },
];

function ThoughtStream() {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    const show = () => {
      setVisible([]);
      thoughts.forEach((_, i) => {
        setTimeout(() => setVisible((prev) => [...prev, i]), i * 700);
      });
    };
    show();
    const reset = setInterval(show, thoughts.length * 700 + 2500);
    return () => clearInterval(reset);
  }, []);

  return (
    <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl p-5 font-mono text-sm space-y-1.5 min-h-[200px]">
      <p className="text-[#4a9eff] font-semibold mb-3 text-xs tracking-widest uppercase">AI Thoughts</p>
      {thoughts.map((t, i) =>
        visible.includes(i) ? (
          <p key={i} className={`${t.color} transition-opacity duration-300`}>
            <span className="opacity-60">[{t.label}]</span> {t.text}
          </p>
        ) : null
      )}
    </div>
  );
}

export default function CBXLanding() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [modelsLoadError, setModelsLoadError] = useState("");

  useEffect(() => {
    fetchConfiguredModels()
      .then(setModels)
      .catch((error) => {
        console.error("Failed to load configured models:", error);
        setModelsLoadError("Unable to load configured models.");
      });
  }, []);

  return (
    <div className="h-screen bg-[#0a0f18] text-white font-sans pt-14 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-400">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="strip absolute w-full h-px top-[20%]" style={{ animationDuration: '2.8s' }}></div>
        <div className="strip absolute w-full h-[3px] top-[20%] blur-sm opacity-50" style={{ animationDuration: '2.8s' }}></div>
        <div className="strip absolute w-full h-px top-[50%] opacity-40" style={{ animationDuration: '3.5s', animationDelay: '-1.5s' }}></div>
        <div className="strip absolute w-full h-[3px] top-[50%] blur-sm opacity-30" style={{ animationDuration: '3.5s', animationDelay: '-1.5s' }}></div>
        <div className="strip absolute w-full h-px top-[78%] opacity-30" style={{ animationDuration: '4s', animationDelay: '-2.8s' }}></div>
      </div>       
      <nav className="fixed top-0 left-0 w-full flex items-center justify-between px-6 py-4 border-b border-[#131c2b] bg-[#0a0f18]/80 backdrop-blur-md z-50">        
        <span className="text-xl font-bold tracking-tight">
          <span className="text-[#4a9eff]">CB</span>
          <span className="text-[#00e5ff]">-X</span>
        </span>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#models" className="hover:text-white transition-colors">Models</a>
          <a href="#demo" className="hover:text-white transition-colors">Demo</a>
        </div>
        <button onClick={() => navigate("/logsign")} className="bg-[#4a9eff] hover:bg-[#3a8eef] text-white text-sm px-4 py-1.5 rounded-lg transition-colors">Get Started</button>
      </nav>

      <section className="max-w-5xl mx-auto pt-6 pb-6 text-center backdrop-blur-sm z-50">
        <div className="inline-flex items-center gap-2 bg-[#0d1117] border border-[#1e2d3d] rounded-full px-4 py-1.5 text-xs text-[#4a9eff] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse inline-block"></span>
          Multi-model AI Orchestration
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-tight"> One interface
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a9eff] to-[#00e5ff]"> Many minds</span>
        </h1>
        <p className="text-gray-400 text-[16px] max-w-xl mx-auto mb-10">CB-X routes your queries to the right specialist AI — researcher, coder, writer, mathematician — then merges the best answer for you.</p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => navigate("/logsign")} className="bg-[#4a9eff] hover:bg-[#3a8eef] text-white px-6 py-2.5 rounded-lg font-medium transition-colors">Start Chatting</button>
          <a href="#models" className="border border-[#1e2d3d] hover:border-[#4a9eff] text-gray-300 hover:text-white px-6 py-2.5 rounded-lg font-medium transition-colors">View Models</a>
        </div>
      </section>

      <section id="demo" className="max-w-4xl mx-auto px-8 pb-8 backdrop-blur-sm z-50">
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2d3d]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00e5ff]"></span>
              <span className="text-[#4a9eff] font-bold text-sm tracking-wide">CB-X</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#1e2d3d] flex items-center justify-center text-xs text-gray-300">P</div>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-[#131c2b] border border-[#1e2d3d] rounded-xl p-4 text-sm text-gray-300 leading-relaxed">
              <span className="text-[#4a9eff] font-semibold text-xs">CB-X : </span>
              Large Language Models, or LLMs like GPT based systems utilize deep learning architectures enabling understanding context comprehension generation coherent language processing making these AI highly versatile in fields ranging from healthcare to customer service. They can perform tasks including answering questions writing stories summarizing articles engaging conversationally etc., leveraging vast amounts of textual data for training purposes while raising ethical concerns over privacy and misuse necessitating measures like transparency accountability responsible deployment alongside addressing challenges that come with their rapid advancements within this evolving field.            </div>
            <ThoughtStream />
            <div className="flex items-center justify-between text-xs text-gray-600 px-1">
              <span>85 words</span>
              <span>680 chars | 170 tokens</span>
            </div>
            <div className="flex gap-3">
              <input readOnly value="what are llms?" className="flex-1 bg-[#131c2b] border border-[#1e2d3d] rounded-lg px-4 py-2.5 text-sm text-gray-300 outline-none"/>
              <button className="bg-[#4a9eff] text-white px-5 py-2.5 rounded-lg text-sm font-medium">Send</button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="max-w-5xl mx-auto px-8 pb-10 backdrop-blur-sm z-50">
        <p className="text-xs tracking-widest text-[#4a9eff] uppercase mb-3 text-center">Why CB-X</p>
        <h2 className="text-3xl font-bold text-center mb-8">Built different</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { title: "Smart Routing", desc: "A router model analyzes your query and picks the best specialist — no manual model switching.", icon: "⇄" },
            { title: "Specialist Models", desc: "Dedicated models for research, coding, writing, and math run in parallel for the task at hand.", icon: "◈" },
            { title: "Merged Output", desc: "A merger model synthesizes specialist responses into one clean, coherent final answer.", icon: "⊕" },
          ].map((f) => (
            <div key={f.title} className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl p-6 hover:border-[#4a9eff]/40 transition-colors">
              <div className="text-2xl mb-4 text-[#00e5ff]">{f.icon}</div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="models" className="max-w-5xl mx-auto px-8 pb-8 backdrop-blur-sm z-50">
        <p className="text-xs tracking-widest text-[#4a9eff] uppercase mb-3 text-center">Under the hood</p>
        <h2 className="text-3xl font-bold text-center mb-8">The specialist lineup</h2>
        <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-2xl overflow-hidden">
          {modelsLoadError ? (
            <p className="px-6 py-4 text-sm text-red-400">{modelsLoadError}</p>
          ) : models.map((m, i) => (
            <div key={m.role} className={`flex items-center justify-between px-6 py-4 text-sm ${i < models.length - 1 ? "border-b border-[#1e2d3d]" : ""} hover:bg-[#131c2b] transition-colors`} >
              <span className="text-white font-medium">{m.role}</span>
              <div className="flex items-center gap-2 text-gray-400 font-mono text-xs">
                {m.model || "Not configured"}
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[#131c2b] py-8 text-center px-8 backdrop-blur-sm z-50">
        <h2 className="text-3xl font-bold mb-4">Ready to think smarter?</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm">CB-X brings together the best local and cloud models in one clean interface. Free to try.</p>
        <button className="bg-[#4a9eff] hover:bg-[#3a8eef] text-white px-8 py-3 rounded-lg font-medium transition-colors">Launch CB-X</button>
      </section>

      <footer className="border-t border-[#131c2b] px-8 py-6 flex items-center justify-between text-xs text-gray-600 backdrop-blur-sm z-50">
        <span><span className="text-[#4a9eff]">CB</span><span className="text-[#00e5ff]">-X</span><span> : </span><span>Multi-model AI orchesteration system</span></span>
        <span>Multi-model AI | Local | Cloud</span>
      </footer>
    </div>
  );
}