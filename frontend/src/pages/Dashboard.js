import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../services/api";

const TOTAL_SLIDES = 5;

// Simple bar chart using divs — no external chart library needed
function BarChart({ data }) {
  if (!data || data.length === 0) return (
    <div style={{ color: "var(--text3)", fontSize: 13, padding: "20px 0" }}>
      No quiz data yet. Take a quiz to see your stats!
    </div>
  );
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 10, color: "var(--text3)" }}>{d.value}%</div>
          <div style={{
            width: "100%", height: Math.max((d.value / max) * 90, 4),
            background: d.value >= 80 ? "var(--success)"
                      : d.value >= 60 ? "var(--warning)"
                      : "var(--danger)",
            borderRadius: "4px 4px 0 0",
            transition: "height 0.5s ease"
          }} />
          <div style={{
            fontSize: 9, color: "var(--text3)", textAlign: "center",
            maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
          }} title={d.label}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// Radial progress ring
function ProgressRing({ value, size = 80, stroke = 7, color = "var(--mint)" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (value / 100);
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={size/2} y={size/2 + 5} textAnchor="middle"
        fill="var(--text1)" fontSize={13} fontWeight={700}
        fontFamily="var(--font)">{value}%</text>
    </svg>
  );
}

export default function Dashboard() {
  const navigate  = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const studentId   = localStorage.getItem("studentId");
  const studentName = localStorage.getItem("studentName");

  useEffect(() => {
    if (!studentId) { navigate("/login"); return; }
    getProfile(studentId)
      .then(r => setProfile(r.data))
      .catch(() => setError("Could not load profile. Is Spring Boot running?"))
      .finally(() => setLoading(false));
  }, [studentId, navigate]);

  const logout = () => {
    localStorage.removeItem("studentId");
    localStorage.removeItem("studentName");
    localStorage.removeItem("studentLevel");
    navigate("/login");
  };

  // Build bar chart data from topicStats
  const chartData = profile
    ? Object.entries(profile.topicStats || {})
        .map(([topic, stat]) => ({
          label: topic,
          value: Math.round(stat.percent !== undefined ? stat.percent : (stat.total ? stat.correct/stat.total*100 : 0))
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];

  // Overall accuracy
  const overallAccuracy = profile && profile.quizzesTaken > 0
    ? Math.round(
        Object.values(profile.topicStats || {}).reduce((s, t) => s + t.correct, 0) /
        Math.max(Object.values(profile.topicStats || {}).reduce((s, t) => s + t.total, 0), 1) * 100
      )
    : 0;

  const weakTopics  = profile
    ? Object.entries(profile.topicStats || {})
        .filter(([, s]) => (s.total ? s.correct/s.total*100 : 0) < 60)
        .map(([t]) => t)
    : [];

  const strongTopics = profile
    ? Object.entries(profile.topicStats || {})
        .filter(([, s]) => (s.total ? s.correct/s.total*100 : 0) >= 80)
        .map(([t]) => t)
    : [];

  const levelColor = {
    BEGINNER:     "var(--warning)",
    INTERMEDIATE: "var(--accent2)",
    ADVANCED:     "var(--success)"
  };

  return (
    <>
      <div className="bg-slideshow">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div key={i} className={"bg-slide" + (i === 2 ? " active" : "")} />
        ))}
        <div className="bg-overlay" />
      </div>

      <div style={{
        position: "relative", zIndex: 1, height: "100vh",
        display: "flex", flexDirection: "column",
        background: "var(--glass-light)",
        backdropFilter: "blur(12px)", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          background: "var(--glass)", borderBottom: "1px solid var(--border)",
          padding: "14px 26px", display: "flex", alignItems: "center", gap: 14,
          flexShrink: 0
        }}>
          <div style={{ fontSize: 22 }}>🌿</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text1)" }}>
              Welcome back, {studentName || "Student"} 👋
            </div>
            {profile && (
              <div style={{ fontSize: 12, color: "var(--text3)" }}>
                Level:&nbsp;
                <span style={{ color: levelColor[profile.currentLevel] || "var(--text2)", fontWeight: 700 }}>
                  {profile.currentLevel}
                </span>
                &nbsp;·&nbsp;{profile.quizzesTaken || 0} quizzes taken
                &nbsp;·&nbsp;{profile.totalScore || 0} points
              </div>
            )}
          </div>
          <button className="btn-ghost" onClick={() => navigate("/")}>💬 Tutor</button>
          <button className="btn-ghost" onClick={() => navigate("/quiz")}>🧠 Quiz</button>
          <button className="btn-ghost" onClick={logout} style={{ color: "var(--danger)", borderColor: "rgba(232,122,106,0.3)" }}>
            Sign Out
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 26px" }}>

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text2)" }}>
              <div className="spinner" /> Loading your profile…
            </div>
          )}

          {error && <div className="error-box">{error}</div>}

          {profile && (
            <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* ── Top stats row ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                {[
                  { label: "Total Points",    value: profile.totalScore || 0,    icon: "⭐" },
                  { label: "Quizzes Taken",   value: profile.quizzesTaken || 0,  icon: "📝" },
                  { label: "Topics Studied",  value: Object.keys(profile.topicStats || {}).length, icon: "📚" },
                  { label: "Strong Topics",   value: strongTopics.length,         icon: "💪" },
                ].map((stat, i) => (
                  <div key={i} style={{
                    background: "var(--glass-card)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius)", padding: "16px 18px"
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{stat.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text1)" }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Overall accuracy + level ── */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14
              }}>
                {/* Accuracy ring */}
                <div style={{
                  background: "var(--glass-card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", padding: "20px 22px",
                  display: "flex", alignItems: "center", gap: 18
                }}>
                  <ProgressRing
                    value={overallAccuracy}
                    color={overallAccuracy >= 80 ? "var(--success)" : overallAccuracy >= 60 ? "var(--warning)" : "var(--danger)"}
                  />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text1)" }}>Overall Accuracy</div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                      Across all {profile.quizzesTaken || 0} quizzes
                    </div>
                    <div style={{
                      marginTop: 8, fontSize: 12, fontWeight: 700, padding: "4px 10px",
                      borderRadius: 100, display: "inline-block",
                      background: overallAccuracy >= 80 ? "rgba(94,200,122,0.15)"
                                : overallAccuracy >= 60 ? "rgba(232,196,90,0.15)"
                                : "rgba(232,122,106,0.15)",
                      color: overallAccuracy >= 80 ? "var(--success)"
                           : overallAccuracy >= 60 ? "var(--warning)"
                           : "var(--danger)"
                    }}>
                      {overallAccuracy >= 80 ? "Excellent" : overallAccuracy >= 60 ? "Good" : "Needs Practice"}
                    </div>
                  </div>
                </div>

                {/* Level card */}
                <div style={{
                  background: "var(--glass-card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", padding: "20px 22px"
                }}>
                  <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 10 }}>Your Level</div>
                  <div style={{
                    fontSize: 22, fontWeight: 800,
                    color: levelColor[profile.currentLevel] || "var(--text1)"
                  }}>
                    {profile.currentLevel === "BEGINNER"     ? "🌱 Beginner"
                   : profile.currentLevel === "INTERMEDIATE" ? "🌿 Intermediate"
                   : "🌳 Advanced"}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "var(--text3)" }}>
                    {profile.currentLevel === "BEGINNER"
                      ? `Earn ${50 - (profile.totalScore||0)} more points to reach Intermediate`
                      : profile.currentLevel === "INTERMEDIATE"
                      ? `Earn ${150 - (profile.totalScore||0)} more points to reach Advanced`
                      : "You've reached the highest level! 🎉"}
                  </div>
                  {/* Progress bar toward next level */}
                  {profile.currentLevel !== "ADVANCED" && (
                    <div style={{
                      marginTop: 10, height: 6, background: "var(--border)",
                      borderRadius: 3, overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: levelColor[profile.currentLevel],
                        width: profile.currentLevel === "BEGINNER"
                          ? Math.min((profile.totalScore||0)/50*100,100) + "%"
                          : Math.min(((profile.totalScore||0)-50)/100*100,100) + "%",
                        transition: "width 0.8s ease"
                      }} />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Topic performance chart ── */}
              <div style={{
                background: "var(--glass-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: "20px 22px"
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 16 }}>
                  📊 Topic Performance
                </div>
                <BarChart data={chartData} />
                <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11 }}>
                  <span style={{ color: "var(--success)" }}>■ ≥80% Strong</span>
                  <span style={{ color: "var(--warning)" }}>■ 60–79% OK</span>
                  <span style={{ color: "var(--danger)" }}>■ &lt;60% Needs work</span>
                </div>
              </div>

              {/* ── Weak topics / Recommendations ── */}
              {weakTopics.length > 0 && (
                <div style={{
                  background: "rgba(232,122,106,0.08)", border: "1px solid rgba(232,122,106,0.25)",
                  borderRadius: "var(--radius)", padding: "18px 22px"
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e8a090", marginBottom: 10 }}>
                    📌 Topics to Improve
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {weakTopics.map(t => (
                      <button key={t}
                        onClick={() => navigate("/quiz?topic=" + encodeURIComponent(t))}
                        style={{
                          background: "rgba(232,122,106,0.12)", border: "1px solid rgba(232,122,106,0.3)",
                          borderRadius: 100, padding: "6px 14px", cursor: "pointer",
                          color: "#e8a090", fontSize: 13, fontFamily: "var(--font)",
                          transition: "all 0.15s"
                        }}>
                        Retake: {t} →
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Strong topics ── */}
              {strongTopics.length > 0 && (
                <div style={{
                  background: "rgba(94,200,122,0.07)", border: "1px solid rgba(94,200,122,0.2)",
                  borderRadius: "var(--radius)", padding: "18px 22px"
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success)", marginBottom: 10 }}>
                    ✅ Strong Topics
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {strongTopics.map(t => (
                      <span key={t} style={{
                        background: "rgba(94,200,122,0.12)", border: "1px solid rgba(94,200,122,0.25)",
                        borderRadius: 100, padding: "5px 14px", fontSize: 13, color: "var(--success)"
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Recent quiz history ── */}
              {(profile.recentResults || []).length > 0 && (
                <div style={{
                  background: "var(--glass-card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", padding: "20px 22px"
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 14 }}>
                    🕓 Recent Quizzes
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[...profile.recentResults].reverse().slice(0, 8).map((r, i) => {
                      const pct = Math.round(r.score / r.total * 100);
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 14px",
                          background: "var(--glass-input)", borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)"
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 600, flex: 1, color: "var(--text1)" }}>
                            {r.topic}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text3)" }}>
                            {new Date(r.timestamp).toLocaleDateString()}
                          </div>
                          <div style={{
                            padding: "3px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700,
                            background: pct >= 80 ? "rgba(94,200,122,0.15)" : pct >= 60 ? "rgba(232,196,90,0.15)" : "rgba(232,122,106,0.15)",
                            color: pct >= 80 ? "var(--success)" : pct >= 60 ? "var(--warning)" : "var(--danger)"
                          }}>
                            {r.score}/{r.total} · {pct}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {profile.quizzesTaken === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text3)" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text2)" }}>No quiz data yet</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>Take your first quiz and your progress will appear here</div>
                  <button className="btn-primary" style={{ marginTop: 18 }} onClick={() => navigate("/quiz")}>
                    Take a Quiz →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}