import { useState, useEffect, useRef } from "react";

const VIEWS = { IDLE: "idle", LESSON: "lesson", QUIZ: "quiz", PROGRESS: "progress" };

const CODE_BUG = `def add_item(item, cart=[]):
    cart.append(item)
    return cart`;

const CODE_FIX = `def add_item(item, cart=None):
    if cart is None:
        cart = []
    cart.append(item)
    return cart`;

const LESSON_DATA = {
  concept: "Mutable Default Argument",
  severity: "warning",
  lang: "Python",
  file: "cart.py",
  line: 1,
  explanation: "Using a mutable object like a list as a default argument is a classic Python trap. The default value is created once when the function is defined — not each time it's called. Every call without an argument shares the same list.",
  diagram: [
    { label: "Call 1", desc: "cart=[]  →  cart=[\"apple\"]", type: "bug" },
    { label: "Call 2", desc: "cart=[\"apple\"]  →  cart=[\"apple\",\"banana\"]", type: "bug" },
    { label: "Fix", desc: "cart=None  →  cart=[]  each call", type: "fix" },
  ],
};

const QUIZ_QUESTIONS = [
  {
    q: "Why is using [] as a default argument dangerous in Python?",
    options: [
      "Lists are too slow as default values",
      "The list is shared across all calls without explicit argument",
      "Python doesn't allow lists as default arguments",
      "It only fails in Python 2",
    ],
    correct: 1,
    explanation: "The default object is evaluated once at function definition time and reused across all calls."
  },
  {
    q: "Which of these is the correct fix?",
    options: [
      "def f(x, items=list())",
      "def f(x, items=[]): items = []",
      "def f(x, items=None): if items is None: items = []",
      "def f(x, items=()): items = list(items)",
    ],
    correct: 2,
    explanation: "Using None as sentinel and creating the list inside the function guarantees a fresh list each call."
  },
];

const STREAK_DATA = [5, 3, 7, 4, 6, 8, 5];
const CONCEPTS = [
  { name: "Mutable Default Args", mastery: 82, lang: "Python", color: "#6366f1" },
  { name: "SQL Injection", mastery: 65, lang: "Python", color: "#f59e0b" },
  { name: "Null Reference", mastery: 44, lang: "JavaScript", color: "#10b981" },
  { name: "Race Conditions", mastery: 28, lang: "Go", color: "#ef4444" },
];

function TypeWriter({ text, speed = 18, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(t); setDone(true); onDone && onDone(); }
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return <span>{displayed}{!done && <span className="cursor">▋</span>}</span>;
}

function CodeBlock({ code, label, type }) {
  return (
    <div style={{
      background: type === "fix" ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
      border: `1px solid ${type === "fix" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)"}`,
      borderRadius: 8, padding: "10px 14px", marginBottom: 8,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12,
      lineHeight: 1.7,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          color: type === "fix" ? "#10b981" : "#ef4444",
          background: type === "fix" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          padding: "2px 7px", borderRadius: 4,
        }}>{label}</span>
      </div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: type === "fix" ? "#d1fae5" : "#fecaca" }}>{code}</pre>
    </div>
  );
}

function DiagramRow({ item, index }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 200 + index * 180); }, []);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 8, marginBottom: 6,
      background: item.type === "fix" ? "rgba(16,185,129,0.07)" : "rgba(99,102,241,0.07)",
      border: `1px solid ${item.type === "fix" ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.15)"}`,
      opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(-12px)",
      transition: "opacity 0.35s ease, transform 0.35s ease",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
        background: item.type === "fix" ? "#10b981" : "#6366f1",
        boxShadow: `0 0 8px ${item.type === "fix" ? "#10b981" : "#6366f1"}`,
      }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", minWidth: 48 }}>{item.label}</span>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: item.type === "fix" ? "#6ee7b7" : "#c7d2fe" }}>{item.desc}</span>
    </div>
  );
}

