import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FolderGit, PlusCircle, UserPlus, History } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export const Projects: React.FC = () => {
  const { projects, activeProject, setActiveProject, addProject, addToast } = useApp();
  const [newProjName, setNewProjName] = useState('');
  const [newProjUrls, setNewProjUrls] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) {
      addToast('Please enter a project title.', 'error');
      return;
    }
    const urls = newProjUrls
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
    
    addProject(newProjName.trim(), urls);
    setNewProjName('');
    setNewProjUrls('');
    setShowAddForm(false);
  };

  const projectHistoryData = [
    { name: 'Run 1', score: 88 },
    { name: 'Run 2', score: 89 },
    { name: 'Run 3', score: 92 },
    { name: 'Run 4', score: 91 },
    { name: 'Run 5', score: 94 },
    { name: 'Run 6', score: 95 }
  ];

  return (
    <div className="workspace-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>Workspace Container</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Collaborative groupings of targeted domain audits.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <PlusCircle size={14} />
          <span>Create Workspace</span>
        </button>
      </div>

      {/* Creation Modal Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateProject}
          className="card fade-in"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: 'var(--color-surface)',
            marginBottom: '24px',
            maxWidth: '500px'
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Create New Workspace</h3>
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input
              type="text"
              className="form-input"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="e.g. Acme Marketing Landing"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Associated Domains (Comma separated)</label>
            <input
              type="text"
              className="form-input"
              value={newProjUrls}
              onChange={(e) => setNewProjUrls(e.target.value)}
              placeholder="e.g. acme.com, blog.acme.com"
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary btn-sm">Create Workspace</button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Sidebar List and Active project Workspace side-by-side */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Project directory list */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => setActiveProject(proj)}
              className="card card-interactive"
              style={{
                padding: '12px 16px',
                borderColor: activeProject?.id === proj.id ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: activeProject?.id === proj.id ? 'var(--color-surface-secondary)' : 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <FolderGit size={16} style={{ color: activeProject?.id === proj.id ? 'var(--color-accent)' : 'var(--color-muted)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</p>
                <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>{proj.websites.length} Domains</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Project details */}
        {activeProject ? (
          <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Headline and Team details */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{activeProject.name}</h3>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: 'var(--color-muted)' }}>
                    <span>Average score: <strong style={{ color: 'var(--color-success)' }}>{activeProject.avgScore}/100</strong></span>
                    <span>•</span>
                    <span>Total Runs: {activeProject.reportsCount}</span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ gap: '4px' }}>
                  <UserPlus size={12} />
                  <span>Invite Dev</span>
                </button>
              </div>

              {/* Domains in project list */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Domains</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {activeProject.websites.map((web, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      {web}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Aggregated Line Performance Trend Chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Aggregated Performance Over Time</h3>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Line logs of successive automated crawler builds.</p>
              </div>
              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projectHistoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-muted)" fontSize={11} domain={[70, 100]} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="var(--color-success)" strokeWidth={2} dot={{ fill: 'var(--color-success)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity feed list logs */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Workspace Activity Log</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeProject.activity.map((act, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <History size={14} style={{ color: 'var(--color-accent)', marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{act.event}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '2px', fontSize: '10px', color: 'var(--color-muted)' }}>
                        <span>Triggered by {act.user}</span>
                        <span>•</span>
                        <span>{act.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ flex: 1, textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
            Select a project folder workspace to inspect telemetry details.
          </div>
        )}
      </div>
    </div>
  );
};
