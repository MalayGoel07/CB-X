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
import CollectionPanel from "./components/CollectionPanel";

// Change this in one place when you deploy.
const API = "http://localhost:8000";

const STRIPS = [
  ["h-px top-[20%]", "2.8s"],
  ["h-[3px] top-[20%] blur-sm opacity-50", "2.8s"],
  ["h-px top-[50%] opacity-40", "3.5s", "-1.5s"],
  ["h-[3px] top-[50%] blur-sm opacity-30", "3.5s", "-1.5s"],
  ["h-px top-[78%] opacity-30", "4s", "-2.8s"],
];

const hasToken = () => !!localStorage.getItem("token");
const latestReply = (chat) => [...(chat?.messages ?? [])].reverse().find((m) => m.role === "assistant");
const newChatObj = () => ({ id: crypto.randomUUID(), title: "New chat", messages: [] });

const saveChats = async (chats) => {
  const response = await fetch(`${API}/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
    body: JSON.stringify({ chats }),
  });
  if (!response.ok) throw new Error(`Failed to save chats: ${response.status}`);
};

function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [outputTokenCount, setOutputTokenCount] = useState(null);
  const [outputFiles, setOutputFiles] = useState([]);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatsReady, setChatsReady] = useState(false);
  const [thought, setThought] = useState("");
  const [showThoughts, setShowThoughts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  // Messages shown in the chat while a request runs (hides the reply being replaced).
  const [viewMessages, setViewMessages] = useState(null);
  const requestStartedAt = useRef(null);
  const historyLoaded = useRef(false);
  const skipNextHistorySave = useRef(false);
  // The last request, kept so Rethink can replay it (including the attached files).
  const lastRequest = useRef(null);

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const history = activeChat?.messages ?? [];

  // Shows a chat's latest reply (text, tokens, generated files) in the output box.
  const showLatest = (chat) => {
    const m = latestReply(chat);
    setOutput(m?.content ?? "");
    setOutputTokenCount(m?.token_count ?? null);
    setOutputFiles(m?.files ?? []);
  };

  const resetOutput = () => {
    setOutput("");
    setOutputTokenCount(null);
    setOutputFiles([]);
  };

  // Runs one request. baseMessages is the history sent to the models and the
  // history the new exchange is appended to, so Rethink can replace the last reply.
  const submit = async (prompt, sentAttachments, baseMessages, { clearInput }) => {
    if (loading) return;
    const attachmentMetadata = sentAttachments.map(({ name, type }) => ({ name, type }));
    let chat = activeChat;
    if (!chat) {
      chat = newChatObj();
      baseMessages = [];
      setChats((prev) => [...prev, chat]);
      setActiveChatId(chat.id);
    }
    lastRequest.current = { prompt, files: sentAttachments, baseMessages, chatId: chat.id };
    requestStartedAt.current = performance.now();
    setElapsedMs(0);
    setLoading(true);
    setViewMessages(baseMessages);
    setPendingPrompt(prompt);
    setPendingAttachments(attachmentMetadata);
    resetOutput();
    setThought("");
    setShowThoughts(false);
    setShowConversation(true);
    if (clearInput) {
      setInput("");
      setAttachments([]);
    }
    setAttachmentError("");
    try {
      const { text: finalText, tokenCount, files = [] } = await base(prompt, (transcript, streamedFinal) => {
        setThought(transcript);
        if (streamedFinal) setOutput(streamedFinal);
      }, baseMessages, sentAttachments);
      setOutput(finalText);
      setOutputTokenCount(tokenCount);
      setOutputFiles(files);
      setChats((prev) => {
        const updatedChat = {
          ...chat,
          title: baseMessages.length === 0 ? prompt.slice(0, 60) : chat.title,
          messages: [
            ...baseMessages,
            { role: "user", content: prompt, attachments: attachmentMetadata },
            { role: "assistant", content: finalText, token_count: tokenCount, files },
          ],
        };
        return prev.some((item) => item.id === chat.id)
          ? prev.map((item) => (item.id === chat.id ? updatedChat : item))
          : [...prev, updatedChat];
      });
    } catch (error) {
      console.error("Chat request failed:", error);
      setOutput(`Unable to get a response: ${error instanceof Error ? error.message : "Unknown error"}`);
      if (clearInput) {
        setInput(prompt);
        setAttachments(sentAttachments);
      }
    } finally {
      if (requestStartedAt.current !== null) {
        setElapsedMs(performance.now() - requestStartedAt.current);
        requestStartedAt.current = null;
      }
      setViewMessages(null);
      setPendingPrompt("");
      setPendingAttachments([]);
      setShowThoughts(false);
      setLoading(false);
    }
  };

  const send = () => {
    if (!input.trim() && attachments.length === 0) return;
    const prompt = input.trim() || (
      attachments.some((file) => file.type.startsWith("image/"))
        ? "Analyze the attached image(s)."
        : "Review the attached file(s)."
    );
    submit(prompt, attachments, history, { clearInput: true });
  };

  // Rethink: run the last request again and replace its reply (no duplicate turn).
  const rethink = () => {
    if (loading) return;
    const last = lastRequest.current;
    if (last && last.chatId === activeChatId) {
      submit(last.prompt, last.files, last.baseMessages, { clearInput: false });
      return;
    }
    // After a page reload there is no saved request, so rebuild it from the chat.
    const lastReply = history[history.length - 1];
    const lastPrompt = history[history.length - 2];
    if (lastReply?.role !== "assistant" || lastPrompt?.role !== "user") return;
    if (lastPrompt.attachments?.length > 0) {
      setAttachmentError("That message had attachments, which aren't saved. Attach the files again and send.");
      return;
    }
    submit(lastPrompt.content, [], history.slice(0, -2), { clearInput: false });
  };

  // Elapsed-time ticker while a request runs.
  useEffect(() => {
    if (!loading || requestStartedAt.current === null) return;
    const id = setInterval(() => {
      if (requestStartedAt.current !== null) setElapsedMs(performance.now() - requestStartedAt.current);
    }, 1000);
    return () => clearInterval(id);
  }, [loading]);

  // Load saved chats once.
  useEffect(() => {
    if (!hasToken()) return;
    fetch(`${API}/chats`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load chats: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const loaded = data.chats || [];
        const selected = loaded[loaded.length - 1];
        skipNextHistorySave.current = true;
        historyLoaded.current = true;
        setChatsReady(true);
        setChats(loaded);
        if (selected) {
          setActiveChatId(selected.id);
          showLatest(selected);
        }
      })
      .catch((error) => console.error("Failed to load chats:", error));
  }, []);

  // Save chats whenever they change.
  useEffect(() => {
    if (!hasToken() || !historyLoaded.current) return;
    if (skipNextHistorySave.current) {
      skipNextHistorySave.current = false;
      return;
    }
    saveChats(chats).catch((error) => console.error("Failed to save chats:", error));
  }, [chats]);

  const clearChat = async () => {
    skipNextHistorySave.current = true;
    lastRequest.current = null;
    setChats([]);
    setActiveChatId(null);
    setInput("");
    resetOutput();
    setThought("");
    if (!hasToken()) return;
    try {
      await saveChats([]);
    } catch (error) {
      console.error("Failed to clear chats:", error);
    }
  };

  const deleteChat = (chatId) => {
    const remaining = chats.filter((chat) => chat.id !== chatId);
    setChats(remaining);
    if (activeChatId !== chatId) return;
    const nextChat = remaining[remaining.length - 1];
    setActiveChatId(nextChat?.id ?? null);
    setInput("");
    setThought("");
    setShowConversation(false);
    showLatest(nextChat);
  };
  

  const closePanels = () => {
    setShowHistory(false);
    setShowModels(false);
    setShowProfile(false);
    setShowSettings(false);
    setShowCollection(false);
  };
  const openSettings = () => { closePanels(); setShowSettings(true); };
  const openProfile = () => { closePanels(); setShowProfile(true); };
  const openModels = () => { closePanels(); setShowModels(true); };
  const openHistory = () => { closePanels(); setShowHistory(true); setShowConversation(false); };
  const openCollection = () => { closePanels(); setShowCollection(true); };

  const onNewChat = async () => {
    setThought("");
    setShowThoughts(false);
    setShowConversation(false);
    setInput("");
    resetOutput();
    setShowHistory(false);
    const emptyChat = [...chats].reverse().find((chat) => chat.messages.length === 0);
    if (emptyChat) {
      setActiveChatId(emptyChat.id);
      return;
    }
    const newChat = newChatObj();
    skipNextHistorySave.current = true;
    setChats((prev) => [...prev, newChat]);
    setActiveChatId(newChat.id);
    if (!hasToken()) return;
    try {
      await saveChats([...chats, newChat]);
    } catch (error) {
      console.error("Failed to create a new chat:", error);
    }
  };

  const selectChat = (chatId) => {
    const selected = chats.find((chat) => chat.id === chatId);
    if (!selected) return;
    setActiveChatId(chatId);
    setInput("");
    setThought("");
    showLatest(selected);
    setShowConversation(true);
    setShowHistory(false);
  };

  const backToChats = () => {
    setShowConversation(false);
    setShowHistory(true);
  };

  return (
    <div className="app-root h-screen overflow-hidden bg-[#0a0f18] text-white flex overscroll-none">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {STRIPS.map(([cls, duration, delay], i) => (
          <div
            key={i}
            className={`strip absolute w-full ${cls}`}
            style={{ animationDuration: duration, ...(delay && { animationDelay: delay }) }}
          />
        ))}
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
      {showModels && <ModelsPanel apiBase={API} onClose={() => setShowModels(false)} />}
      {showCollection && <CollectionPanel apiBase={API} onClose={() => setShowCollection(false)} />}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center p-5 gap-4 z-50 overscroll-none">
        <TopBar />
        <div className="flex flex-row gap-4 w-full max-w-[1000px] min-h-0 items-center justify-center">
          <OutputBox
            output={output}
            tokenCount={outputTokenCount}
            files={outputFiles}
            apiBase={API}
            onSend={rethink}
            loading={loading}
            elapsedMs={elapsedMs}
            conversation={showConversation ? (viewMessages ?? history) : null}
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
            onCollection={openCollection}
            loading={loading || !chatsReady}
          />
        </div>
        {loading && (
          <div className="w-full max-w-[1000px] flex justify-start">
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
      {showThoughts && loading && <ThoughtsModal thought={thought} onClose={() => setShowThoughts(false)} />}
      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;