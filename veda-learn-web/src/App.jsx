import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import LoginPage from './components/auth/LoginPage.jsx'
import AuthCallback from './components/auth/AuthCallback.jsx'
import IDEPage from './pages/IDEPage.jsx'
import useVedaStore from './store/useVedaStore.js'

export default function App() {
  const jwt = useVedaStore(s => s.jwt)

  return (
    <Routes>
      <Route path="/"               element={<Landing />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/auth/callback"  element={<AuthCallback />} />
      <Route path="/ide"            element={jwt ? <IDEPage /> : <Navigate to="/login" />} />
    </Routes>
  )
}
