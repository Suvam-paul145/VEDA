import { useNavigate } from 'react-router-dom'
import useVedaStore from '../../store/useVedaStore.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useVedaStore(s => s.setAuth)

  const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID
  const APP_URL = import.meta.env.VITE_APP_URL
  const CALLBACK = `${APP_URL}/auth/callback`
  const OAUTH_URL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(CALLBACK)}&scope=user:email,repo`

  const handleGuestLogin = () => {
    const guestUser = { login: 'guest', name: 'Guest User', isGuest: true }
    setAuth('guest_token', guestUser)
    navigate('/ide')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#07090f'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: '#0d1117',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
            <path d="M3 4L10 16L17 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="16" r="2.2" fill="#fbbf24" />
          </svg>
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: '800',
          marginBottom: '10px',
          color: '#f1f5f9',
          fontFamily: 'Syne, sans-serif'
        }}>
          Welcome to Veda
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#94a3b8',
          marginBottom: '32px',
          lineHeight: 1.6
        }}>
          AI-powered coding tutor in your browser
        </p>

        <button
          onClick={() => window.location.href = OAUTH_URL}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: 'rgba(255,255,255,0.05)',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '12px',
            fontFamily: 'Syne, sans-serif'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.09)'
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#f1f5f9">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <button
          onClick={handleGuestLogin}
          style={{
            width: '100%',
            padding: '13px 24px',
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '22px',
            fontFamily: 'Syne, sans-serif'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'
            e.currentTarget.style.color = '#e2e8f0'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            e.currentTarget.style.color = '#94a3b8'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Continue as Guest
        </button>

        <p style={{
          fontSize: '11px',
          color: '#475569',
          fontFamily: 'JetBrains Mono, monospace',
          lineHeight: 1.7
        }}>
          GitHub login requests <code style={{ color: '#64748b' }}>user:email</code> and <code style={{ color: '#64748b' }}>repo</code> scopes.
          <br />Your code never leaves your browser.
        </p>
      </div>
    </div>
  )
}
