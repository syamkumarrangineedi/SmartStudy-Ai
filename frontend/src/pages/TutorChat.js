import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { askTutor, uploadFiles, clearMemory, getDocumentStatus, removeFile, clearDocument } from "../services/api";

const SESSIONS_KEY = "studyai_sessions";   // list of session metadata
const TOTAL_SLIDES = 5;

// Generate a unique session id
const newSessionId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Copy text to clipboard
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  } else {
    const el = document.createElement("textarea");
    el.value = text; document.body.appendChild(el);
    el.select(); document.execCommand("copy");
    document.body.removeChild(el);
  }
}

export default function TutorChat() {
  const navigate = useNavigate();

  const studentId    = localStorage.getItem("studentId")    || "anonymous";
  const studentName  = localStorage.getItem("studentName")  || "Student";
  const studentLevel = localStorage.getItem("studentLevel") || "BEGINNER";

  // Each session: { id, title, messages: [{role,text,files?}] }
  const [sessions,    setSessions]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]"); } catch { return []; }
  });
  const [activeIdx,   setActiveIdx]   = useState(null);   // index into sessions[] or null = new blank chat
  const [messages,    setMessages]    = useState([]);
  const [sessionId,   setSessionId]   = useState(newSessionId);

  const [question,    setQuestion]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [loadedFiles, setLoadedFiles] = useState([]);   // filenames currently loaded on backend
  const [pendingFiles,setPendingFiles]= useState([]);   // File objects user picked but not yet sent
  const [uploading,   setUploading]   = useState(false);
  const [uploadMsg,   setUploadMsg]   = useState("");
  const [bgIndex,     setBgIndex]     = useState(0);
  const [copiedIdx,   setCopiedIdx]   = useState(null); // index of message just copied

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const fileInputRef   = useRef(null);

  // Background slideshow
  useEffect(() => {
    const t = setInterval(() => setBgIndex(i => (i + 1) % TOTAL_SLIDES), 10000);
    return () => clearInterval(t);
  }, []);

  // Fetch loaded files from backend on mount
  useEffect(() => {
    getDocumentStatus()
      .then(r => setLoadedFiles(r.data?.fileNames || []))
      .catch(() => {});
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // ── Open a previous session ──
  const openSession = (idx) => {
    const s = sessions[idx];
    if (!s) return;
    setActiveIdx(idx);
    setMessages(s.messages || []);
    setSessionId(s.id);
  };

  // ── Start a fresh chat ──
  const startNewChat = () => {
    // Save current chat if it has messages
    if (messages.length > 0) saveCurrentSession();
    setActiveIdx(null);
    setMessages([]);
    const newId = newSessionId();
    setSessionId(newId);
    clearMemory(studentId + ":" + newId).catch(() => {});
  };

  const saveCurrentSession = useCallback(() => {
    if (messages.length === 0) return;
    const title = (messages[0]?.text || "Chat").slice(0, 45) + (messages[0]?.text?.length > 45 ? "…" : "");
    const sessionObj = { id: sessionId, title, messages, time: Date.now() };
    setSessions(prev => {
      // Update if exists, else prepend
      const existing = prev.findIndex(s => s.id === sessionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = sessionObj;
        return updated;
      }
      return [sessionObj, ...prev].slice(0, 30);
    });
  }, [messages, sessionId]);

  // ── Delete a session ──
  const deleteSession = (e, idx) => {
    e.stopPropagation();
    setSessions(prev => prev.filter((_, i) => i !== idx));
    if (activeIdx === idx) startNewChat();
  };

  const clearAllSessions = () => {
    setSessions([]);
    startNewChat();
  };

  // ── Handle file picking (multi) ──
  const handleFilePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPendingFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...files.filter(f => !names.has(f.name))];
    });
    e.target.value = ""; // allow re-picking same file
  };

  const removePending = (name) => setPendingFiles(prev => prev.filter(f => f.name !== name));

  // Upload all pending files then send the question
  const uploadPendingFiles = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    pendingFiles.forEach(f => fd.append("file", f));
    try {
      const res = await uploadFiles(fd);
      setLoadedFiles(res.data?.fileNames || []);
      setUploadMsg("✓ " + (res.data?.message || "Files uploaded"));
      setTimeout(() => setUploadMsg(""), 5000);
    } catch (e) {
      setUploadMsg("❌ Upload failed: " + (e.response?.data || e.message));
    } finally {
      setUploading(false);
    }
  };

  // ── Send message ──
  const send = useCallback(async () => {
    if ((!question.trim() && pendingFiles.length === 0) || loading) return;

    const q = question.trim();
    const files = [...pendingFiles];
    setQuestion("");
    setPendingFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    // Add user message with file attachments
    const userMsg = { role: "user", text: q, files: files.map(f => f.name) };
    const updated = [...messages, userMsg];
    setMessages(updated);

    // Upload files first if any
    if (files.length > 0) {
      const fd = new FormData();
      files.forEach(f => fd.append("file", f));
      try {
        const res = await uploadFiles(fd);
        setLoadedFiles(res.data?.fileNames || []);
      } catch (_) {}
    }

    const sessionKey = studentId + ":" + sessionId;

    try {
      const res = await askTutor(q || "Please summarize the uploaded document(s)", sessionKey);
      const finalMessages = [...updated, { role: "ai", text: res.data }];
      setMessages(finalMessages);
      // Auto-save session after AI responds
      const title = (q || files[0]?.name || "Chat").slice(0, 45);
      const sessionObj = { id: sessionId, title, messages: finalMessages, time: Date.now() };
      setSessions(prev => {
        const existing = prev.findIndex(s => s.id === sessionId);
        if (existing >= 0) { const u = [...prev]; u[existing] = sessionObj; return u; }
        return [sessionObj, ...prev].slice(0, 30);
      });
    } catch (e) {
      setMessages([...updated, { role: "ai", text: "⚠ Cannot reach backend. Is Spring Boot running on port 8080?" }]);
    } finally {
      setLoading(false);
    }
  }, [question, pendingFiles, loading, messages, sessionId, studentId]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleCopy = (text, idx) => {
    copyToClipboard(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleRemoveLoadedFile = async (name) => {
    try {
      await removeFile(name);
      setLoadedFiles(prev => prev.filter(f => f !== name));
    } catch (_) {}
  };

  const suggestions = [
    "Explain photosynthesis simply",
    "Write a C binary search",
    "What is machine learning?",
    "Summarize my uploaded PDF",
  ];

  return (
    <>
      <div className="bg-slideshow">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div key={i} className={"bg-slide" + (i === bgIndex ? " active" : "")} />
        ))}
        <div className="bg-overlay" />
      </div>

      <div className="app-layout">
        {/* ── SIDEBAR ── */}
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">🌿</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>Study AI</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{studentName} · {studentLevel}</div>
            </div>
          </div>

          <button className="sidebar-btn" onClick={startNewChat}>＋ New Chat</button>
          <button className="sidebar-btn" onClick={() => navigate("/dashboard")}>📊 My Progress</button>
          <button className="sidebar-btn active">💬 Tutor Chat</button>
          <button className="sidebar-btn" onClick={() => navigate("/quiz")}>🧠 Quiz</button>

          {sessions.length > 0 && (
            <>
              <div className="sidebar-section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Recent Chats</span>
                <span onClick={clearAllSessions}
                  style={{ cursor: "pointer", color: "var(--danger)", fontSize: 10, fontWeight: 700 }}>
                  Clear all
                </span>
              </div>
              {sessions.map((s, i) => (
                <div key={s.id} className={"history-item" + (activeIdx === i ? " active-session" : "")}
                  onClick={() => openSession(i)}
                  style={{ display: "flex", alignItems: "center", gap: 4,
                    background: activeIdx === i ? "var(--glass-card)" : undefined,
                    border: activeIdx === i ? "1px solid var(--border-hover)" : "1px solid transparent",
                    borderRadius: "var(--radius-sm)", padding: "8px 10px", cursor: "pointer" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5, color: "var(--text2)" }}>
                    💬 {s.title}
                  </span>
                  <span onClick={(e) => deleteSession(e, i)}
                    style={{ cursor: "pointer", color: "var(--text3)", fontSize: 13, flexShrink: 0 }}
                    title="Delete">✕</span>
                </div>
              ))}
            </>
          )}

          <div className="sidebar-spacer" />

          {/* Loaded files panel */}
          {loadedFiles.length > 0 && (
            <div style={{ background: "var(--glass-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                📎 Loaded Files ({loadedFiles.length})
              </div>
              {loadedFiles.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ flex: 1, fontSize: 11.5, color: "var(--mint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    📄 {f}
                  </span>
                  <span onClick={() => handleRemoveLoadedFile(f)}
                    style={{ cursor: "pointer", color: "var(--text3)", fontSize: 12 }}>✕</span>
                </div>
              ))}
              <span onClick={async () => { await clearDocument(); setLoadedFiles([]); }}
                style={{ cursor: "pointer", fontSize: 11, color: "var(--danger)" }}>
                Remove all
              </span>
            </div>
          )}
        </div>

        {/* ── MAIN ── */}
        <div className="main-area">
          <div className="topbar">
            <h1>🌿 AI Study Tutor</h1>
            <div className="topbar-pill">
              <span style={{ color: "var(--success)", fontSize: 8 }}>●</span> phi · offline
            </div>
            <div className="topbar-pill" onClick={startNewChat} style={{ cursor: "pointer" }}>
              ＋ New Chat
            </div>
          </div>

          {/* Messages */}
          <div className="messages-area">
            {messages.length === 0 ? (
              <div className="empty-state fade-up">
                <div style={{ fontSize: 48 }}>🌿</div>
                <div className="empty-title">What do you want to learn?</div>
                <div className="empty-sub">Ask anything, or attach files to discuss them</div>
                <div className="suggestion-chips">
                  {suggestions.map((s, i) => (
                    <div key={i} className="chip"
                      onClick={() => { setQuestion(s); textareaRef.current?.focus(); }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={"message-row " + m.role}>
                    <div className="message-bubble" style={{ position: "relative" }}>
                      <div className="msg-sender">{m.role === "user" ? "You" : "Study AI"}</div>

                      {/* File attachments shown IN the message bubble */}
                      {m.files && m.files.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                          {m.files.map(f => (
                            <div key={f} style={{
                              display: "flex", alignItems: "center", gap: 5,
                              background: "rgba(126,200,160,0.15)",
                              border: "1px solid rgba(126,200,160,0.3)",
                              borderRadius: 8, padding: "4px 10px",
                              fontSize: 12, color: "var(--mint)"
                            }}>
                              📄 {f}
                            </div>
                          ))}
                        </div>
                      )}

                      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font)", fontSize: 14.5 }}>
                        {m.text}
                      </pre>

                      {/* Copy button — only on AI messages */}
                      {m.role === "ai" && (
                        <button
                          onClick={() => handleCopy(m.text, i)}
                          style={{
                            position: "absolute", top: 10, right: 10,
                            background: "none", border: "1px solid var(--border)",
                            borderRadius: 6, padding: "3px 8px",
                            fontSize: 11, color: copiedIdx === i ? "var(--success)" : "var(--text3)",
                            cursor: "pointer", fontFamily: "var(--font)",
                            transition: "all 0.15s"
                          }}
                        >
                          {copiedIdx === i ? "✓ Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="message-row ai">
                    <div className="message-bubble">
                      <div className="msg-sender">Study AI</div>
                      <div className="typing-dots"><span /><span /><span /></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* ── INPUT BAR ── */}
          <div className="input-bar">
            {uploadMsg && <div className="upload-toast">{uploadMsg}</div>}

            {/* Pending file chips — shown above input */}
            {pendingFiles.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {pendingFiles.map(f => (
                  <div key={f.name} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: "rgba(126,200,160,0.12)",
                    border: "1px solid rgba(126,200,160,0.3)",
                    borderRadius: 100, padding: "4px 12px",
                    fontSize: 12, color: "var(--mint)"
                  }}>
                    📄 {f.name}
                    <span onClick={() => removePending(f.name)}
                      style={{ cursor: "pointer", marginLeft: 4, color: "var(--text3)" }}>✕</span>
                  </div>
                ))}
              </div>
            )}

            <div className="input-row">
              {/* Multi-file upload button */}
              <label className="file-label icon-btn" title="Attach PDF or TXT files (multiple allowed)">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  multiple
                  onChange={handleFilePick}
                  disabled={uploading}
                />
                {uploading ? "⏳" : "📎"}
              </label>

              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder={pendingFiles.length > 0
                  ? "Ask about the attached files, or just press Send…"
                  : "Ask anything… (Enter to send, Shift+Enter for new line)"}
                rows={1}
                disabled={loading}
              />

              <button className="send-btn"
                onClick={send}
                disabled={loading || (!question.trim() && pendingFiles.length === 0)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            </div>

            <div className="input-hint">
              Powered by Ollama · phi · offline
              {loadedFiles.length > 0 && <span style={{ color: "var(--mint)", marginLeft: 8 }}>· {loadedFiles.length} file(s) loaded</span>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}