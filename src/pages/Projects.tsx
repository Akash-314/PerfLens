import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export const Projects: React.FC = () => {
  const { projects, activeProject, setActiveProject, addProject, addToast, reports, setCurrentReport, setCurrentTab } = useApp();
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

  const matchingReports = activeProject
    ? reports
        .filter((r) =>
          activeProject.websites?.some((w) =>
            r.url.toLowerCase().includes(w.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase())
          )
        )
        .slice()
        .reverse()
    : [];

  const projectHistoryData = matchingReports.map((r, idx) => ({
    name: `Run ${idx + 1}`,
    score: r.scores?.overall ?? 0
  }));

  return (
    <div className="workspace-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-fg-default)', letterSpacing: '-0.02em' }}>
            Projects
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>
            Group and track performance audits across your monitored websites and domains.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={14} />
          <span>New project</span>
        </button>
      </div>

      {/* GitHub Creation Box */}
      {showAddForm && (
        <form
          onSubmit={handleCreateProject}
          className="gh-box fade-in"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            marginBottom: '20px',
            maxWidth: '540px'
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fg-default)' }}>Create a new project</h3>
          <div className="form-group">
            <label className="form-label">Project name</label>
            <input
              type="text"
              className="form-input"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="e.g. Acme Marketing Landing"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Associated domains (comma separated)</label>
            <input
              type="text"
              className="form-input"
              value={newProjUrls}
              onChange={(e) => setNewProjUrls(e.target.value)}
              placeholder="e.g. acme.com, blog.acme.com"
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button type="submit" className="btn btn-primary btn-sm">Create project</button>
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

      {/* Projects Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        {/* Project List */}
        <div className="gh-box" style={{ padding: 0 }}>
          <div className="gh-box-header">
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
              Projects ({projects.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {projects.map((proj) => {
              const isSelected = activeProject?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  className="gh-box-row"
                  onClick={() => setActiveProject(proj)}
                  style={{
                    cursor: 'pointer',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? 'var(--color-surface-secondary)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--color-accent-fg)' : '3px solid transparent'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: isSelected ? 'var(--color-fg-default)' : 'var(--color-accent-fg)' }}>
                      {proj.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-fg-muted)', marginTop: '2px' }}>
                      {proj.websites?.length || 0} associated domain(s)
                    </div>
                  </div>
                </div>
              );
            })}

            {projects.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-fg-muted)', fontSize: '13px' }}>
                No projects created yet.
              </div>
            )}
          </div>
        </div>

        {/* Selected Project View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          {activeProject ? (
            <>
              {/* Project Details Box */}
              <div className="gh-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-fg-default)' }}>
                      {activeProject.name}
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--color-fg-muted)', marginTop: '2px' }}>
                      Active monitoring configuration & audit history.
                    </p>
                  </div>
                  <span className="badge badge-green">
                    Active Project
                  </span>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-fg-muted)', display: 'block', marginBottom: '6px' }}>
                    Monitored Domains
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {activeProject.websites?.map((w, i) => (
                      <span key={i} className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                        {w}
                      </span>
                    ))}
                    {(!activeProject.websites || activeProject.websites.length === 0) && (
                      <span style={{ fontSize: '12.5px', color: 'var(--color-fg-subtle)' }}>
                        No domains assigned.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* History Trend Chart */}
              {projectHistoryData.length > 1 && (
                <div className="gh-box">
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-fg-default)', marginBottom: '12px' }}>
                    Project health score history
                  </h3>
                  <div style={{ width: '100%', height: '180px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projectHistoryData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--color-fg-subtle)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-fg-subtle)" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border-default)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: 'var(--color-fg-default)'
                          }}
                        />
                        <Line type="monotone" dataKey="score" stroke="var(--color-accent-fg)" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Matching Scans Table */}
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Website</th>
                      <th>Score</th>
                      <th>Scanned Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingReports.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, color: 'var(--color-fg-default)' }}>{r.url.replace(/^https?:\/\//, '')}</td>
                        <td>
                          <span className={`badge ${r.scores?.overall >= 90 ? 'badge-green' : r.scores?.overall >= 70 ? 'badge-yellow' : 'badge-red'}`}>
                            {r.scores?.overall}/100
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--color-fg-muted)' }}>{r.timestamp}</td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setCurrentReport(r);
                              setCurrentTab('results');
                            }}
                          >
                            <span>Inspect</span>
                            <ArrowUpRight size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {matchingReports.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-fg-muted)' }}>
                          No audit scans found for domains in this project.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="gh-box" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-fg-muted)' }}>
              Select a project to inspect domain monitoring and scan runs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
