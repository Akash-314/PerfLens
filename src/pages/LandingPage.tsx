import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, ArrowRight, Zap, Shield, Sparkles, CheckCircle, ChevronDown, Cpu } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { startAnalysis, setCurrentTab } = useApp();
  const [url, setUrl] = useState('');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      startAnalysis(url.trim());
    }
  };

  const featureCards = [
    {
      icon: Zap,
      title: 'Performance Analysis',
      desc: 'Real-time telemetry measuring Largest Contentful Paint, Cumulative Layout Shift, and blocking scripts.'
    },
    {
      icon: Sparkles,
      title: 'AI Code Suggestions',
      desc: 'Deep heuristics scan that shows exactly which file, component, or package dependencies to tree-shake.'
    },
    {
      icon: Shield,
      title: 'Security & SEO Audits',
      desc: 'Verify Open Graph metadata, color contrast indices, header compliance, and robots configurations.'
    }
  ];

  const howItWorks = [
    { step: '01', title: 'Enter Target Domain', desc: 'Paste your URL. Our crawler analyzes the DNS layer, TLS configurations, and asset streams.' },
    { step: '02', title: 'Telemetry Inspection', desc: 'We compute bundle dependencies, parse DOM tree structures, and map network request waterfall timelines.' },
    { step: '03', title: 'Actionable Optimization Plan', desc: 'Get a clean developer dashboard highlighting high-impact issues, inline CSS suggestions, and compression strategies.' }
  ];

  const faqs = [
    { q: 'How does PerfLens measure Core Web Vitals?', a: 'PerfLens uses standard browser automation interfaces to simulate real user page-loads, collecting detailed timing metrics like LCP, FID, CLS, and TTFB with millisecond accuracy.' },
    { q: 'Can I integrate PerfLens into my GitHub CI/CD workflows?', a: 'Yes! PerfLens provides a REST API and pre-configured GitHub Actions to trigger performance checks on every pull request, alerting teams on layout regressions.' },
    { q: 'Does PerfLens require installing any client-side JavaScript SDK?', a: 'No, PerfLens is fully client-side and server-crawler active. It inspects public facing builds, stylesheets, and image bundles without inserting any code footprint.' }
  ];

  return (
    <div className="fade-in" style={{ maxWidth: '1080px', margin: '0 auto', padding: '60px 24px 100px 24px' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', marginBottom: '80px', paddingTop: '40px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '9999px',
            padding: '4px 12px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            marginBottom: '24px'
          }}
        >
          <Cpu size={12} style={{ color: 'var(--color-accent)' }} />
          <span>v1.2.0: Deep Bundle Dependency Analyzer Active</span>
        </div>

        <h1
          style={{
            fontSize: '44px',
            lineHeight: '1.15',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            marginBottom: '16px',
            color: 'var(--color-text-primary)'
          }}
        >
          Performance Insights That <br />
          <span style={{ color: 'var(--color-accent)' }}>Developers Can Actually Use</span>
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            maxWidth: '620px',
            margin: '0 auto 40px auto',
            lineHeight: '1.6'
          }}
        >
          Stop reading generic performance gauges. PerfLens crawls your static sites, audits image scaling, tree-shakes javascript packages, and generates precise, actionable reports in seconds.
        </p>

        {/* URL Input Form */}
        <form
          onSubmit={handleAnalyze}
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            display: 'flex',
            gap: '8px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            padding: '6px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '12px', color: 'var(--color-muted)' }}>
            <Globe size={16} />
          </div>
          <input
            type="text"
            placeholder="Paste your URL (e.g. vercel.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-sans)'
            }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
            <span>Analyze Website</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            marginTop: '24px',
            fontSize: '12px',
            color: 'var(--color-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
            <span>Core Web Vitals Telemetry</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
            <span>Duplicate Dependency Scanning</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={12} style={{ color: 'var(--color-success)' }} />
            <span>Zero JS Footprint</span>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section style={{ marginBottom: '90px' }}>
        <div className="grid-cols-3">
          {featureCards.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-accent)'
                  }}
                >
                  <Icon size={16} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{feat.title}</h3>
                <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--color-text-secondary)' }}>
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it Works Section */}
      <section
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: '60px',
          marginBottom: '90px'
        }}
      >
        <h2 style={{ fontSize: '22px', textAlign: 'center', marginBottom: '40px' }}>
          Designed for Speed & Dev Ops Teams
        </h2>
        <div className="grid-cols-3">
          {howItWorks.map((work, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: 'var(--color-border)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {work.step}
              </span>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{work.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                {work.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: '60px',
          marginBottom: '90px'
        }}
      >
        <h2 style={{ fontSize: '22px', textAlign: 'center', marginBottom: '40px' }}>
          Loved by Engineering Leads
        </h2>
        <div className="grid-cols-2">
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', fontStyle: 'italic', lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
              "PerfLens detected over 400KB of duplicate lodash and moments dependencies that our bundler missed. Our landing page load speed went down by 1.2 seconds in a single commit."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-accent)'
                }}
              >
                M
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Marc L.</p>
                <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>Staff Engineer at Stripe</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', fontStyle: 'italic', lineHeight: '1.6', color: 'var(--color-text-primary)' }}>
              "We used to rely on generic scores, which developers ignored. PerfLens shows actual lines of code, CSS selectors, and specific image names. It has become our default PR tool."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-success)'
                }}
              >
                K
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Kathryn P.</p>
                <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>VP of Product at Vercel</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: '60px',
          marginBottom: '80px'
        }}
      >
        <h2 style={{ fontSize: '22px', textAlign: 'center', marginBottom: '40px' }}>Frequently Asked Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '720px', margin: '0 auto' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} className="expandable-card">
              <div
                className="expandable-card-header"
                onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{faq.q}</span>
                <ChevronDown
                  size={16}
                  style={{
                    transform: faqOpen === idx ? 'rotate(180deg)' : 'none',
                    transition: 'transform var(--transition-fast)',
                    color: 'var(--color-muted)'
                  }}
                />
              </div>
              {faqOpen === idx && (
                <div className="expandable-card-body" style={{ padding: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Preview Block */}
      <section
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px',
          textAlign: 'center'
        }}
      >
        <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Start optimizing your frontend bundles today</h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          No credit card required. Explore pre-scanned mock reports or run a diagnostic immediately.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => setCurrentTab('analyze')}>
            <span>Analyze Website</span>
            <ArrowRight size={14} />
          </button>
          <button className="btn btn-secondary" onClick={() => setCurrentTab('dashboard')}>
            <span>Browse Dashboard</span>
          </button>
        </div>
      </section>
    </div>
  );
};
