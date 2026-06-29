import React, { Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { CommandMenu } from './components/CommandMenu';
import { ProtectedRoute } from './components/ProtectedRoute';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

// Lazy load page views to optimize client bundle size via code splitting
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = React.lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const WebsiteAnalysis = React.lazy(() => import('./pages/WebsiteAnalysis').then(m => ({ default: m.WebsiteAnalysis })));
const ResultsPage = React.lazy(() => import('./pages/ResultsPage').then(m => ({ default: m.ResultsPage })));
const Recommendations = React.lazy(() => import('./pages/Recommendations').then(m => ({ default: m.Recommendations })));
const ComparisonPage = React.lazy(() => import('./pages/ComparisonPage').then(m => ({ default: m.ComparisonPage })));
const ReportsList = React.lazy(() => import('./pages/ReportsList').then(m => ({ default: m.ReportsList })));
const Projects = React.lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Support = React.lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));

const AppContent: React.FC = () => {
  const { currentTab, toasts, removeToast } = useApp();

  const isAuthPage = ['landing', 'login', 'register'].includes(currentTab);

  const renderActiveTab = () => {
    return (
      <Suspense
        fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="spin" style={{ width: '32px', height: '32px', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        }
      >
        {(() => {
          switch (currentTab) {
            case 'landing':
              return <LandingPage />;
            case 'login':
              return <Login />;
            case 'register':
              return <Register />;
            default:
              return (
                <ProtectedRoute>
                  {(() => {
                    switch (currentTab) {
                      case 'dashboard':
                        return <Dashboard />;
                      case 'analyze':
                        return <WebsiteAnalysis />;
                      case 'results':
                        return <ResultsPage />;
                      case 'recommendations':
                        return <Recommendations />;
                      case 'comparisons':
                        return <ComparisonPage />;
                      case 'reports':
                      case 'history':
                        return <ReportsList />;
                      case 'projects':
                        return <Projects />;
                      case 'settings':
                        return <Settings />;
                      case 'support':
                        return <Support />;
                      default:
                        return <Dashboard />;
                    }
                  })()}
                </ProtectedRoute>
              );
          }
        })()}
      </Suspense>
    );
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={15} style={{ color: 'var(--color-success)' }} />;
      case 'warning':
        return <AlertTriangle size={15} style={{ color: 'var(--color-warning)' }} />;
      case 'error':
        return <AlertCircle size={15} style={{ color: 'var(--color-danger)' }} />;
      default:
        return <Info size={15} style={{ color: 'var(--color-accent)' }} />;
    }
  };

  return (
    <div className="app-container">
      {/* Conditionally show sidebar in app dashboard vs clean landing or auth pages */}
      {!isAuthPage && <Sidebar />}

      <div className="main-content">
        {!isAuthPage && <TopNav />}
        {renderActiveTab()}
      </div>

      {/* Global Command Menu Dialog */}
      <CommandMenu />

      {/* Global Toast notifications overlay */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {getToastIcon(toast.type)}
            <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
