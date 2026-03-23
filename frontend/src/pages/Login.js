import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerStudent, loginStudent } from "../services/api";

const TOTAL_SLIDES = 5;

export default function Login() {
  const navigate = useNavigate();
  const [mode,     setMode]     = useState("login");
  const [name,     setName]     = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    if (!name.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setError(""); setLoading(true);
    try {
      const res = mode === "login"
        ? await loginStudent(name.trim(), password)
        : await registerStudent(name.trim(), password);

      const data = res.data;
      if (data.error) { setError(data.error); return; }

      localStorage.setItem("studentId",    data.studentId);
      localStorage.setItem("studentName",  data.name);
      localStorage.setItem("studentLevel", data.level || "BEGINNER");
      navigate("/");
    } catch (e) {
      // Show specific error based on what failed
      const status = e?.response?.status;
      if (status === 404) {
        setError("API endpoint not found. Make sure StudentController.java is in your project.");
      } else if (!status) {
        setError("Spring Boot is not running. Start it with: mvn spring-boot:run");
      } else {
        setError("Error " + status + ": " + (e?.response?.data?.error || e.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Guest mode — skips backend entirely, uses localStorage only
  const continueAsGuest = () => {
    localStorage.setItem("studentId",    "guest-" + Date.now());
    localStorage.setItem("studentName",  "Guest");
    localStorage.setItem("studentLevel", "BEGINNER");
    navigate("/");
  };

  return (
    <>
      <div className="bg-slideshow">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div key={i} className={"bg-slide" + (i === 0 ? " active" : "")} />
        ))}
        <div className="bg-overlay" />
      </div>

      <div style={{
        position: "relative", zIndex: 1, height: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{
          background: "var(--glass)", backdropFilter: "blur(20px)",
          border: "1px solid var(--border)", borderRadius: 20,
          padding: "40px 36px", width: 390, maxWidth: "92vw"
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🌿</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text1)" }}>Study AI</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
              Your personalized offline learning assistant
            </div>
          </div>

          {/* Toggle */}
          <div style={{
            display: "flex", background: "var(--glass-input)",
            borderRadius: "var(--radius-sm)", padding: 4, marginBottom: 20, gap: 4
          }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "9px 0", border: "none", borderRadius: 8,
                  cursor: "pointer", fontFamily: "var(--font)", fontSize: 13.5, fontWeight: 700,
                  background: mode === m ? "var(--leaf)" : "transparent",
                  color: mode === m ? "white" : "var(--text3)",
                  transition: "all 0.18s"
                }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Input fields */}
          {[
            { placeholder: "Username", value: name, setter: setName, type: "text" },
            { placeholder: "Password", value: password, setter: setPassword, type: "password" }
          ].map(({ placeholder, value, setter, type }) => (
            <input key={placeholder} type={type} value={value} placeholder={placeholder}
              onChange={e => setter(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={{
                display: "block", width: "100%", marginBottom: 12,
                background: "var(--glass-input)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "12px 14px",
                color: "var(--text1)", fontFamily: "var(--font)", fontSize: 14.5,
                outline: "none", boxSizing: "border-box"
              }}
            />
          ))}

          {/* Error box */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: "var(--radius-sm)", marginBottom: 14,
              background: "rgba(232,122,106,0.12)", border: "1px solid rgba(232,122,106,0.3)",
              color: "#e8a090", fontSize: 13, lineHeight: 1.5
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Sign In / Register button */}
          <button onClick={submit} disabled={loading} style={{
            width: "100%", padding: "13px 0", marginBottom: 10,
            background: loading ? "var(--glass-card)" : "linear-gradient(135deg, var(--moss), var(--leaf))",
            border: "none", borderRadius: "var(--radius-sm)",
            color: "white", fontFamily: "var(--font)", fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", transition: "all 0.18s"
          }}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--text3)" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Guest mode */}
          <button onClick={continueAsGuest} style={{
            width: "100%", padding: "11px 0",
            background: "var(--glass-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", color: "var(--text2)",
            fontFamily: "var(--font)", fontSize: 14, fontWeight: 600,
            cursor: "pointer", transition: "all 0.18s"
          }}
            onMouseEnter={e => e.target.style.borderColor = "var(--border-hover)"}
            onMouseLeave={e => e.target.style.borderColor = "var(--border)"}
          >
            Continue as Guest (no account needed)
          </button>

          {/* Backend status hint */}
          <div style={{ marginTop: 16, padding: "10px 13px", background: "rgba(74,154,186,0.08)", border: "1px solid rgba(74,154,186,0.2)", borderRadius: "var(--radius-sm)" }}>
            <div style={{ fontSize: 11.5, color: "var(--accent2)", fontWeight: 700, marginBottom: 4 }}>
              ℹ Backend checklist
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.7 }}>
              1. Spring Boot running on port 8080<br/>
              2. MongoDB running on port 27017<br/>
              3. <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>StudentController.java</code> added to project<br/>
              4. Ollama running: <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>ollama serve</code>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--text3)" }}>
            Fully offline · MongoDB local storage
          </div>
        </div>
      </div>
    </>
  );
}