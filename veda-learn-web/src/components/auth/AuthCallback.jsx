import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useVedaStore from '../../store/useVedaStore.js'
import { api } from '../../lib/api.js'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useVedaStore(s => s.setAuth)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = params.get('token')
    const code = params.get('code')

    if (token) {
      // Direct token flow — backend already exchanged the code
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setAuth(token, {
          id: payload.userId,
          login: payload.username,
          name: payload.username,
          avatar: `https://github.com/${payload.username}.png`,
        })
        navigate('/ide')
      } catch (err) {
        console.error('Auth token decode error:', err)
        setError('Failed to decode authentication token')
      }
    } else if (code) {
      // Frontend-initiated exchange — call backend API
      api.exchangeCode(code)
        .then(data => {
          const jwt = data.token || data.jwt
          if (!jwt) {
            setError('No token received from server')
            return
          }
          const payload = JSON.parse(atob(jwt.split('.')[1]))
          setAuth(jwt, {
            id: payload.userId,
            login: payload.username,
            name: payload.username,
            avatar: `https://github.com/${payload.username}.png`,
          })
          navigate('/ide')
        })
        .catch(err => {
          console.error('Auth code exchange error:', err)
          setError(err.response?.data?.error || err.message || 'Authentication failed')
        })
    } else {
      navigate('/login')
    }
  }, [params, navigate, setAuth])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#07090f',
        color: '#ef4444',
        fontSize: '16px',
        fontWeight: '600',
        fontFamily: 'Syne, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ marginBottom: 12 }}>{error}</div>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#07090f',
      color: '#6366f1',
      fontSize: '18px',
      fontWeight: '600'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 16px',
          border: '3px solid #6366f1',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        Signing you in...
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
