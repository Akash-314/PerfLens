import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { CommandMenu } from './components/CommandMenu';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { WebsiteAnalysis } from './pages/WebsiteAnalysis';
import { ResultsPage } from './pages/ResultsPage';
import { Recommendations } from './pages/Recommendations';
import { ComparisonPage } from './pages/ComparisonPage';
import { ReportsList } from './pages/ReportsList';
import { Projects } from './pages/Projects';
import { Settings } from './pages/Settings';
import { Support } from './pages/Support';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentTab, toasts, removeToast } = useApp();

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'landing':
        return <LandingPage />;
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
        return <LandingPage />;
    }
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
      {/* Conditionally show sidebar in app dashboard vs clean landing page */}
      {currentTab !== 'landing' && <Sidebar />}

      <div className="main-content">
        {currentTab !== 'landing' && <TopNav />}
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
