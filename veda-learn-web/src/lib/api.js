import axios from 'axios'
import useVedaStore from '../store/useVedaStore.js'

const BASE = import.meta.env.VITE_REST_URL

// Create axios instance with auth interceptor
const client = axios.create({ baseURL: BASE })

client.interceptors.request.use(config => {
  const jwt = useVedaStore.getState().jwt
  if (jwt) config.headers.Authorization = `Bearer ${jwt}`
  return config
})

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useVedaStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── API METHODS ──────────────────────────────────────────────────────
export const api = {
  // Auth
  async exchangeCode(code) {
    const res = await axios.get(`${BASE}/auth/github/callback?code=${code}&source=web`)
    return res.data
  },

  // Core analyze
  async analyze({ fileContent, language, fileName, cursorLine, diagnostics = [] }) {
    const res = await client.post('/api/analyze', {
      fileContent, language, fileName, cursorLine, diagnostics
    })
    if (res.data.teach && res.data.lineNumber) {
      useVedaStore.getState().setErrorMarkers([{
        lineNumber:  res.data.lineNumber,
        conceptId:   res.data.conceptId,
        confidence:  res.data.confidence || 0.9,
      }])
      useVedaStore.getState().setLastAnalysis(res.data)
    }
    return res.data
  },

  // Lesson generation
  async getLesson({ mistakeType, language, codeSnippet, conceptId }) {
    const res = await client.post('/api/lesson', {
      mistakeType, language, codeSnippet, conceptId
    })
    return res.data
  },

  // Deep dive lesson
  async getDeepLesson(payload) {
    const res = await client.post('/api/lesson/deep', payload)
    return res.data
  },

  // Quiz generation
  async getQuiz({ conceptId, language }) {
    const res = await client.post('/api/quiz', { conceptId, language })
    return res.data
  },

  // Progress read
  async getProgress(userId) {
    const res = await client.get(`/api/progress/${userId}`)
    return res.data
  },

  // Progress write
  async updateProgress({ userId, conceptId, score, xpEarned }) {
    const res = await client.post('/api/progress/update', {
      userId, conceptId, score, xpEarned
    })
    return res.data
  },

  // Doubt/chat
  async askDoubt({ question, codeContext, language }) {
    const res = await client.post('/api/doubt', {
      question, codeContext, language
    })
    return res.data
  },
}

export default api
