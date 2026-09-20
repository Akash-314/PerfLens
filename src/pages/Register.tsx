import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react';

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
            onClick={() => setCurrentTab('landing')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
              cursor: 'pointer'
            }}
            title="Go to landing page"
          >
            <Globe size={22} className="text-accent" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '8px' }}>
            Create your PerfLens Account
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            Start analyzing script execution timings and bundle sizes.
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
              fontSize: '12.5px',
              lineHeight: '1.4'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Full Name input field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="name" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Full name
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
                <UserIcon size={14} />
              </span>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                ref={nameRef}
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '36px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  fontSize: '13px',
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

          {/* Email input field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="email" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
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
                name="email"
                type="email"
                autoComplete="email"
                placeholder="developer@perflens.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '36px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  fontSize: '13px',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="password" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
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
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '36px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  fontSize: '13px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  transition: 'border-color 0.2s'
                }}
                className="form-input"
              />
            </div>

            {/* Password strength meter */}
            {password && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-muted)' }}>
                  <span>Strength: {pwStrength.label}</span>
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
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

          {/* Confirm Password input field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="confirmPassword" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Confirm password
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
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '36px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  fontSize: '13px',
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

          {/* Terms & Conditions */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '11.5px', marginTop: '6px' }}>
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              disabled={loading}
              style={{
                width: '14px',
                height: '14px',
                accentColor: 'var(--color-accent)',
                marginTop: '1px'
              }}
            />
            <span style={{ color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
              I agree to the{' '}
              <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Terms of Service</span> and{' '}
              <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Privacy Policy</span>.
            </span>
          </label>

          {/* Submit button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              marginTop: '6px'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Creating account...</span>
              </>
            ) : (
              <span>Register</span>
            )}
          </button>
        </form>

        {/* Login link */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Already have an account?{' '}
          <span
            onClick={() => setCurrentTab('login')}
            style={{
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
};
export default Register;
