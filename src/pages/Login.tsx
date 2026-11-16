import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, setCurrentTab } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Autofocus email input on mount
    emailRef.current?.focus();
    
    // Check if email was remembered
    const savedEmail = localStorage.getItem('perflens_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation checks
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setLoading(true);
    const success = await login(email, password);
    if (success) {
      if (rememberMe) {
        localStorage.setItem('perflens_remembered_email', email);
      } else {
        localStorage.removeItem('perflens_remembered_email');
      }
    } else {
      setError('Authentication failed. Check your email and password.');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--color-canvas-default)',
        padding: '32px 16px',
        color: 'var(--color-fg-default)'
      }}
    >
      {/* GitHub Logo / Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <div
          onClick={() => setCurrentTab('landing')}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Go to landing page"
        >
          <img
            src="/favicon.svg"
            alt="PerfLens"
            style={{ width: '48px', height: '48px', objectFit: 'contain' }}
          />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 300, color: 'var(--color-fg-default)', letterSpacing: '-0.02em', margin: 0 }}>
          Sign in to PerfLens
        </h1>
      </div>

      <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-danger-subtle)',
              border: '1px solid rgba(248, 81, 73, 0.4)',
              color: 'var(--color-danger-fg)',
              fontSize: '13px',
              lineHeight: '1.4'
            }}
          >
            {error}
          </div>
        )}

        {/* Login Main Form Panel */}
        <div
          className="gh-box"
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label" style={{ fontSize: '14px', fontWeight: 400 }}>
                Username or email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                ref={emailRef}
                placeholder="developer@perflens.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password" className="form-label" style={{ fontSize: '14px', fontWeight: 400 }}>
                  Password
                </label>
                <span
                  onClick={() => setError('Password resets must be orchestrated via internal IT administration.')}
                  style={{
                    color: 'var(--color-accent-fg)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Forgot password?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="form-input"
                  style={{ width: '100%', paddingRight: '32px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-fg-muted)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                style={{
                  width: '14px',
                  height: '14px',
                  accentColor: 'var(--color-accent-fg)',
                  cursor: 'pointer'
                }}
              />
              <label htmlFor="rememberMe" style={{ color: 'var(--color-fg-muted)', cursor: 'pointer', userSelect: 'none' }}>
                Remember email
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '4px',
                height: '32px',
                fontWeight: 600,
                fontSize: '13.5px'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>
        </div>

        {/* Create Account Box */}
        <div
          className="gh-box"
          style={{
            padding: '16px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--color-fg-default)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          New to PerfLens?{' '}
          <span
            onClick={() => setCurrentTab('register')}
            style={{
              color: 'var(--color-accent-fg)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Create an account
          </span>
          .
        </div>

        {/* Footer links */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            fontSize: '12px',
            color: 'var(--color-fg-subtle)',
            marginTop: '16px'
          }}
        >
          <span style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('landing')}>Terms</span>
          <span style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('landing')}>Privacy</span>
          <span style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('support')}>Docs</span>
          <span style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('support')}>Contact PerfLens</span>
        </div>
      </div>
    </div>
  );
};
export default Login;
