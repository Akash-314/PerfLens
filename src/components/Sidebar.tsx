import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Globe,
  FileBarChart,
  History,
  GitCompare,
  FolderGit,
  Sparkles,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Plus
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    projects,
    activeProject,
    setActiveProject,
    addToast
  } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analyze', label: 'Analyze Website', icon: Globe },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'history', label: 'History', icon: History },
    { id: 'comparisons', label: 'Comparisons', icon: GitCompare },
    { id: 'projects', label: 'Projects', icon: FolderGit },
    { id: 'recommendations', label: 'Recommendations', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'support', label: 'Support', icon: HelpCircle }
  ];

  const handleProjectSwitch = (pId: string) => {
    const proj = projects.find((p) => p.id === pId) || null;
    setActiveProject(proj);
    addToast(`Switched active workspace to "${proj?.name}"`, 'info');
  };

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Globe size={18} className="text-accent" style={{ color: 'var(--color-accent)' }} />
          <span style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('landing')}>PerfLens</span>
        </div>
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label="Toggle Sidebar"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentTab(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </div>
          );
        })}

        {/* Projects Section */}
        {!sidebarCollapsed && (
          <div style={{ marginTop: '24px', padding: '0 16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--color-muted)',
                  letterSpacing: '0.05em'
                }}
              >
                Workspaces
              </span>
              <button
                onClick={() => setCurrentTab('projects')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <Plus size={12} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => handleProjectSwitch(proj.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color:
                      activeProject?.id === proj.id
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-secondary)',
                    backgroundColor:
                      activeProject?.id === proj.id ? 'var(--color-surface-secondary)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor:
                          activeProject?.id === proj.id
                            ? 'var(--color-accent)'
                            : 'var(--color-border)'
                      }}
                    />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                      {proj.name}
                    </span>
                  </div>
                  {activeProject?.id === proj.id && <ChevronRight size={12} style={{ color: 'var(--color-muted)' }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-secondary)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-primary)'
            }}
          >
            D
          </div>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                Developer Workspace
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>Pro Plan</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
