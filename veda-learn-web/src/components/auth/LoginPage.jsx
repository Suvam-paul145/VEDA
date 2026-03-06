export default function LoginPage() {
  const CLIENT_ID  = import.meta.env.VITE_GITHUB_CLIENT_ID
  const APP_URL    = import.meta.env.VITE_APP_URL
  const CALLBACK   = `${APP_URL}/auth/callback`
  const OAUTH_URL  = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${CALLBACK}&scope=user:email,repo`

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
        maxWidth: '400px'
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
          fontSize: '32px'
        }}>
          🧠
        </div>
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: '800',
          marginBottom: '12px',
          color: '#f1f5f9'
        }}>
          Veda Learn
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: '#94a3b8',
          marginBottom: '32px'
        }}>
          AI-powered coding tutor in your browser
        </p>
        
        <button
          onClick={() => window.location.href = OAUTH_URL}
          style={{
            width: '100%',
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(99,102,241,0.45)',
            transition: 'all 0.25s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 8px 40px rgba(99,102,241,0.6)'
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 24px rgba(99,102,241,0.45)'
          }}
        >
          Sign in with GitHub →
        </button>
        
        <p style={{
          fontSize: '12px',
          color: '#64748b',
          marginTop: '24px'
        }}>
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}
