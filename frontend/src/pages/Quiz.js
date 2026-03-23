import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getQuiz, saveQuizResult } from "../services/api";

// Robust JSON extractor — 6 strategies
function extractQuizJSON(raw) {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.replace(/```json|```/gi, "").trim();

  // 1. Direct parse
  try { const p = JSON.parse(clean); if (Array.isArray(p) && p.length) return p; } catch(_){}

  // 2. Find first [ to last ] (most common phi output)
  const start = clean.indexOf("[");
  const end   = clean.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    try { const p = JSON.parse(clean.slice(start, end + 1)); if (Array.isArray(p) && p.length) return p; } catch(_){}
  }

  // 3. Fix: unquoted keys, single quotes, trailing commas
  try {
    let fixed = clean
      .replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      .replace(/,\s*([}\]])/g, '$1');
    const s2 = fixed.indexOf("["), e2 = fixed.lastIndexOf("]");
    if (s2 !== -1 && e2 > s2) {
      const p = JSON.parse(fixed.slice(s2, e2 + 1));
      if (Array.isArray(p) && p.length) return p;
    }
  } catch(_){}

  // 4. Regex harvest — pulls individual question objects even from mangled JSON
  try {
    const results = [];
    // Match each {...} block that has a "question" field
    const blockRx = /\{[^{}]*"question"[^{}]*\}/gs;
    const blocks  = [...clean.matchAll(blockRx)];
    for (const block of blocks) {
      try {
        // Fix the block and parse it
        let b = block[0]
          .replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":')
          .replace(/:\s*'([^']*)'/g, ': "$1"')
          .replace(/,\s*}/g, '}');
        const obj = JSON.parse(b);
        if (obj.question) results.push(obj);
      } catch(_){}
    }
    if (results.length > 0) return results;
  } catch(_){}

  // 5. Pure regex field extraction (last resort)
  try {
    const qs = [...clean.matchAll(/"question"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
    const as = [...clean.matchAll(/"answer"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
    const os = [...clean.matchAll(/"options"\s*:\s*\[([^\]]+)\]/g)].map(m =>
      [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1])
    );
    if (qs.length > 0) {
      return qs.map((q, i) => ({
        question: q,
        options: os[i] || ["A) —", "B) —", "C) —", "D) —"],
        answer: as[i] || "—"
      }));
    }
  } catch(_){}

  return null;
}

const TOTAL_SLIDES = 5;

export default function Quiz() {
  const navigate = useNavigate();
  const [topic,    setTopic]    = useState(() => {
    // Pre-fill topic if coming from dashboard "Retake" button
    const params = new URLSearchParams(window.location.search);
    return params.get("topic") || "";
  });
  const [quiz,     setQuiz]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState({});   // { index: optionString }
  const [revealed, setRevealed] = useState({});   // { index: true }
  const [error,      setError]      = useState("");
  const [savedResult, setSavedResult] = useState(false);
  const [bgIndex]                   = useState(1);

  const studentId = localStorage.getItem("studentId") || "anonymous";

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setQuiz([]);
    setSelected({});
    setRevealed({});
    setError("");
    setSavedResult(false);

    try {
      const res = await getQuiz(topic.trim());
      const raw = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      console.log("[Quiz] raw:", raw);

      const parsed = extractQuizJSON(raw);

      if (parsed && parsed.length > 0) {
        setQuiz(parsed);
      } else {
        // Auto retry once with simpler framing
        setError("Retrying…");
        const res2  = await getQuiz(topic.trim());
        const raw2  = typeof res2.data === "string" ? res2.data : JSON.stringify(res2.data);
        const parsed2 = extractQuizJSON(raw2);
        if (parsed2 && parsed2.length > 0) {
          setQuiz(parsed2);
          setError("");
        } else {
          setError("Quiz failed. Try a simpler topic like 'Python basics' or 'History'.");
          console.error("[Quiz] Could not parse:", raw2);
        }
      }
    } catch (e) {
      setError("Cannot connect to backend. Is Spring Boot running on port 8080?");
    } finally {
      setLoading(false);
    }
  };

  // Select an answer and immediately reveal
  const handleSelect = (qi, opt) => {
    if (revealed[qi]) return;   // already answered
    // Use functional updates so both state changes see each other correctly
    setSelected(prev => ({ ...prev, [qi]: opt }));
    setRevealed(prev => ({ ...prev, [qi]: true }));
  };

  const normalize = s => (s || "").replace(/^[A-D][.)]\s*/i, "").trim().toLowerCase();

  const score = quiz.reduce((acc, q, i) =>
    acc + (selected[i] && normalize(selected[i]) === normalize(q.answer || "") ? 1 : 0), 0
  );

  const allAnswered = quiz.length > 0 && Object.keys(revealed).length === quiz.length;

  // Auto-save result to backend when all questions answered
  useEffect(() => {
    if (allAnswered && !savedResult && studentId !== "anonymous") {
      setSavedResult(true);
      saveQuizResult(studentId, topic, score, quiz.length)
        .then(r => {
          if (r.data?.level) localStorage.setItem("studentLevel", r.data.level);
        })
        .catch(() => {});
    }
  }, [allAnswered, savedResult, studentId, topic, score, quiz.length]);

  return (
    <>
      <div className="bg-slideshow">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div key={i} className={"bg-slide" + (i === bgIndex ? " active" : "")} />
        ))}
        <div className="bg-overlay" />
      </div>

      <div className="quiz-layout">
        <div className="quiz-header">
          <button className="btn-ghost" onClick={() => navigate("/")}>← Back</button>
          <h1>🧠 Quiz Generator</h1>
          <div style={{ fontSize: 12, color: "var(--text3)", flex: 1 }}>phi · offline</div>
          <button className="btn-ghost" onClick={() => navigate("/dashboard")}>📊 My Progress</button>
        </div>

        <div className="quiz-body">
          {/* Input row */}
          <div className="quiz-input-row">
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generate()}
              placeholder="Topic: Python, Photosynthesis, World War II…"
              disabled={loading}
            />
            <button className="btn-primary" onClick={generate} disabled={loading || !topic.trim()}>
              {loading ? "Generating…" : "⚡ Generate"}
            </button>
          </div>

          {error && <div className="error-box">⚠ {error}</div>}

          {loading && (
            <div className="quiz-spinner">
              <div className="spinner" />
              <div>Generating quiz on <strong style={{ color: "var(--mint)" }}>{topic}</strong>…</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>15–40 seconds</div>
            </div>
          )}

          {/* Score bar after all answered */}
          {allAnswered && (
            <div className="score-bar">
              <div className="score-circle">{score}/{quiz.length}</div>
              <div className="score-info">
                <strong>
                  {score === quiz.length ? "Perfect! 🎉"
                    : score >= Math.ceil(quiz.length / 2) ? "Good job! 👍"
                    : "Keep studying! 📚"}
                </strong>
                <p>
                  {score} of {quiz.length} correct
                  {savedResult && <span style={{ color: "var(--success)", marginLeft: 8 }}>✓ Saved to your profile</span>}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <button className="btn-ghost" onClick={() => navigate("/dashboard")}>
                  📊 My Progress
                </button>
                <button className="btn-primary" onClick={generate}>Retry</button>
              </div>
            </div>
          )}

          {/* Quiz questions — no CSS animation on these cards to avoid opacity:0 bug */}
          {quiz.map((q, i) => {
            const sel       = selected[i];          // what the user clicked
            const isShown   = revealed[i] === true; // whether to show answer colors
            const isCorrect = sel && normalize(sel) === normalize(q.answer || "");

            return (
              <div
                key={i}
                style={{
                  background: "var(--glass-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "22px 24px",
                  marginBottom: 14
                }}
              >
                {/* Question number + text */}
                <div className="quiz-q-num">Question {i + 1} of {quiz.length}</div>
                <div className="quiz-question">{q.question}</div>

                {/* Options */}
                {(q.options || []).map((opt, j) => {
                  let cls = "option";
                  if (isShown) {
                    if (normalize(opt) === normalize(q.answer || "")) cls += " correct";
                    else if (opt === sel) cls += " wrong";
                  } else if (opt === sel) {
                    cls += " selected";
                  }
                  return (
                    <div
                      key={j}
                      className={cls}
                      onClick={() => handleSelect(i, opt)}
                    >
                      {opt}
                    </div>
                  );
                })}

                {/* Answer reveal — only shown after selection */}
                {isShown && (
                  <div className="answer-reveal">
                    {isCorrect
                      ? "✓ Correct!"
                      : "✓ Correct answer: " + (q.answer || "—")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}