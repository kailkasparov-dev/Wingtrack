import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { apiRegisterStaff } from '@/lib/api'
import type { StaffRole } from '@/types'

const ROLES: { value: StaffRole; label: string }[] = [
  { value: 'cashier',             label: 'Cashier' },
  { value: 'admin',               label: 'Admin / Manager' },
  { value: 'inventory_personnel', label: 'Inventory Personnel' },
]

export default function LoginPage() {
  const { signIn } = useAuth()

  // Mode: 'signin' or 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  // Sign In state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Sign Up state (Add Staff Member)
  const [signUpForm, setSignUpForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'cashier' as StaffRole,
  })
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [signUpLoading, setSignUpLoading] = useState(false)
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setSignUpError(null)
    setSignUpSuccess(null)
    setSignUpLoading(true)

    try {
      if (signUpForm.password.length < 8) {
        throw new Error('Password must be at least 8 characters long.')
      }

      await apiRegisterStaff(signUpForm)
      setSignUpSuccess('Account created! Signing you in...')

      // Automatically sign in the newly registered staff
      await signIn(signUpForm.email, signUpForm.password)
    } catch (err: unknown) {
      setSignUpError(err instanceof Error ? err.message : 'Failed to create account. Please try again.')
      setSignUpLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        padding: '16px 12px',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div className="fade-in" style={{ width: '100%', maxWidth: 440, margin: 'auto' }}>
        {/* Compact Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto 8px',
              boxShadow: '0 6px 18px rgba(234,88,12,0.25)',
              border: '2px solid rgba(249,115,22,0.4)',
              background: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/logo.png"
              alt="Wingtrack Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <h1
            style={{
              fontFamily: 'Fraunces',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--foreground)',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            <span style={{ color: 'var(--accent)' }}>WING</span>TRACK
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 3, fontWeight: 500 }}>
            Wingtrack — Staff Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.04)',
            padding: 3,
            borderRadius: 10,
            marginBottom: 12,
            border: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null) }}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: 7,
              border: 'none',
              background: mode === 'signin' ? '#ffffff' : 'transparent',
              color: mode === 'signin' ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: mode === 'signin' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setSignUpError(null) }}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: 7,
              border: 'none',
              background: mode === 'signup' ? '#ffffff' : 'transparent',
              color: mode === 'signup' ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: mode === 'signup' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* SIGN IN FORM */}
        {mode === 'signin' ? (
          <form
            onSubmit={handleSignIn}
            className="card"
            style={{
              padding: '24px 26px',
              display: 'flex',
              flexDirection: 'column',
              gap: 15,
              boxShadow: '0 8px 24px rgba(74, 46, 18, 0.06)',
              borderRadius: 12,
            }}
          >
            <div>
              <label
                htmlFor="login-email"
                style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 5 }}
              >
                Email Address
              </label>
              <input
                id="login-email"
                className="input"
                type="email"
                autoComplete="email"
                required
                placeholder="you@wingtrack.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: 13.5 }}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 5 }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 38px 10px 12px', fontSize: 13.5 }}
                />
                <button
                  type="button"
                  id="toggle-login-password"
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--muted-foreground)',
                    borderRadius: 4,
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  padding: '9px 12px',
                  fontSize: 12.5,
                  color: 'var(--danger)',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 1 }}>Sign In Error</div>
                <div>{error}</div>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 2, padding: '12px', fontSize: 14, fontWeight: 600, borderRadius: 8 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 15, height: 15 }} />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Need an account? </span>
              <button
                type="button"
                onClick={() => { setMode('signup'); setSignUpError(null) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Sign Up as Staff
              </button>
            </div>
          </form>
        ) : (
          /* SIGN UP / ADD STAFF MEMBER FORM — Exact replica of user specification */
          <div
            className="card"
            style={{
              padding: '22px 24px',
              boxShadow: '0 8px 24px rgba(74, 46, 18, 0.06)',
              borderRadius: 12,
            }}
          >
            <h2
              style={{
                fontFamily: 'Fraunces',
                fontSize: 19,
                fontWeight: 700,
                color: 'var(--foreground)',
                marginBottom: 14,
              }}
            >
              Add Staff Member
            </h2>

            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Full Name */}
              <div>
                <label
                  htmlFor="signup-name"
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}
                >
                  Full Name
                </label>
                <input
                  id="signup-name"
                  autoFocus
                  className="input"
                  type="text"
                  required
                  placeholder="Maria Santos"
                  value={signUpForm.full_name}
                  onChange={e => setSignUpForm(f => ({ ...f, full_name: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13.5 }}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="signup-email"
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}
                >
                  Email
                </label>
                <input
                  id="signup-email"
                  className="input"
                  type="email"
                  required
                  placeholder="maria@wingtrack.ph"
                  value={signUpForm.email}
                  onChange={e => setSignUpForm(f => ({ ...f, email: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13.5 }}
                />
              </div>

              {/* Temporary Password */}
              <div>
                <label
                  htmlFor="signup-password"
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}
                >
                  Temporary Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="signup-password"
                    className="input"
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={signUpForm.password}
                    onChange={e => setSignUpForm(f => ({ ...f, password: e.target.value }))}
                    style={{ width: '100%', padding: '9px 36px 9px 12px', fontSize: 13.5 }}
                  />
                  <button
                    type="button"
                    id="toggle-signup-password"
                    onClick={() => setShowSignUpPassword(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted-foreground)',
                      borderRadius: 4,
                    }}
                    title={showSignUpPassword ? 'Hide password' : 'Show password'}
                    aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignUpPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label
                  htmlFor="signup-role"
                  style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}
                >
                  Role
                </label>
                <select
                  id="signup-role"
                  className="input"
                  value={signUpForm.role}
                  onChange={e => setSignUpForm(f => ({ ...f, role: e.target.value as StaffRole }))}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 13.5 }}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {signUpError && (
                <div
                  style={{
                    background: 'var(--danger-bg)',
                    border: '1px solid #fca5a5',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 12,
                    color: 'var(--danger)',
                    fontWeight: 500,
                  }}
                >
                  {signUpError}
                </div>
              )}

              {signUpSuccess && (
                <div
                  style={{
                    background: 'rgba(21,128,61,0.1)',
                    border: '1px solid #86efac',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 12,
                    color: '#15803d',
                    fontWeight: 500,
                  }}
                >
                  {signUpSuccess}
                </div>
              )}

              {/* Action Buttons: Cancel and Create Account */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => { setMode('signin'); setSignUpError(null) }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: 13.5,
                    fontWeight: 500,
                    border: '1px solid var(--border)',
                    borderRadius: 7,
                  }}
                >
                  Cancel
                </button>
                <button
                  id="btn-create-staff"
                  type="submit"
                  className="btn-primary"
                  disabled={signUpLoading}
                  style={{
                    flex: 1.5,
                    padding: '10px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    borderRadius: 7,
                    background: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    cursor: signUpLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {signUpLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span className="spinner" style={{ width: 13, height: 13 }} />
                      Creating...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}


