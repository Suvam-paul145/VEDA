import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ─── Fonts injected via style tag ────────────────────────────────── */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');`;

/* ─── Colour palette ───────────────────────────────────────────────── */
const C = {
  bg: "#07090f",
  surface: "#0d1117",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  amber: "#fbbf24",
  green: "#10b981",
  muted: "#334155",
  sub: "#64748b",
  text: "#e2e8f0",
  dim: "#94a3b8",
};

/* ════════════════════════════════════════════════════════════════════
   THREE.JS CANVAS  — Neural particle web + drifting code glyphs
   ════════════════════════════════════════════════════════════════════ */
function ThreeCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    /* Scene */
    const W = el.clientWidth, H = el.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.set(0, 0, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    /* ── PARTICLES ─────────────────────────────────────── */
    const N_PART = 420;
    const positions = new Float32Array(N_PART * 3);
    const colors = new Float32Array(N_PART * 3);
    const sizes = new Float32Array(N_PART);

    const colA = new THREE.Color(C.indigo);
    const colB = new THREE.Color(C.violet);
    const colC = new THREE.Color(C.amber);

    for (let i = 0; i < N_PART; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;

      const t = Math.random();
      const c = t < 0.5 ? colA.clone().lerp(colB, t * 2)
        : t < 0.85 ? colB.clone().lerp(new THREE.Color("#4f46e5"), (t - 0.5) * 2)
          : colC;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = Math.random() * 2.2 + 0.4;
    }

    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    partGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    partGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const partMat = new THREE.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main(){
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = size * (260.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if(d > 0.5) discard;
          float a = smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(vColor, a * 0.85);
        }`,
    });

    const particles = new THREE.Points(partGeo, partMat);
    scene.add(particles);

    /* ── CONNECTION LINES ──────────────────────────────── */
    const lineMat = new THREE.LineBasicMaterial({
      color: C.indigo, transparent: true, opacity: 0.09, depthWrite: false,
    });
    const THRESHOLD = 9;
    const lineGeo = new THREE.BufferGeometry();
    const lineVerts = [];

    for (let i = 0; i < N_PART; i++) {
      for (let j = i + 1; j < N_PART; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < THRESHOLD) {
          lineVerts.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
          lineVerts.push(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
        }
      }
    }
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    /* ── LARGE GLOWING ORBS ────────────────────────────── */
    const orbs = [];
    const orbDefs = [
      { x: -14, y: 6, z: -8, r: 4.5, c: "#6366f1", op: 0.13 },
      { x: 16, y: -5, z: -12, r: 5.5, c: "#8b5cf6", op: 0.10 },
      { x: 2, y: -9, z: -5, r: 3.2, c: "#fbbf24", op: 0.09 },
      { x: -6, y: 10, z: -15, r: 6.0, c: "#4f46e5", op: 0.08 },
    ];
    orbDefs.forEach(d => {
      const g = new THREE.SphereGeometry(d.r, 32, 32);
      const m = new THREE.MeshBasicMaterial({ color: d.c, transparent: true, opacity: d.op, depthWrite: false });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(d.x, d.y, d.z);
      scene.add(mesh);
      orbs.push({ mesh, ox: d.x, oy: d.y, speed: Math.random() * 0.4 + 0.2, phase: Math.random() * Math.PI * 2 });
    });

    /* ── FLOATING TORUS RINGS ──────────────────────────── */
    const rings = [];
    [[0, 3, -10, "#6366f1", 0.15], [-10, -2, -14, "#8b5cf6", 0.10], [8, 6, -18, "#fbbf24", 0.09]]
      .forEach(([x, y, z, c, op]) => {
        const g = new THREE.TorusGeometry(3.5, 0.04, 8, 60);
        const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, wireframe: false });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set(x, y, z);
        mesh.rotation.x = Math.PI / 3;
        scene.add(mesh);
        rings.push(mesh);
      });

    /* ── MOUSE PARALLAX ────────────────────────────────── */
    let mx = 0, my = 0;
    const onMove = e => { mx = (e.clientX / window.innerWidth - 0.5) * 2; my = -(e.clientY / window.innerHeight - 0.5) * 2; };
    window.addEventListener("mousemove", onMove);

    /* ── RESIZE ────────────────────────────────────────── */
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ── ANIMATE ───────────────────────────────────────── */
    let frame;
    let startTime = performance.now() * 0.001;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = (performance.now() * 0.001) - startTime;

      particles.rotation.y = t * 0.018;
      particles.rotation.x = t * 0.006;

      orbs.forEach(o => {
        o.mesh.position.y = o.oy + Math.sin(t * o.speed + o.phase) * 1.2;
        o.mesh.position.x = o.ox + Math.cos(t * o.speed * 0.6 + o.phase) * 0.7;
      });
      rings.forEach((r, i) => {
        r.rotation.z += 0.003 * (i % 2 === 0 ? 1 : -1);
        r.rotation.x += 0.001;
      });

      camera.position.x += (mx * 2.5 - camera.position.x) * 0.04;
      camera.position.y += (my * 1.5 - camera.position.y) * 0.04;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />;
}

/* ════════════════════════════════════════════════════════════════════
   ANIMATED CODE PREVIEW  — floating IDE mockup in hero
   ════════════════════════════════════════════════════════════════════ */
const BUGGY = [
  { t: "def ", c: "#c084fc" },
  { t: "add_item", c: "#60a5fa" },
  { t: "(item, cart=", c: "#e2e8f0" },
  { t: "[]", c: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  { t: "):", c: "#e2e8f0" },
];

function HeroEditor() {
  const [lessonVis, setLessonVis] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setScanning(true), 1800);
    const t2 = setTimeout(() => { setScanning(false); setLessonVis(true); }, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 580 }}>

      {/* ── Editor window ── */}
      <div style={{
        background: "#0d1117", borderRadius: 14, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.12)",
      }}>
        {/* Title bar */}
        <div style={{ background: "#161b27", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {["#ef4444", "#fbbf24", "#10b981"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
          <span style={{ marginLeft: 8, fontFamily: "JetBrains Mono", fontSize: 11, color: "#475569" }}>cart.py — Veda Learn IDE</span>
          {scanning && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.indigo }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${C.indigo}`, borderTopColor: "transparent", animation: "spin .7s linear infinite" }} />
              Analyzing...
            </div>
          )}
          {!scanning && lessonVis && (
            <div style={{ marginLeft: "auto", fontSize: 10, color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}`, display: "inline-block" }} />
              Mistake detected
            </div>
          )}
        </div>

        {/* Code body */}
        <div style={{ padding: "16px 20px", fontFamily: "JetBrains Mono", fontSize: 12.5, lineHeight: 1.9 }}>
          {/* Line numbers + code */}
          {[
            { ln: 1, tokens: BUGGY, squiggle: !scanning && lessonVis },
            { ln: 2, tokens: [{ t: "    cart.", c: "#e2e8f0" }, { t: "append", c: "#60a5fa" }, { t: "(item)", c: "#e2e8f0" }] },
            { ln: 3, tokens: [{ t: "    ", c: "#e2e8f0" }, { t: "return ", c: "#c084fc" }, { t: "cart", c: "#e2e8f0" }] },
            { ln: 4, tokens: [] },
            { ln: 5, tokens: [{ t: "# Same list reused across all calls ⚠", c: "#475569" }] },
          ].map(row => (
            <div key={row.ln} style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <span style={{ color: "#334155", marginRight: 20, minWidth: 16, textAlign: "right", userSelect: "none" }}>{row.ln}</span>
              <span style={{ position: "relative" }}>
                {row.tokens.map((tok, i) => (
                  <span key={i} style={{ color: tok.c, background: tok.bg || "transparent", borderRadius: 3, padding: tok.bg ? "0 2px" : 0 }}>
                    {tok.t}
                  </span>
                ))}
                {row.squiggle && (
                  <span style={{
                    position: "absolute", left: 0, right: 0, bottom: -1,
                    borderBottom: "2px wavy #ef4444", opacity: 0.8,
                  }} />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Floating lesson card ── */}
      <div style={{
        position: "absolute", bottom: -20, right: -30, width: 240,
        background: "#161b27", borderRadius: 12, padding: 14,
        border: "1px solid rgba(251,191,36,0.25)", zIndex: 10,
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(251,191,36,0.07)",
        opacity: lessonVis ? 1 : 0,
        transform: lessonVis ? "translateY(0) scale(1)" : "translateY(16px) scale(0.95)",
        transition: "all 0.5s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.amber }}>Mutable Default Arg</div>
            <div style={{ fontSize: 9, color: C.sub }}>Python · High confidence</div>
          </div>
          <div style={{ marginLeft: "auto", width: 26, height: 26, borderRadius: 7, background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🔊</div>
        </div>
        <p style={{ fontSize: 10.5, color: "#94a3b8", lineHeight: 1.65, margin: 0 }}>
          Using <code style={{ color: C.amber, background: "rgba(251,191,36,0.1)", padding: "0 3px", borderRadius: 3 }}>[]</code> as a default creates a shared list across all calls — a silent state mutation bug.
        </p>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <div style={{ flex: 1, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 7, padding: "5px 0", textAlign: "center", fontSize: 10, color: C.green, fontWeight: 600 }}>Got it ✓</div>
          <div style={{ flex: 1, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 7, padding: "5px 0", textAlign: "center", fontSize: 10, color: C.indigo }}>Deep Dive 🔍</div>
        </div>
      </div>

      {/* ── Floating quiz pill ── */}
      <div style={{
        position: "absolute", top: -18, left: -22, padding: "7px 14px",
        background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))",
        borderRadius: 100, border: "1px solid rgba(99,102,241,0.3)", fontSize: 11, color: C.text,
        fontFamily: "JetBrains Mono", whiteSpace: "nowrap",
        boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        opacity: lessonVis ? 1 : 0,
        transform: lessonVis ? "translateX(0)" : "translateX(-12px)",
        transition: "all 0.5s 0.25s ease",
      }}>
        🎯 Quiz ready · <span style={{ color: C.amber }}>+15 XP</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   FEATURE CARDS
   ════════════════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    icon: "⚡",
    title: "Live Error Detection",
    desc: "Veda silently watches your code. After 30 seconds of inactivity, Claude Haiku scans for anti-patterns, bugs, and security risks with 0.85+ confidence threshold.",
    tag: "Claude Haiku · < 3s",
    glow: C.indigo,
    border: "rgba(99,102,241,0.2)",
  },
  {
    icon: "📖",
    title: "Voice-First Lessons",
    desc: "3-panel lessons slide in via WebSocket: natural explanation, before/after code fix, and a Mermaid diagram — all read aloud by Amazon Polly Generative TTS.",
    tag: "Claude Sonnet + Polly",
    glow: C.violet,
    border: "rgba(139,92,246,0.2)",
  },
  {
    icon: "🎯",
    title: "Adaptive Quizzes",
    desc: "30 seconds after you acknowledge a lesson, a 3-question MCQ appears. Answer correctly to unlock XP and move the concept from 'seen' to 'mastered' in your profile.",
    tag: "Claude Haiku · Instant",
    glow: C.amber,
    border: "rgba(251,191,36,0.2)",
  },
  {
    icon: "💬",
    title: "AI Doubt Assistant",
    desc: "Ask anything about your current code. Veda has full context of what's in the editor — no copy-pasting needed. Get concise answers with runnable examples.",
    tag: "Context-aware · Haiku",
    glow: C.green,
    border: "rgba(16,185,129,0.2)",
  },
  {
    icon: "📁",
    title: "GitHub Integration",
    desc: "Connect your GitHub repos and browse files directly. Open any source file into the Monaco editor and let Veda analyze your real production code.",
    tag: "Octokit · Read-only",
    glow: "#ff7eb3",
    border: "rgba(255,126,179,0.2)",
  },
  {
    icon: "📈",
    title: "Skill Progression",
    desc: "Track XP, learning streaks, and concept mastery across all languages. DynamoDB stores your full history — see exactly which patterns you've conquered.",
    tag: "DynamoDB · Real-time",
    glow: "#34d399",
    border: "rgba(52,211,153,0.2)",
  },
];

function FeatureCard({ f, i }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "#161b27" : "rgba(13,17,23,0.6)",
        border: `1px solid ${hov ? f.border.replace("0.2", "0.45") : f.border}`,
        borderRadius: 16, padding: "28px 26px",
        transition: "all 0.3s ease",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hov ? `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${f.glow}18` : "0 4px 20px rgba(0,0,0,0.3)",
        cursor: "default",
        animation: `fadeSlideUp 0.6s ease ${i * 80}ms both`,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${f.glow}15`, border: `1px solid ${f.glow}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, marginBottom: 16,
        boxShadow: hov ? `0 0 20px ${f.glow}30` : "none",
        transition: "box-shadow 0.3s ease",
      }}>
        {f.icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 10, fontFamily: "Syne" }}>{f.title}</div>
      <p style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.7, margin: "0 0 16px" }}>{f.desc}</p>
      <span style={{
        fontSize: 10, fontFamily: "JetBrains Mono", color: f.glow,
        background: `${f.glow}12`, border: `1px solid ${f.glow}25`,
        padding: "3px 10px", borderRadius: 100, display: "inline-block", letterSpacing: "0.05em",
      }}>
        {f.tag}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HOW IT WORKS STEPS
   ════════════════════════════════════════════════════════════════════ */
const STEPS = [
  { n: "01", title: "Write Your Code", desc: "Paste code or connect GitHub. Veda's Monaco-powered editor supports Python, JavaScript, TypeScript, Go, Rust, and more.", icon: "⌨️" },
  { n: "02", title: "Veda Detects & Teaches", desc: "After 30s of silence, Claude Haiku silently classifies your code. A 3-panel lesson arrives via WebSocket with voice narration.", icon: "🧠" },
  { n: "03", title: "Quiz & Level Up", desc: "Answer 3 questions to prove the concept stuck. Earn XP, extend your streak, and watch your skill score climb.", icon: "🚀" },
];

/* ════════════════════════════════════════════════════════════════════
   STATS COUNTER
   ════════════════════════════════════════════════════════════════════ */
const STATS = [
  { val: "27M", label: "Target Developers", sub: "worldwide" },
  { val: "0.85", label: "Confidence Threshold", sub: "zero noise" },
  { val: "<3s", label: "Detection Speed", sub: "Claude Haiku" },
  { val: "$0", label: "Free to Start", sub: "open source" },
];

/* ════════════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════════════ */
export default function VedaLanding() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navOpacity = Math.min(scrollY / 80, 1);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "Syne, sans-serif", color: C.text, overflowX: "hidden" }}>
      <style>{`
        ${FONTS}
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #6366f140; border-radius: 4px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(99,102,241,0.4)} 70%{box-shadow:0 0 0 18px rgba(99,102,241,0)} 100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes breathe { 0%,100%{opacity:0.6} 50%{opacity:1} }

        .cta-btn {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border: none; padding: 14px 32px; border-radius: 12px;
          font-family: Syne; font-size: 15px; font-weight: 700;
          cursor: pointer; letter-spacing: 0.01em;
          box-shadow: 0 4px 24px rgba(99,102,241,0.45);
          transition: all 0.25s ease;
        }
        .cta-btn::before {
          content:''; position:absolute; inset:0;
          background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          transform: translateX(-100%); transition: transform 0.5s ease;
        }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(99,102,241,0.6); }
        .cta-btn:hover::before { transform: translateX(100%); }

        .ghost-btn {
          background: transparent; color: #94a3b8;
          border: 1px solid rgba(255,255,255,0.1); padding: 14px 28px;
          border-radius: 12px; font-family: Syne; font-size: 15px;
          cursor: pointer; transition: all 0.25s ease;
        }
        .ghost-btn:hover { border-color: rgba(99,102,241,0.5); color: #e2e8f0; }

        .nav-link { color: #64748b; font-size: 14px; text-decoration: none; transition: color 0.2s; cursor: pointer; font-weight: 500; }
        .nav-link:hover { color: #e2e8f0; }

        .step-card { transition: all 0.3s ease; }
        .step-card:hover { transform: translateX(6px); }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          NAV
      ══════════════════════════════════════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 40px", height: 60, display: "flex", alignItems: "center",
        background: `rgba(7,9,15,${navOpacity * 0.92})`,
        backdropFilter: navOpacity > 0.1 ? "blur(20px)" : "none",
        borderBottom: `1px solid rgba(255,255,255,${navOpacity * 0.06})`,
        transition: "background 0.3s, border-color 0.3s",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(99,102,241,0.4)", animation: "breathe 3s ease-in-out infinite",
          }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M3 4L10 16L17 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="16" r="2" fill="#fbbf24" />
            </svg>
          </div>
          <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 17, color: "#f1f5f9", letterSpacing: "-0.01em" }}>Veda</span>
          <span style={{ fontSize: 10, color: C.indigo, fontFamily: "JetBrains Mono", fontWeight: 500, letterSpacing: "0.15em", marginTop: 1 }}>LEARN</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Nav links */}
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {["Features", "How it works", "Pricing", "GitHub"].map(l => (
            <span key={l} className="nav-link">{l}</span>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/login" className="nav-link">Sign in</a>
          <a href="/login" className="cta-btn" style={{ padding: "8px 20px", fontSize: 13, borderRadius: 9, textDecoration: "none" }}>
            Start Learning →
          </a>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section id="hero" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <ThreeCanvas />

        {/* Radial gradient overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(7,9,15,0.55) 70%, rgba(7,9,15,0.95) 100%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 40px", paddingTop: 80 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>

            {/* Left — text */}
            <div>
              {/* Eyebrow badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28,
                padding: "6px 14px 6px 8px", borderRadius: 100,
                background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
                animation: "fadeSlideUp 0.5s ease both",
              }}>
                <span style={{
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 100,
                  padding: "2px 10px", fontSize: 10, color: "white", fontWeight: 700,
                  fontFamily: "JetBrains Mono", letterSpacing: "0.08em",
                }}>NEW</span>
                <span style={{ fontSize: 12, color: C.dim }}>Web IDE — No extension needed</span>
              </div>

              <h1 style={{
                fontFamily: "Syne", fontWeight: 800, fontSize: "clamp(38px,4.5vw,62px)",
                lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 24,
                animation: "fadeSlideUp 0.6s ease 100ms both",
              }}>
                AI that teaches you,
                <br />
                <span style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #fbbf24 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>not just fixes you.</span>
              </h1>

              <p style={{
                fontSize: 17.5, color: "#abb8c4", fontWeight: 500, lineHeight: 1.75, maxWidth: 480, marginBottom: 36,
                animation: "fadeSlideUp 0.6s ease 200ms both",
              }}>
                Write code in the browser. Veda detects your mistakes in real time, explains them with voice, quizzes your understanding, and tracks your growth — powered by Claude and AWS.
              </p>

              <div style={{ display: "flex", gap: 14, alignItems: "center", animation: "fadeSlideUp 0.6s ease 300ms both" }}>
                <a href="/login" className="cta-btn" style={{ textDecoration: "none" }}>
                  Start for Free →
                </a>
                <a href="/ide" className="ghost-btn" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                  }}>▶</span>
                  Try Demo
                </a>
              </div>

              {/* Social proof */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12, marginTop: 36,
                animation: "fadeSlideUp 0.6s ease 400ms both",
              }}>
                <div style={{ display: "flex" }}>
                  {["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"].map((c, i) => (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${c},${c}88)`,
                      border: "2px solid #07090f", marginLeft: i ? -8 : 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "white",
                    }}>
                      {["S", "R", "A", "P", "K"][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Built for the hackathon</div>
                  <div style={{ fontSize: 11, color: C.sub }}>Pure AWS · OpenRouter · Zero Railway</div>
                </div>
              </div>
            </div>

            {/* Right — floating editor */}
            <div style={{ display: "flex", justifyContent: "center", animation: "fadeSlideUp 0.7s ease 200ms both" }}>
              <div style={{ animation: "float 5s ease-in-out infinite" }}>
                <HeroEditor />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 120,
          background: "linear-gradient(to bottom, transparent, rgba(7,9,15,0.95))",
          pointerEvents: "none", zIndex: 3,
        }} />
      </section>

      {/* ══════════════════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════════════════ */}
      <section style={{
        borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "36px 40px",
        background: "linear-gradient(90deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04), rgba(99,102,241,0.04))",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "Syne", fontSize: "clamp(28px,3vw,40px)", fontWeight: 800,
                background: "linear-gradient(135deg,#6366f1,#a78bfa)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                marginBottom: 4,
              }}>{s.val}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.label}</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2, fontFamily: "JetBrains Mono" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "100px 40px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-block", fontSize: 11, fontFamily: "JetBrains Mono",
            color: C.indigo, letterSpacing: "0.15em", textTransform: "uppercase",
            marginBottom: 16, padding: "4px 14px", borderRadius: 100,
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
          }}>Everything You Need</div>
          <h2 style={{
            fontFamily: "Syne", fontWeight: 800, fontSize: "clamp(30px,3.5vw,48px)",
            letterSpacing: "-0.02em", lineHeight: 1.15, color: C.text,
          }}>
            One tool. Every lesson.
            <br />
            <span style={{ color: C.sub, fontWeight: 600 }}>Zero friction.</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {FEATURES.map((f, i) => <FeatureCard key={i} f={f} i={i} />)}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section style={{
        padding: "100px 40px",
        background: "linear-gradient(180deg, transparent, rgba(99,102,241,0.04) 40%, transparent)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent)",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{
              display: "inline-block", fontSize: 11, fontFamily: "JetBrains Mono",
              color: C.amber, letterSpacing: "0.15em", textTransform: "uppercase",
              marginBottom: 16, padding: "4px 14px", borderRadius: 100,
              background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
            }}>How It Works</div>
            <h2 style={{
              fontFamily: "Syne", fontWeight: 800, fontSize: "clamp(28px,3vw,44px)",
              letterSpacing: "-0.02em", color: C.text,
            }}>Three steps to mastery</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {STEPS.map((s, i) => (
              <div key={i} className="step-card" style={{
                display: "grid", gridTemplateColumns: "80px 1fr", gap: 24, alignItems: "flex-start",
                padding: "32px 0",
                borderBottom: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                {/* Number + connector */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 16,
                    background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))",
                    border: "1px solid rgba(99,102,241,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "Syne", fontWeight: 800, fontSize: 22, color: C.indigo,
                    boxShadow: "0 0 30px rgba(99,102,241,0.12)",
                  }}>
                    {s.icon}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 1, height: 60, marginTop: 8,
                      background: "linear-gradient(to bottom, rgba(99,102,241,0.3), transparent)",
                    }} />
                  )}
                </div>

                <div style={{ paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{
                      fontFamily: "JetBrains Mono", fontSize: 10, color: C.indigo,
                      background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: 100,
                    }}>{s.n}</span>
                    <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 22, color: C.text }}>{s.title}</h3>
                  </div>
                  <p style={{ fontSize: 15, color: C.dim, lineHeight: 1.7, maxWidth: 560 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TECH STACK STRIP
      ══════════════════════════════════════════════════════ */}
      <section style={{
        padding: "60px 40px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: 11, color: C.sub, fontFamily: "JetBrains Mono", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 32 }}>
            Powered by
          </p>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
            {[
              ["Claude Haiku", C.indigo],
              ["Claude Sonnet", C.violet],
              ["Amazon Polly", "#f97316"],
              ["API Gateway WS", C.green],
              ["DynamoDB", "#06b6d4"],
              ["OpenSearch", "#ec4899"],
              ["Bedrock Titan", "#f59e0b"],
              ["Lambda", "#facc15"],
              ["S3", "#34d399"],
              ["Vercel", "#e2e8f0"],
              ["Monaco Editor", C.indigo],
              ["React 18 + Vite", "#61dafb"],
            ].map(([label, color]) => (
              <span key={label} style={{
                fontFamily: "JetBrains Mono", fontSize: 11,
                color, background: `${color}0f`, border: `1px solid ${color}22`,
                padding: "5px 14px", borderRadius: 100, letterSpacing: "0.03em",
              }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FULL-WIDTH CTA
      ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "120px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Radial glow behind CTA */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24,
            padding: "6px 16px", borderRadius: 100,
            background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
            fontSize: 12, color: C.amber, fontFamily: "JetBrains Mono",
          }}>
            🔥 Built for developers who want to grow
          </div>

          <h2 style={{
            fontFamily: "Syne", fontWeight: 800,
            fontSize: "clamp(32px,4vw,56px)", letterSpacing: "-0.03em",
            lineHeight: 1.1, color: C.text, marginBottom: 20, maxWidth: 700, margin: "0 auto 20px",
          }}>
            Stop letting AI make you<br />
            <span style={{
              background: "linear-gradient(135deg, #6366f1, #a78bfa, #fbbf24)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>weaker.</span>
          </h2>

          <p style={{ fontSize: 17, color: C.dim, maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Every other AI tool is your employee. Veda Learn is your professor.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center" }}>
            <button className="cta-btn" style={{ fontSize: 16, padding: "16px 40px" }}>
              Open the IDE →
            </button>
            <a href="https://github.com" target="_blank" className="ghost-btn" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer style={{
        padding: "40px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 1280, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <path d="M3 4L10 16L17 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="16" r="2" fill="#fbbf24" />
            </svg>
          </div>
          <span style={{ fontFamily: "Syne", fontWeight: 700, color: C.dim, fontSize: 14 }}>Veda Learn</span>
          <span style={{ color: C.muted, fontSize: 12 }}>·</span>
          <span style={{ fontSize: 12, color: C.sub, fontFamily: "JetBrains Mono" }}>Built at the hackathon · AWS Edition</span>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "GitHub", "Contact"].map(l => (
            <span key={l} style={{ fontSize: 12, color: C.sub, cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = C.text}
              onMouseLeave={e => e.target.style.color = C.sub}>
              {l}
            </span>
          ))}
        </div>
      </footer>

    </div>
  );
}
