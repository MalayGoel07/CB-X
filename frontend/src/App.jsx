import { useState, useEffect, useRef } from "react";
import base from "./api/base";
import HistoryPanel from "./components/HistoryPanel";
import ModelsPanel from "./components/ModelsPanel";
import ThoughtsModal from "./components/ThoughtsModal";
import OutputBox from "./components/OutputBox";
import InputBar from "./components/InputBar";
import ActionBar from "./components/ActionBar";
import TopBar from "./components/TopBar";
import ProfilePanel from "./components/ProfilePanel";
import SettingPanel from "./components/SettingPanel";

function App() {
  const [input,setInput]=useState("");
  const [output,setOutput]=useState("");
  const [loading,setLoading]=useState(false);
  const [history, setHistory] = useState([]);
  const historyLoaded = useRef(false);
  const skipNextHistorySave = useRef(false);
  const [thought,setThought]=useState("");
  const [showThoughts,setShowThoughts]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const [showModels,setShowModels]=useState(false);
  const [showProfile,setShowProfile]=useState(false);
  const [showSettings,setShowSettings]=useState(false);

  const send = async () => {
    if (!input.trim())
      return;
    setLoading(true);
    setOutput("");
    setThought("");
    try {
      const finalText = await base(input, (transcript, streamedFinal) => {
        setThought(transcript);
        if (streamedFinal) setOutput(streamedFinal);
      }, history);
      setOutput(finalText);
      setHistory((prev) => [...prev,{ role:"user",content: input },{ role:"assistant",content: finalText }]);
    } catch (error) {
      console.error("Chat request failed:", error);
      setOutput(`Unable to get a response: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("http://localhost:8000/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load history: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        skipNextHistorySave.current = true;
        historyLoaded.current = true;
        setHistory(data.history || []);
      })
      .catch((error) => {
        console.error("Failed to load chat history:", error);
      });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !historyLoaded.current) return;
    if (skipNextHistorySave.current) {
      skipNextHistorySave.current = false;
      return;
    }
    fetch("http://localhost:8000/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ history }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to save history: ${response.status}`);
        }
      })
      .catch((error) => {
        console.error("Failed to save chat history:", error);
      });
  }, [history]);

  const clearChat = async () => {
    const token = localStorage.getItem("token");
    skipNextHistorySave.current = true;
    setHistory([]);
    setOutput("");
    if (!token) return;
    try {
      const response = await fetch("http://localhost:8000/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ history: [] }),
      });
      if (!response.ok) {
        throw new Error(`Failed to clear history: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to clear chat history:", error);
    }
  };

  const openSettings = ()=>{ setShowSettings(true); setShowProfile(false); setShowHistory(false); setShowModels(false); };
  const openProfile = ()=>{ setShowProfile(true); setShowHistory(false); setShowModels(false); setShowSettings(false); };
  const openHistory = ()=>{ setShowHistory(true); setShowModels(false); setShowProfile(false); setShowSettings(false); };
  const openModels = ()=>{ setShowModels(true); setShowHistory(false); setShowProfile(false); setShowSettings(false); };
  const onNewChat = async () => {
    setThought("");
    skipNextHistorySave.current = true;
    setHistory([]);
    setInput("");
    setOutput("");
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch("http://localhost:8000/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ history: [] }),
      });
      if (!response.ok) {
        throw new Error(`Failed to clear history: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to start a new chat:", error);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0a0f18] text-white flex">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="strip absolute w-full h-px top-[20%]" style={{ animationDuration: '2.8s' }}></div>
        <div className="strip absolute w-full h-[3px] top-[20%] blur-sm opacity-50" style={{ animationDuration: '2.8s' }}></div>
        <div className="strip absolute w-full h-px top-[50%] opacity-40"  style={{ animationDuration: '3.5s', animationDelay: '-1.5s' }}></div>
        <div className="strip absolute w-full h-[3px] top-[50%] blur-sm opacity-30" style={{ animationDuration: '3.5s', animationDelay: '-1.5s' }}></div>
        <div className="strip absolute w-full h-px top-[78%] opacity-30"  style={{ animationDuration: '4s',   animationDelay: '-2.8s' }}></div>
      </div>        
      {showHistory && (<HistoryPanel history={history} onClear={clearChat} onClose={() => setShowHistory(false)} />)}
      {showModels && (<ModelsPanel onClose={() => setShowModels(false)} />)}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-5 gap-4 z-50">
          <TopBar onProfile={openProfile} onSettings={openSettings}/>
          <div className="flex flex-row gap-4 w-[1000px] min-h-0 item-center justify-center">
            <OutputBox output={output} onSend={send} loading={loading}/>
            <ActionBar onThoughts={() => setShowThoughts(true)} onHistory={openHistory} onModels={openModels} onNewChat={onNewChat}/>
          </div>
          <InputBar input={input} onChange={setInput} onSend={send} loading={loading}/>
      </div>
      {showThoughts && (<ThoughtsModal thought={thought} onClose={() => setShowThoughts(false)} />)}
      {showProfile && (<ProfilePanel onClose={() => setShowProfile(false)} />)}
      {showSettings && (<SettingPanel onClose={() => setShowSettings(false)} />)}
    </div>
  );
}

export default App;