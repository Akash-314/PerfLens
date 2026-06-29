import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, authLoading, setCurrentTab } = useApp();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setCurrentTab('login');
    }
  }, [isAuthenticated, authLoading, setCurrentTab]);

  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '16px',
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text-primary)'
        }}
      >
        <div
          className="spin"
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          Verifying active session...
        </span>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};
export default ProtectedRoute;
