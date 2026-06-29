import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, Globe, Lock, Mail, Loader2 } from 'lucide-react';

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
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        padding: '24px',
        color: 'var(--color-text-primary)'
      }}
    >
      <div
        className="card card-hover"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '32px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Brand header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)'
            }}
          >
            <Globe size={22} className="text-accent" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '8px' }}>
            Welcome back to PerfLens
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            Enter your credentials to access your workspaces.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              fontSize: '12px.5',
              lineHeight: '1.4'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email input field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="email" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-muted)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Mail size={14} />
              </span>
              <input
                id="email"
                type="email"
                ref={emailRef}
                placeholder="developer@perflens.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '38px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  fontSize: '13.5px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  transition: 'border-color 0.2s'
                }}
                className="form-input"
              />
            </div>
          </div>

          {/* Password input field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="password" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-muted)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Lock size={14} />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '38px',
                  paddingLeft: '36px',
                  paddingRight: '36px',
                  fontSize: '13.5px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  transition: 'border-color 0.2s'
                }}
                className="form-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-muted)',
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

          {/* Remember me & Forgot password */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                style={{
                  width: '14px',
                  height: '14px',
                  accentColor: 'var(--color-accent)'
                }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>Remember email</span>
            </label>
            <span
              onClick={() => setError('Password resets must be orchestrated via internal IT administration.')}
              style={{
                color: 'var(--color-accent)',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Forgot password?
            </span>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13.5px',
              fontWeight: 600,
              marginTop: '8px'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Register link */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
          Don't have an account?{' '}
          <span
            onClick={() => setCurrentTab('register')}
            style={{
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Create an account
          </span>
        </div>
      </div>
    </div>
  );
};
export default Login;
