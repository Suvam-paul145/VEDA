import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

const useVedaStore = create(subscribeWithSelector((set, get) => ({
  // ─── AUTH ──────────────────────────────────────────────────────
  jwt: localStorage.getItem('veda_jwt') || null,
  user: JSON.parse(localStorage.getItem('veda_user') || 'null'),
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

  // ─── EDITOR (legacy single-file) ──────────────────────────────
  code: '# Write or paste your code here\n',
  language: 'python',
  fileName: 'untitled.py',
  cursorLine: 1,
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setFileName: (fileName) => set({ fileName }),
  setCursorLine: (line) => set({ cursorLine: line }),

  // ─── EDITOR (multi-file for Monaco) ────────────────────────────
  activeFile: 'cart.py',
  openFiles: {},
  updateFileContent: (fileName, content) =>
    set(s => {
      // If we're tracking a github repo, also save standard edit to gitChanges
      if (s.activeRepo) {
        return {
          openFiles: { ...s.openFiles, [fileName]: { ...s.openFiles[fileName], content } },
          gitChanges: { ...s.gitChanges, [fileName]: content }
        };
      }
      return { openFiles: { ...s.openFiles, [fileName]: { ...s.openFiles[fileName], content } } };
    }),
  setActiveFile: (name) => set({ activeFile: name }),

  // ─── GITHUB INTEGRATION ────────────────────────────────────────
  githubToken: null,
  githubUser: null,
  repos: [],
  activeRepo: null, // { owner, name, default_branch }
  fileTree: [],     // github tree items
  gitChanges: {},   // { path: newContent }
  setGithubAuth: (token, user) => set({ githubToken: token, githubUser: user }),
  setRepos: (repos) => set({ repos }),
  setActiveRepo: (repo, tree) => set({ activeRepo: repo, fileTree: tree, gitChanges: {}, activeFile: null, openFiles: {} }),
  clearGitChanges: () => set({ gitChanges: {} }),

  // ─── ANALYSIS ──────────────────────────────────────────────────
  analyzing: false,
  analysisResult: null,
  errorMarkers: [],
  lastAnalysis: null,
  setAnalyzing: (v) => set({ analyzing: v }),
  setAnalysisResult: (r) => set({ analysisResult: r }),
  setErrorMarkers: (markers) => set({ errorMarkers: markers }),
  setLastAnalysis: (data) => set({ lastAnalysis: data }),

  // ─── PANELS ────────────────────────────────────────────────────
  activePanel: 'lesson',
  panelDot: {},
  setActivePanel: (p) => set({ activePanel: p }),
  setPanelDot: (panel, val) => set(s => ({
    panelDot: { ...s.panelDot, [panel]: val }
  })),

  // ─── LESSON ────────────────────────────────────────────────────
  currentLesson: null,
  lessonVisible: false,
  setLesson: (lesson) => set({
    currentLesson: lesson,
    lessonVisible: true,
    activePanel: 'lesson',
    panelDot: {}
  }),
  clearLesson: () => set({ currentLesson: null, lessonVisible: false }),

  // ─── QUIZ ──────────────────────────────────────────────────────
  currentQuiz: null,
  quizActive: false,
  quizScore: 0,
  setQuiz: (quiz) => set({ currentQuiz: quiz, quizActive: true, activePanel: 'quiz' }),
  setQuizScore: (score) => set({ quizScore: score }),

  // ─── PROGRESS ──────────────────────────────────────────────────
  xp: 0,
  skillScore: 0,
  streak: 0,
  masteredConcepts: [],
  weeklyXP: [0, 0, 0, 0, 0, 0, 0],
  conceptMastery: {},
  addXP: (n) => set(s => ({ xp: s.xp + n })),
  setStreak: (n) => set({ streak: n }),
  masterConcept: (c) => set(s => ({ masteredConcepts: [...new Set([...s.masteredConcepts, c])] })),
  setProgress: (data) => set({
    skillScore: data.totalXP || 0,
    streak: data.streak || 0,
    weeklyXP: data.weeklyXP || [0, 0, 0, 0, 0, 0, 0],
    conceptMastery: data.conceptMastery || {}
  }),

  // ─── WEBSOCKET ─────────────────────────────────────────────────
  wsConnected: false,
  wsStatus: 'disconnected', // connecting | connected | disconnected | error
  setWsConnected: (v) => set({ wsConnected: v }),
  setWsStatus: (v) => set({ wsStatus: v }),

  // ─── UI ────────────────────────────────────────────────────────
  rightPanel: 'lesson',   // lesson | quiz | doubt | progress
  sidebarTab: 'explorer', // explorer | search | git | github | veda
  bottomVisible: true,
  bottomTab: 'terminal',
  setRightPanel: (v) => set({ rightPanel: v }),
  setSidebarTab: (v) => set({ sidebarTab: v }),
  toggleBottom: () => set(s => ({ bottomVisible: !s.bottomVisible })),
  setBottomTab: (v) => set({ bottomTab: v }),

  // ─── NOTIFICATIONS ─────────────────────────────────────────────
  notifications: [],
  addNotification: (n) => set(s => ({
    notifications: [{ id: Date.now(), ...n }, ...s.notifications].slice(0, 20)
  })),
  clearNotifications: () => set({ notifications: [] }),
})))

export default useVedaStore