function ProgressBar({ value, color, animated = true }) {
  const [w, setW] = useState(0);
  useEffect(() => { setTimeout(() => setW(value), 300); }, [value]);
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 100, height: 5, overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 100, width: `${w}%`,
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        boxShadow: `0 0 10px ${color}80`,
        transition: animated ? "width 1s cubic-bezier(.4,0,.2,1)" : "none",
      }} />
    </div>
  );
}

export default function VedaExtension() {
  const [view, setView] = useState(VIEWS.IDLE);
  const [detecting, setDetecting] = useState(false);
  const [lessonReady, setLessonReady] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [skillScore] = useState(847);
  const [streak] = useState(12);

  const triggerAnalysis = () => {
    setDetecting(true);
    setView(VIEWS.IDLE);
    setLessonReady(false);
    setTimeout(() => { setDetecting(false); setLessonReady(true); setView(VIEWS.LESSON); }, 2200);
  };

  const startQuiz = () => {
    setQuizIdx(0); setSelected(null); setAnswered(false); setScore(0); setQuizDone(false);
    setView(VIEWS.QUIZ);
  };

  const handleAnswer = (i) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (i === QUIZ_QUESTIONS[quizIdx].correct) setScore(s => s + 1);
    setTimeout(() => {
      if (quizIdx + 1 < QUIZ_QUESTIONS.length) { setQuizIdx(q => q + 1); setSelected(null); setAnswered(false); }
      else setQuizDone(true);
    }, 1500);
  };

  return (
    <div style={{
      width: 340, height: 680, background: "#0d1117",
      fontFamily: "'Poppins', sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
      borderRadius: 14, boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .veda-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .veda-btn { transition: all 0.18s ease; cursor: pointer; }
        .nav-tab:hover { background: rgba(255,255,255,0.06) !important; }
        .nav-tab { transition: all 0.18s ease; cursor: pointer; }
        .cursor { animation: blink 1s step-end infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes breathe { 0%,100%{box-shadow:0 0 16px #6366f180} 50%{box-shadow:0 0 32px #6366f1b0} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ffffff18; border-radius: 4px; }
      `}</style>

      {/* Ambient background */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 60% 30% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)",
      }} />

      {/* ── HEADER ── */}
      <div style={{
        padding: "14px 16px 12px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0, position: "relative", zIndex: 2,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Logo mark */}
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px #6366f150", animation: "breathe 3s ease-in-out infinite",
          }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M3 4 L10 16 L17 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="10" cy="16" r="2" fill="#fbbf24"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.01em" }}>Veda</div>
            <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: -1 }}>learn</div>
          </div>
        </div>

        {/* Status + score */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {detecting && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 100, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid #6366f1", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
              <span style={{ fontSize: 10, color: "#818cf8", fontWeight: 600 }}>Analyzing</span>
            </div>
          )}
          {!detecting && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 100, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              <span style={{ fontSize: 10, color: "#6ee7b7", fontWeight: 600 }}>Active</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 100, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <span style={{ fontSize: 11 }}>⚡</span>
            <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 700 }}>{skillScore}</span>
          </div>
        </div>
      </div>

      {/* ── NAV TABS ── */}
      <div style={{
        display: "flex", gap: 2, padding: "8px 12px 0",
        flexShrink: 0, position: "relative", zIndex: 2,
      }}>
        {[
          { id: VIEWS.IDLE, icon: "⚡", label: "Detect" },
          { id: VIEWS.LESSON, icon: "📖", label: "Lesson" },
          { id: VIEWS.QUIZ, icon: "🎯", label: "Quiz" },
          { id: VIEWS.PROGRESS, icon: "📈", label: "Progress" },
        ].map(tab => (
          <button key={tab.id} className="nav-tab" onClick={() => setView(tab.id)} style={{
            flex: 1, padding: "7px 4px", borderRadius: 8, border: "none",
            background: view === tab.id ? "rgba(99,102,241,0.18)" : "transparent",
            borderBottom: view === tab.id ? "2px solid #6366f1" : "2px solid transparent",
            color: view === tab.id ? "#818cf8" : "#475569",
            fontSize: 10, fontWeight: view === tab.id ? 600 : 400,
            cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "14px 14px 16px",
        position: "relative", zIndex: 2,
      }}>

        {/* ═══ IDLE / DETECT VIEW ═══ */}
        {view === VIEWS.IDLE && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            {/* Code snippet showing detected bug */}
            <div style={{
              background: "#161b27", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 12,
            }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                <span style={{ marginLeft: 6, fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>cart.py</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>⚠ Line 1</span>
              </div>
              <div style={{ padding: "10px 14px" }}>
                <pre style={{ margin: 0, fontSize: 11.5, lineHeight: 1.8, fontFamily: "monospace", color: "#94a3b8" }}>
                  <span style={{ color: "#c084fc" }}>def </span>
                  <span style={{ color: "#60a5fa" }}>add_item</span>
                  <span style={{ color: "#f8fafc" }}>(item, </span>
                  <span style={{ color: "#f8fafc" }}>cart</span>
                  <span style={{ color: "#f8fafc" }}>=</span>
                  <span style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)", padding: "0 3px", borderRadius: 3 }}>[]</span>
                  <span style={{ color: "#f8fafc" }}>):{"\n"}    </span>
                  <span style={{ color: "#f8fafc" }}>cart.</span>
                  <span style={{ color: "#60a5fa" }}>append</span>
                  <span style={{ color: "#f8fafc" }}>(item){"\n"}    </span>
                  <span style={{ color: "#c084fc" }}>return </span>
                  <span style={{ color: "#f8fafc" }}>cart</span>
                </pre>
              </div>
            </div>

            {/* Detect button */}
            <button className="veda-btn" onClick={triggerAnalysis} style={{
              width: "100%", padding: "11px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 24px rgba(99,102,241,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit",
            }}>
              {detecting
                ? <><div style={{ width: 14, height: 14, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Analyzing code...</>
                : <><span>⚡</span> Analyze Current File</>
              }
            </button>

            {/* Recent detections */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Recent Detections</div>
              {[
                { concept: "Mutable Default Arg", file: "cart.py", time: "2m ago", severity: "warning" },
                { concept: "SQL Injection Risk", file: "db.py", time: "1h ago", severity: "error" },
                { concept: "Unclosed Resource", file: "io_utils.py", time: "3h ago", severity: "info" },
              ].map((item, i) => (
                <div key={i} className="veda-btn" onClick={() => setView(VIEWS.LESSON)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 11px", borderRadius: 9, marginBottom: 6,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: item.severity === "error" ? "#ef4444" : item.severity === "warning" ? "#f59e0b" : "#6366f1",
                    boxShadow: `0 0 8px ${item.severity === "error" ? "#ef4444" : item.severity === "warning" ? "#f59e0b" : "#6366f1"}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.concept}</div>
                    <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{item.file}</div>
                  </div>
                  <span style={{ fontSize: 10, color: "#334155", flexShrink: 0 }}>{item.time}</span>
                </div>
              ))}
            </div>

            {/* Streak pill */}
            <div style={{
              marginTop: 10, padding: "10px 12px", borderRadius: 10,
              background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>🔥</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24" }}>{streak}-day learning streak</div>
                <div style={{ fontSize: 10, color: "#78716c" }}>Keep it up — you're in the top 8%</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ LESSON VIEW ═══ */}
        {view === VIEWS.LESSON && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            {/* Header */}
            <div style={{
              padding: "11px 13px", borderRadius: 10, marginBottom: 12,
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span style={{ fontSize: 20, marginTop: 1 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>{LESSON_DATA.concept}</div>
                <div style={{ fontSize: 10, color: "#78716c", marginTop: 2 }}>
                  <span style={{ color: "#6366f1" }}>{LESSON_DATA.lang}</span> · {LESSON_DATA.file} · Line {LESSON_DATA.line}
                </div>
              </div>
              <button className="veda-btn" onClick={() => setAudioPlaying(!audioPlaying)} style={{
                marginLeft: "auto", width: 32, height: 32, borderRadius: 8,
                background: audioPlaying ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 14,
                cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {audioPlaying ? "⏸" : "🔊"}
              </button>
            </div>

            {/* Explanation typewriter */}
            <div style={{
              padding: "12px 13px", borderRadius: 10, marginBottom: 12,
              background: "#161b27", border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>What's happening</div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.75, color: "#94a3b8" }}>
                <TypeWriter text={LESSON_DATA.explanation} speed={12} />
              </p>
            </div>

            {/* Before / After code */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>Code comparison</div>
              <CodeBlock code={CODE_BUG} label="Before" type="bug" />
              <CodeBlock code={CODE_FIX} label="After" type="fix" />
            </div>

            {/* Execution diagram */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>Execution diagram</div>
              {LESSON_DATA.diagram.map((item, i) => <DiagramRow key={i} item={item} index={i} />)}
            </div>

            {/* CTA */}
            <button className="veda-btn" onClick={startQuiz} style={{
              width: "100%", padding: "11px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
              color: "#0d1117", fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", boxShadow: "0 4px 20px rgba(251,191,36,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span>🎯</span> Test Your Understanding
            </button>
          </div>
        )}

        {/* ═══ QUIZ VIEW ═══ */}
        {view === VIEWS.QUIZ && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            {!quizDone ? (
              <>
                {/* Progress bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Question {quizIdx + 1} of {QUIZ_QUESTIONS.length}</span>
                    <span style={{ fontSize: 10, color: "#6366f1" }}>Mutable Default Args</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 100, height: 4 }}>
                    <div style={{
                      height: "100%", borderRadius: 100, background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                      width: `${((quizIdx) / QUIZ_QUESTIONS.length) * 100}%`,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>

                {/* Question */}
                <div style={{
                  padding: "14px", borderRadius: 10, marginBottom: 12,
                  background: "#161b27", border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "#e2e8f0", fontWeight: 500 }}>
                    {QUIZ_QUESTIONS[quizIdx].q}
                  </p>
                </div>

                {/* Options */}
                <div style={{ marginBottom: 12 }}>
                  {QUIZ_QUESTIONS[quizIdx].options.map((opt, i) => {
                    const isCorrect = i === QUIZ_QUESTIONS[quizIdx].correct;
                    const isSelected = selected === i;
                    let bg = "rgba(255,255,255,0.03)";
                    let border = "1px solid rgba(255,255,255,0.08)";
                    let color = "#94a3b8";
                    if (answered && isCorrect) { bg = "rgba(16,185,129,0.12)"; border = "1px solid rgba(16,185,129,0.4)"; color = "#6ee7b7"; }
                    if (answered && isSelected && !isCorrect) { bg = "rgba(239,68,68,0.1)"; border = "1px solid rgba(239,68,68,0.35)"; color = "#fca5a5"; }
                    return (
                      <div key={i} className="veda-btn" onClick={() => handleAnswer(i)} style={{
                        padding: "10px 13px", borderRadius: 9, marginBottom: 7,
                        background: bg, border, color, fontSize: 12, lineHeight: 1.5,
                        cursor: answered ? "default" : "pointer",
                        display: "flex", alignItems: "center", gap: 10,
                        transition: "all 0.2s ease",
                      }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 6,
                          background: answered && isCorrect ? "rgba(16,185,129,0.25)" : answered && isSelected ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: answered && isCorrect ? "#10b981" : answered && isSelected ? "#ef4444" : "#475569",
                          flexShrink: 0,
                        }}>
                          {answered ? (isCorrect ? "✓" : isSelected ? "✗" : String.fromCharCode(65+i)) : String.fromCharCode(65+i)}
                        </span>
                        {opt}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation after answer */}
                {answered && (
                  <div style={{
                    padding: "10px 13px", borderRadius: 9,
                    background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                    fontSize: 11.5, color: "#a5b4fc", lineHeight: 1.65,
                    animation: "fadeIn 0.3s ease",
                  }}>
                    💡 {QUIZ_QUESTIONS[quizIdx].explanation}
                  </div>
                )}
              </>
            ) : (
              /* Quiz done */
              <div style={{ textAlign: "center", padding: "20px 10px", animation: "slideUp 0.4s ease" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>{score === QUIZ_QUESTIONS.length ? "🏆" : score > 0 ? "⭐" : "📚"}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{score}/{QUIZ_QUESTIONS.length} Correct</div>
                <div style={{ fontSize: 12, color: "#6ee7b7", marginBottom: 20 }}>
                  {score === QUIZ_QUESTIONS.length ? "+15 XP • Concept mastered!" : "+5 XP • Keep practicing!"}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button className="veda-btn" onClick={startQuiz} style={{
                    padding: "9px 18px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent", color: "#94a3b8", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                  }}>Retry</button>
                  <button className="veda-btn" onClick={() => setView(VIEWS.PROGRESS)} style={{
                    padding: "9px 18px", borderRadius: 9, border: "none",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white",
                    fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                  }}>View Progress →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ PROGRESS VIEW ═══ */}
        {view === VIEWS.PROGRESS && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { label: "Skill Score", value: "847", icon: "⚡", color: "#fbbf24" },
                { label: "Streak", value: "12d", icon: "🔥", color: "#f97316" },
                { label: "Mastered", value: "7", icon: "🧠", color: "#10b981" },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: "11px 10px", borderRadius: 10, textAlign: "center",
                  background: "#161b27", border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <div style={{ fontSize: 18 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Weekly activity */}
            <div style={{ marginBottom: 14, padding: "12px", borderRadius: 10, background: "#161b27", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Weekly Activity</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 48 }}>
                {STREAK_DATA.map((v, i) => {
                  const [h, setH] = useState(0);
                  useEffect(() => { setTimeout(() => setH(v), 200 + i * 80); }, []);
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{
                        width: "100%", borderRadius: 4,
                        background: i === 6 ? "linear-gradient(180deg,#6366f1,#8b5cf6)" : "rgba(99,102,241,0.25)",
                        height: `${(h / 10) * 40}px`, transition: "height 0.6s cubic-bezier(.4,0,.2,1)",
                        boxShadow: i === 6 ? "0 0 12px #6366f160" : "none",
                      }} />
                      <span style={{ fontSize: 9, color: "#334155" }}>{"MTWTFSS"[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Concept mastery list */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Concept Mastery</div>
              {CONCEPTS.map((c, i) => (
                <div key={i} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <div>
                      <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontSize: 10, color: "#475569", marginLeft: 6, fontFamily: "monospace" }}>{c.lang}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.mastery}%</span>
                  </div>
                  <ProgressBar value={c.mastery} color={c.color} />
                </div>
              ))}
            </div>

            {/* Next lesson suggestion */}
            <div style={{
              marginTop: 6, padding: "11px 13px", borderRadius: 10,
              background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>🎯</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#818cf8" }}>Next focus area</div>
                <div style={{ fontSize: 12, color: "#e2e8f0" }}>Race Conditions in Go</div>
              </div>
              <button className="veda-btn" onClick={() => setView(VIEWS.LESSON)} style={{
                padding: "6px 12px", borderRadius: 7, border: "none",
                background: "#6366f1", color: "white", fontSize: 11,
                fontFamily: "inherit", cursor: "pointer", fontWeight: 600,
              }}>Start</button>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, position: "relative", zIndex: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>S</div>
          <span style={{ fontSize: 11, color: "#475569" }}>suvam.paul</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["⚙️", "🔔"].map((icon, i) => (
            <button key={i} className="veda-btn" style={{
              width: 26, height: 26, borderRadius: 7,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              color: "#475569", fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{icon}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
