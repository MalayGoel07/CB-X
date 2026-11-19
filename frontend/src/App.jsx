import { useState, useEffect, useRef } from "react";
import serverBase from "./api/base";
import localBase from "./api/localBase";
import LocalSetup from "./components/LocalSetup";
import HistoryPanel from "./components/HistoryPanel";
import ModelsPanel from "./components/ModelsPanel";
import ThoughtsInline from "./components/ThoughtsInline";
import OutputBox from "./components/OutputBox";
import InputBar from "./components/InputBar";
import ActionBar from "./components/ActionBar";
import TopBar from "./components/TopBar";
import ProfilePanel from "./components/ProfilePanel";
import SettingPanel from "./components/SettingPanel";
import CollectionPanel from "./components/CollectionPanel";
import Tour from "./components/Tour.jsx";
import { mainSteps, localSteps } from "./components/tours.jsx";
import { API_BASE as API } from "./api/config";
import { authHeaders, handleUnauthorized } from "./api/auth";
import useChats, { newChatObj } from "./hooks/useChats";
import { ToastProvider } from "./components/ui";
const STRIPS = [
  ["h-px top-[20%]", "2.8s"],
  ["h-[3px] top-[20%] blur-sm opacity-50", "2.8s"],
  ["h-px top-[50%] opacity-40", "3.5s", "-1.5s"],
  ["h-[3px] top-[50%] blur-sm opacity-30", "3.5s", "-1.5s"],
  ["h-px top-[78%] opacity-30", "4s", "-2.8s"],
];

const latestReply = (chat) => [...(chat?.messages ?? [])].reverse().find((m) => m.role === "assistant");


