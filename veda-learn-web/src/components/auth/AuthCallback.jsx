import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useVedaStore from '../../store/useVedaStore.js'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const setAuth   = useVedaStore(s => s.setAuth)

  useEffect(() => {
    const token = params.get('token')
    if (!token) { 
      navigate('/login')
      return 
    }

    // Decode user from JWT payload
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setAuth(token, {
        id:     payload.sub,
        login:  payload.login,
        name:   payload.name,
        avatar: payload.avatar,
      })
      navigate('/ide')
    } catch (err) {
      console.error('Auth error:', err)
      navigate('/login')
    }
  }, [params, navigate, setAuth])

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
