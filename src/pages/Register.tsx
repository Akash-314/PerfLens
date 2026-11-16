import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Loader2 } from 'lucide-react';

export const Register: React.FC = () => {
  const { register, setCurrentTab } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const getPasswordStrength = (): { label: string; percent: number; color: string } => {
    if (!password) return { label: 'Empty', percent: 0, color: 'transparent' };
    if (password.length < 6) return { label: 'Weak (min 6 chars)', percent: 25, color: 'var(--color-danger)' };
    
    // Check complexity
    let strength = 1;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength === 1) return { label: 'Medium', percent: 50, color: 'var(--color-warning)' };
    if (strength === 2) return { label: 'Strong', percent: 75, color: 'var(--color-success)' };
    return { label: 'Excellent', percent: 100, color: 'var(--color-accent)' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation checks
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptTerms) {
      setError('You must accept the terms of service and privacy policies to register.');
      return;
    }

    setLoading(true);
    const success = await register(name.trim(), email, password);
    if (!success) {
      setError('Registration failed. The email may already be registered or the server is down.');
    }
    setLoading(false);
  };

  const pwStrength = getPasswordStrength();

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
      {/* Brand header */}
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
          Create your PerfLens account
        </h1>
      </div>

      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

        {/* Main form panel */}
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
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="name" className="form-label" style={{ fontSize: '14px', fontWeight: 400 }}>
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                ref={nameRef}
                placeholder="Akash Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label" style={{ fontSize: '14px', fontWeight: 400 }}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
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
              <label htmlFor="password" className="form-label" style={{ fontSize: '14px', fontWeight: 400 }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="form-input"
                style={{ width: '100%' }}
              />

              {/* Password strength meter */}
              {password && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-fg-muted)' }}>
                    <span>Strength: {pwStrength.label}</span>
                  </div>
                  <div style={{ width: '100%', height: '3px', backgroundColor: 'var(--color-border-default)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pwStrength.percent}%`,
                        height: '100%',
                        backgroundColor: pwStrength.color,
                        transition: 'width 0.3s, background-color 0.3s'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label" style={{ fontSize: '14px', fontWeight: 400 }}>
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Terms & Conditions */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', marginTop: '2px' }}>
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={loading}
                style={{
                  width: '14px',
                  height: '14px',
                  accentColor: 'var(--color-accent-fg)',
                  cursor: 'pointer',
                  marginTop: '2px'
                }}
              />
              <label htmlFor="acceptTerms" style={{ color: 'var(--color-fg-muted)', lineHeight: '1.4', cursor: 'pointer' }}>
                I agree to the <span style={{ color: 'var(--color-accent-fg)' }}>Terms of Service</span> and <span style={{ color: 'var(--color-accent-fg)' }}>Privacy Policy</span>.
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '6px',
                height: '32px',
                fontWeight: 600,
                fontSize: '13.5px'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </button>
          </form>
        </div>

        {/* Sign in Box */}
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
          Already have an account?{' '}
          <span
            onClick={() => setCurrentTab('login')}
            style={{
              color: 'var(--color-accent-fg)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Sign in
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
export default Register;