const markTutorialDone = async () => {
  const response = await fetch(`${API}/me/tutorial`, {
    method: "POST",
    headers: authHeaders(),
    keepalive: true,
  });
  if (handleUnauthorized(response)) throw new Error("Session expired. Please log in again.");
  if (!response.ok) throw new Error(`Failed to save tutorial status: ${response.status}`);
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
  const [thought, setThought] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLocal, setShowLocal] = useState(false);
  const [executionMode, setExecutionMode] = useState("api");
  const [showCollection, setShowCollection] = useState(false);
  const [tour, setTour] = useState(null);
  const [viewMessages, setViewMessages] = useState(null);
  const requestStartedAt = useRef(null);
  const lastRequest = useRef(null);
  const abortRef = useRef(null);
  const {
  chats, setChats, activeChatId, setActiveChatId, ready: chatsReady,
  tutorialDone, setTutorialDone, syncError, startChat, renameChat, removeChat, clearChats,
} = useChats({ onLoaded: (selected) => showLatest(selected) });
  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const history = activeChat?.messages ?? [];
  const backendStatus = syncError ? "offline" : chatsReady ? "online" : "connecting";
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

  const submit = async (prompt, sentAttachments, baseMessages, { clearInput, mode = executionMode }) => {
    if (loading) return;
    const attachmentMetadata = sentAttachments.map(({ name, type }) => ({ name, type }));
    let chat = activeChat;
    if (!chat) {
      chat = newChatObj();
      baseMessages = [];
      setChats((prev) => [...prev, chat]);
      setActiveChatId(chat.id);
    }
    lastRequest.current = { prompt, files: sentAttachments, baseMessages, chatId: chat.id, mode };
    requestStartedAt.current = performance.now();
    setElapsedMs(0);
    setLoading(true);
    setViewMessages(baseMessages);
    setPendingPrompt(prompt);
    setPendingAttachments(attachmentMetadata);
    resetOutput();
    setThought("");
    setShowConversation(true);
    if (clearInput) {
      setInput("");
      setAttachments([]);
    }
    setAttachmentError("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const run = mode === "local" ? localBase : serverBase;
      const { text: finalText, tokenCount, files = [] } = await run(prompt, (transcript, streamedFinal) => {
        setThought(transcript);
        if (streamedFinal) setOutput(streamedFinal);
      }, baseMessages, sentAttachments, controller.signal);
      setOutput(finalText);
      setOutputTokenCount(tokenCount);
      setOutputFiles(files);
      setChats((prev) => {
        const updatedChat = {
          ...chat,
          title: baseMessages.length === 0 ? prompt.slice(0, 60) : chat.title,
          created: chat.created ?? Date.now(),
          updated: Date.now(),
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
      if (error?.name === "AbortError") {
        // Stopped by the user: nothing was saved, so put the prompt back and show the previous reply.
        if (clearInput) {
          setInput(prompt);
          setAttachments(sentAttachments);
        }
        showLatest({ ...chat, messages: baseMessages });
        setThought("");
      } else {
        console.error("Chat request failed:", error);
        setOutput(`Unable to get a response: ${error instanceof Error ? error.message : "Unknown error"}`);
        if (clearInput) {
          setInput(prompt);
          setAttachments(sentAttachments);
        }
      }
    } finally {
      abortRef.current = null;
      if (requestStartedAt.current !== null) {
        setElapsedMs(performance.now() - requestStartedAt.current);
        requestStartedAt.current = null;
      }
      setViewMessages(null);
      setPendingPrompt("");
      setPendingAttachments([]);
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
    submit(prompt, attachments, history, { clearInput: true, mode: executionMode });
  };

  const rethink = () => {
    if (loading) return;
    const last = lastRequest.current;
    if (last && last.chatId === activeChatId) {
      submit(last.prompt, last.files, last.baseMessages, { clearInput: false, mode: last.mode });
      return;
    }
    const lastReply = history[history.length - 1];
    const lastPrompt = history[history.length - 2];
    if (lastReply?.role !== "assistant" || lastPrompt?.role !== "user") return;
    if (lastPrompt.attachments?.length > 0) {
      setAttachmentError("That message had attachments, which aren't saved. Attach the files again and send.");
      return;
    }
    submit(lastPrompt.content, [], history.slice(0, -2), { clearInput: false, mode: executionMode });
  };

  const stop = () => abortRef.current?.abort();

  useEffect(() => {
    if (!loading || requestStartedAt.current === null) return;
    const id = setInterval(() => {
      if (requestStartedAt.current !== null) setElapsedMs(performance.now() - requestStartedAt.current);
    }, 1000);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!chatsReady || tutorialDone !== false) return undefined;
    const id = setTimeout(() => setTour("main"), 0);
    return () => clearTimeout(id);
  }, [chatsReady, tutorialDone]);

  const clearChat = () => {
    lastRequest.current = null;
    clearChats();
    setInput("");
    resetOutput();
    setThought("");
  };
  
  const deleteChat = (chatId) => {
    const next = removeChat(chatId);
    if (activeChatId !== chatId) return;
    setInput("");
    setThought("");
    setShowConversation(false);
    showLatest(next);
  };
  
  const onNewChat = () => {
    setThought("");
    setShowConversation(false);
    setInput("");
    resetOutput();
    setShowHistory(false);
    startChat();
  };

  const closePanels = () => {
    setShowHistory(false);
    setShowModels(false);
    setShowProfile(false);
    setShowSettings(false);
    setShowCollection(false);
    setShowLocal(false);
  };
  const openSettings = () => { closePanels(); setShowSettings(true); };
  const openProfile = () => { closePanels(); setShowProfile(true); };
  const openModels = () => { closePanels(); setShowModels(true); };
  const openHistory = () => { closePanels(); setShowHistory(true); setShowConversation(false); };
  const openCollection = () => { closePanels(); setShowCollection(true); };
  const openLocal = () => { closePanels(); setShowLocal(true); };
  const chooseExecutionMode = (mode) => {
    setExecutionMode(mode);
    if (mode === "local") openLocal();
    else openModels();
  };
  const endTour = () => {
    const closingTour = tour;
    setTour(null);
    if (closingTour !== "main") return;
    setTutorialDone(true);
    closePanels();
    markTutorialDone().catch((error) => {
      console.error("Failed to save tutorial status:", error);
    });
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

  const activePanel =
    showHistory ? "History" : showModels ? "Models" : showProfile ? "Profile"
    : showSettings ? "Settings" : showCollection ? "Collection" : showLocal ? "Local Ollama" : null;

  return (
    <div className="app-root flex h-screen min-h-0 min-w-0 overflow-hidden overscroll-none bg-[#0a0f18] text-white">
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

      <div className="app-main z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden p-5 overscroll-none">
        <TopBar status={backendStatus} detail={syncError} />

        <div className="app-grid grid min-h-0 min-w-0 w-full max-w-[1000px] flex-1 grid-cols-[minmax(0,1fr)_auto] grid-rows-[minmax(0,1fr)_auto_auto] gap-x-4">
          <div className="col-start-1 row-start-1 flex min-h-0 flex-col">
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
          </div>

          {/* Spans all rows, so it's centred on the whole grid and never moves when thoughts open. */}
          <div className="action-dock col-start-2 row-start-1 row-span-3 self-center">
            <ActionBar
              onHistory={openHistory}
              onModels={openModels}
              onNewChat={onNewChat}
              onProfile={openProfile}
              onSettings={openSettings}
              onLocal={openLocal}
              onCollection={openCollection}
              active={activePanel}
              badges={{ History: chats.filter((c) => c.messages.length > 0).length }}
              loading={loading || !chatsReady}
            />
          </div>

          <div className="col-start-1 row-start-2">
            {(loading || thought) && (
              <div className="pt-4">
                <ThoughtsInline thought={thought} loading={loading} elapsedMs={elapsedMs} />
              </div>
            )}
          </div>

          {/* flex + justify-center puts the input on the output box's centre line. */}
          <div className="col-start-1 row-start-3 flex min-w-0 justify-center pt-4">
            <InputBar
              input={input}
              onChange={setInput}
              onSend={send}
              onStop={stop}
              loading={loading}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              attachmentError={attachmentError}
              onAttachmentError={setAttachmentError}
              executionMode={executionMode}
              onExecutionModeChange={chooseExecutionMode}
            />
          </div>
        </div>
      </div>

      {showProfile && <ProfilePanel apiBase={API} onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingPanel apiBase={API} onClose={() => setShowSettings(false)} onGuide={() => setTour("main")} />}
      {showLocal && <LocalSetup onClose={() => setShowLocal(false)} onGuide={() => setTour("local")} />}
      <Tour
        open={!!tour}
        onClose={endTour}
        steps={tour === "local" ? localSteps() : mainSteps({ openModels, openLocal, closeAll: closePanels })}
      />
    </div>
  );
}

export default function AppWithToasts() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
