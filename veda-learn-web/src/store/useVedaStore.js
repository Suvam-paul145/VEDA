import { create } from 'zustand'

const useVedaStore = create((set, get) => ({
  // ─── AUTH ──────────────────────────────────────────────────────
  jwt:     localStorage.getItem('veda_jwt') || null,
  user:    JSON.parse(localStorage.getItem('veda_user') || 'null'),
  setAuth: (jwt, user) => {
    localStorage.setItem('veda_jwt', jwt)
    localStorage.setItem('veda_user', JSON.stringify(user))
    set({ jwt, user })
  },
  logout: () => {
    localStorage.removeItem('veda_jwt')
    localStorage.removeItem('veda_user')
    set({ jwt: null, user: null })
  },

  // ─── EDITOR ────────────────────────────────────────────────────
  code:        '# Write or paste your code here\n',
  language:    'python',
  fileName:    'untitled.py',
  cursorLine:  1,
  setCode:     (code)     => set({ code }),
  setLanguage: (language) => set({ language }),
  setFileName: (fileName) => set({ fileName }),
  setCursorLine:(line)    => set({ cursorLine: line }),

  // ─── ANALYSIS ──────────────────────────────────────────────────
  analyzing:    false,
  errorMarkers: [],
  lastAnalysis: null,
  setAnalyzing:    (v)       => set({ analyzing: v }),
  setErrorMarkers: (markers) => set({ errorMarkers: markers }),
  setLastAnalysis: (data)    => set({ lastAnalysis: data }),

  // ─── PANELS ────────────────────────────────────────────────────
  activePanel:    'lesson',
  panelDot:       {},
  setActivePanel: (p) => set({ activePanel: p }),
  setPanelDot:    (panel, val) => set(s => ({
    panelDot: { ...s.panelDot, [panel]: val }
  })),

  // ─── LESSON ────────────────────────────────────────────────────
  currentLesson: null,
  setLesson: (lesson) => set({
    currentLesson: lesson,
    activePanel: 'lesson',
    panelDot: {}
  }),

  // ─── QUIZ ──────────────────────────────────────────────────────
  currentQuiz:  null,
  quizScore:    0,
  setQuiz:  (quiz) => set({ currentQuiz: quiz, activePanel: 'quiz' }),
  setQuizScore: (score) => set({ quizScore: score }),

  // ─── PROGRESS ──────────────────────────────────────────────────
  skillScore:    0,
  streak:        0,
  weeklyXP:      [0,0,0,0,0,0,0],
  conceptMastery: {},
  setProgress:   (data) => set({
    skillScore:    data.totalXP || 0,
    streak:        data.streak  || 0,
    weeklyXP:      data.weeklyXP || [0,0,0,0,0,0,0],
    conceptMastery: data.conceptMastery || {}
  }),

  // ─── WEBSOCKET ─────────────────────────────────────────────────
  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),

  // ─── NOTIFICATIONS ─────────────────────────────────────────────
  notifications: [],
  addNotification: (n) => set(s => ({
    notifications: [{ id: Date.now(), ...n }, ...s.notifications].slice(0, 20)
  })),
  clearNotifications: () => set({ notifications: [] }),
}))

export default useVedaStore
