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
  const [outputTokenCount,setOutputTokenCount]=useState(null);
  const [pendingPrompt,setPendingPrompt]=useState("");
  const [attachments,setAttachments]=useState([]);
  const [pendingAttachments,setPendingAttachments]=useState([]);
  const [attachmentError,setAttachmentError]=useState("");
  const [loading,setLoading]=useState(false);
  const [elapsedMs,setElapsedMs]=useState(0);
  const requestStartedAt = useRef(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatsReady, setChatsReady] = useState(false);
  const historyLoaded = useRef(false);
  const skipNextHistorySave = useRef(false);
  const [thought,setThought]=useState("");
  const [showThoughts,setShowThoughts]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const [showConversation,setShowConversation]=useState(false);
  const [showModels,setShowModels]=useState(false);
  const [showProfile,setShowProfile]=useState(false);
  const [showSettings,setShowSettings]=useState(false);

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const history = activeChat?.messages ?? [];

  const send = async () => {
    if (!input.trim() && attachments.length === 0)
      return;
    const prompt = input.trim() || (
      attachments.some((file) => file.type.startsWith("image/"))
        ? "Analyze the attached image(s)."
        : "Review the attached file(s)."
    );
    const sentAttachments = attachments;
    const attachmentMetadata = sentAttachments.map(({ name, type }) => ({ name, type }));
    let chat = activeChat;
    if (!chat) {
      chat = { id: crypto.randomUUID(), title: "New chat", messages: [] };
      setChats((prev) => [...prev, chat]);
      setActiveChatId(chat.id);
    }
    requestStartedAt.current = performance.now();
    setElapsedMs(0);
    setLoading(true);
    setPendingPrompt(prompt);
    setPendingAttachments(attachmentMetadata);
    setOutput("");
    setOutputTokenCount(null);
    setThought("");
    setShowThoughts(false);
    setShowConversation(true);
    try {
      const { text: finalText, tokenCount } = await base(prompt, (transcript, streamedFinal) => {
        setThought(transcript);
        if (streamedFinal) setOutput(streamedFinal);
      }, history, sentAttachments);
      setOutput(finalText);
      setOutputTokenCount(tokenCount);
      setAttachments([]);
      setAttachmentError("");
      setChats((prev) => {
        const updatedChat = {
          ...chat,
          title: chat.messages.length === 0 ? prompt.slice(0, 60) : chat.title,
          messages: [
            ...chat.messages,
            { role: "user", content: prompt, attachments: attachmentMetadata },
            { role: "assistant", content: finalText, token_count: tokenCount },
          ],
        };
        return prev.some((item) => item.id === chat.id)
          ? prev.map((item) => item.id === chat.id ? updatedChat : item)
          : [...prev, updatedChat];
      });
    } catch (error) {
      console.error("Chat request failed:", error);
      setOutput(`Unable to get a response: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      if (requestStartedAt.current !== null) {
        setElapsedMs(performance.now() - requestStartedAt.current);
        requestStartedAt.current = null;
      }
      setPendingPrompt("");
      setPendingAttachments([]);
      setShowThoughts(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading || requestStartedAt.current === null) return;
    const intervalId = setInterval(() => {
      if (requestStartedAt.current !== null) {
        setElapsedMs(performance.now() - requestStartedAt.current);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [loading]);
  
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("http://localhost:8000/chats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load chats: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const loadedChats = data.chats || [];
        const selectedChat = loadedChats[loadedChats.length - 1];
        skipNextHistorySave.current = true;
        historyLoaded.current = true;
        setChatsReady(true);
        setChats(loadedChats);
        if (selectedChat) {
          setActiveChatId(selectedChat.id);
          const latestAssistantMessage = [...selectedChat.messages]
            .reverse()
            .find((message) => message.role === "assistant");
          setOutput(latestAssistantMessage?.content ?? "");
          setOutputTokenCount(latestAssistantMessage?.token_count ?? null);
        }
      })
      .catch((error) => {
        console.error("Failed to load chats:", error);
      });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !historyLoaded.current) return;
    if (skipNextHistorySave.current) {
      skipNextHistorySave.current = false;
      return;
    }
    fetch("http://localhost:8000/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ chats }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to save chats: ${response.status}`);
        }
      })
      .catch((error) => {
        console.error("Failed to save chats:", error);
      });
  }, [chats]);

  const clearChat = async () => {
    const token = localStorage.getItem("token");
    skipNextHistorySave.current = true;
    setChats([]);
    setActiveChatId(null);
    setInput("");
    setOutput("");
    setOutputTokenCount(null);
    setThought("");
    if (!token) return;
    try {
      const response = await fetch("http://localhost:8000/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chats: [] }),
      });
      if (!response.ok) {
        throw new Error(`Failed to clear chats: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to clear chats:", error);
    }
  };
  const deleteChat = (chatId) => {
    const remainingChats = chats.filter((chat) => chat.id !== chatId);
    setChats(remainingChats);

    if (activeChatId !== chatId) return;

    const nextChat = remainingChats[remainingChats.length - 1];
    setActiveChatId(nextChat?.id ?? null);
    setInput("");
    setThought("");
    setShowConversation(false);
    const latestAssistantMessage = [...(nextChat?.messages ?? [])]
      .reverse()
      .find((message) => message.role === "assistant");
    setOutput(latestAssistantMessage?.content ?? "");
    setOutputTokenCount(latestAssistantMessage?.token_count ?? null);
  };

  const openSettings = ()=>{ setShowSettings(true); setShowProfile(false); setShowHistory(false); setShowModels(false); };
  const openProfile = ()=>{ setShowProfile(true); setShowHistory(false); setShowModels(false); setShowSettings(false); };
  const openHistory = ()=>{ setShowHistory(true); setShowConversation(false); setShowModels(false); setShowProfile(false); setShowSettings(false); };
  const openModels = ()=>{ setShowModels(true); setShowHistory(false); setShowProfile(false); setShowSettings(false); };
  const onNewChat = async () => {
    setThought("");
    setShowThoughts(false);
    setShowConversation(false);
    setInput("");
    setOutput("");
    setOutputTokenCount(null);
    setShowHistory(false);
    const emptyChat = [...chats].reverse().find((chat) => chat.messages.length === 0);
    if (emptyChat) {
      setActiveChatId(emptyChat.id);
      return;
    }
    const newChat = { id: crypto.randomUUID(), title: "New chat", messages: [] };
    skipNextHistorySave.current = true;
    setChats((prev) => [...prev, newChat]);
    setActiveChatId(newChat.id);
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch("http://localhost:8000/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chats: [...chats, newChat] }),
      });
      if (!response.ok) {
        throw new Error(`Failed to save chats: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to create a new chat:", error);
    }
  };
  const selectChat = (chatId) => {
    const selectedChat = chats.find((chat) => chat.id === chatId);
    if (!selectedChat) return;
    setActiveChatId(chatId);
    setInput("");
    setThought("");
    const latestAssistantMessage = [...selectedChat.messages]
      .reverse()
      .find((message) => message.role === "assistant");
    setOutput(latestAssistantMessage?.content ?? "");
    setOutputTokenCount(latestAssistantMessage?.token_count ?? null);
    setShowConversation(true);
    setShowHistory(false);
  };
  const backToChats = () => {
    setShowConversation(false);
    setShowHistory(true);
  };
  const chatActionsDisabled = loading || !chatsReady;

  return (
    <div className="h-screen overflow-hidden bg-[#0a0f18] text-white flex overscroll-none">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="strip absolute w-full h-px top-[20%]" style={{ animationDuration: '2.8s' }}></div>
        <div className="strip absolute w-full h-[3px] top-[20%] blur-sm opacity-50" style={{ animationDuration: '2.8s' }}></div>
        <div className="strip absolute w-full h-px top-[50%] opacity-40"  style={{ animationDuration: '3.5s', animationDelay: '-1.5s' }}></div>
        <div className="strip absolute w-full h-[3px] top-[50%] blur-sm opacity-30" style={{ animationDuration: '3.5s', animationDelay: '-1.5s' }}></div>
        <div className="strip absolute w-full h-px top-[78%] opacity-30"  style={{ animationDuration: '4s',   animationDelay: '-2.8s' }}></div>
      </div>        
      {showHistory && (
        <HistoryPanel
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={selectChat}
          onDeleteChat={deleteChat}
          onClear={clearChat}
          onClose={() => setShowHistory(false)}
          loading={loading}
        />
      )}
      {showModels && (<ModelsPanel onClose={() => setShowModels(false)} />)}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-5 gap-4 z-50 overscroll-none">
          <TopBar />
          <div className="flex flex-row gap-4 w-[1000px] min-h-0 item-center justify-center">
            <OutputBox
              output={output}
              tokenCount={outputTokenCount}
              onSend={send}
              loading={loading}
              elapsedMs={elapsedMs}
              conversation={showConversation ? history : null}
              conversationTitle={activeChat?.title}
              onBackToChats={backToChats}
              pendingPrompt={pendingPrompt}
              pendingAttachments={pendingAttachments}
            />
            <ActionBar
              onHistory={openHistory}
              onModels={openModels}
              onNewChat={onNewChat}
              onProfile={openProfile}
              onSettings={openSettings}
              loading={chatActionsDisabled}
            />
          </div>
          {loading && (
            <div className="w-[1000px] flex justify-start">
              <button
                onClick={() => setShowThoughts(true)}
                className="text-xs font-medium text-zinc-400 hover:text-cyan-300 transition-colors"
                title="View AI thoughts while the models are working"
              >
                Working &gt;
              </button>
            </div>
          )}
          <InputBar
            input={input}
            onChange={setInput}
            onSend={send}
            loading={loading}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            attachmentError={attachmentError}
            onAttachmentError={setAttachmentError}
          />
      </div>
      {showThoughts && loading && (<ThoughtsModal thought={thought} onClose={() => setShowThoughts(false)} />)}
      {showProfile && (<ProfilePanel onClose={() => setShowProfile(false)} />)}
      {showSettings && (<SettingPanel onClose={() => setShowSettings(false)} />)}
    </div>
  );
}

export default App;