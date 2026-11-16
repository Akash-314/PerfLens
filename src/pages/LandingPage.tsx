import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, ArrowRight, Zap, Shield, Sparkles, CheckCircle, ChevronDown, HeartHandshake } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { startAnalysis, setCurrentTab, isAuthenticated, user } = useApp();
  const [url, setUrl] = useState('');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      if (!isAuthenticated) {
        setCurrentTab('register');
        return;
      }
      startAnalysis(url.trim());
    }
  };

  const featureCards = [
    {
      icon: Zap,
      title: 'Find what is slowing you down',
      desc: 'See what is making your website feel slow and find the biggest opportunities to improve it.'
    },
    {
      icon: Sparkles,
      title: 'Get fixes explained simply',
      desc: 'Understand what went wrong and get practical suggestions for fixing it.'
    },
    {
      icon: Shield,
      title: 'Catch important website problems',
      desc: 'Find accessibility, SEO, sharing, and technical issues before your visitors do.'
    }
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Check your website',
      desc: 'Paste your URL and let PerfLens inspect it like a real visitor would.'
    },
    {
      step: '02',
      title: 'Understand the problems',
      desc: 'We explain the biggest issues in simple language so you know what is holding your site back.'
    },
    {
      step: '03',
      title: 'Fix what matters',
      desc: 'Follow the recommended fixes and improve your speed, search readiness, and usability.'
    }
  ];

  const faqs = [
    {
      q: 'How does PerfLens know if my website is fast?',
      a: 'PerfLens checks several signals used to understand how quickly a page becomes visible and usable. These include standard web health metrics such as LCP (how fast main content appears), CLS (whether content jumps around), and INP (how fast the page responds when clicked).'
    },
    {
      q: 'What kind of problems does PerfLens find?',
      a: 'We look for heavy images, busy JavaScript files, missing search descriptions, broken links, color contrast problems, and accessibility bottlenecks that make your site harder to use.'
    },
    {
      q: 'Do I need to install any code on my website?',
      a: 'No! PerfLens checks your public website just like a real browser would. You don\'t need to install any tracking scripts, npm packages, or configuration files.'
    },
    {
      q: 'Can I share reports with my team or clients?',
      a: 'Yes! Every scan produces a clean summary with shareable links and downloadable PDF reports so everyone can agree on what to fix.'
    }
  ];

  return (
    <div className="fade-in" style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px 24px 100px 24px' }}>
      {/* Navigation Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '60px'
        }}
      >
        <div 
          onClick={() => setCurrentTab('landing')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '18px', 
            fontWeight: 700, 
            cursor: 'pointer',
            color: 'var(--color-text-primary)'
          }}
        >
          <img
            src="/favicon.svg"
            alt="PerfLens"
            style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
          />
          <span>PerfLens</span>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isAuthenticated ? (
            <>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'inline-block', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Hi, {user?.name || user?.email.split('@')[0]}
              </span>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setCurrentTab('dashboard')}
              >
                Go to Overview
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setCurrentTab('login')}
              >
                Log In
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => setCurrentTab('register')}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ textAlign: 'center', marginBottom: '80px', paddingTop: '20px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '9999px',
            padding: '4px 14px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            marginBottom: '24px'
          }}
        >
          <HeartHandshake size={13} style={{ color: 'var(--color-accent)' }} />
          <span>Your friendly website performance coach</span>
        </div>

        <h1
          style={{
            fontSize: '46px',
            lineHeight: '1.15',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            marginBottom: '18px',
            color: 'var(--color-text-primary)'
          }}
        >
          Make your website faster, <br />
          <span style={{ color: 'var(--color-accent)' }}>clearer, and better.</span>
        </h1>
        <p
          style={{
            fontSize: '17px',
            color: 'var(--color-text-secondary)',
            maxWidth: '620px',
            margin: '0 auto 40px auto',
            lineHeight: '1.6'
          }}
        >
          PerfLens checks your website, finds the problems that matter, and explains exactly what to fix in plain English.
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
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '12px', color: 'var(--color-muted)' }}>
            <Globe size={16} />
          </div>
          <input
            type="text"
            placeholder="Paste your website URL (e.g. yoursite.com)"
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
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px' }}>
            <span>Check my website</span>
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
            <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
            <span>Under 5-second diagnostics</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
            <span>Clear, beginner-friendly fixes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
            <span>No code installation required</span>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section style={{ marginBottom: '90px' }}>
        <div className="grid-cols-3">
          {featureCards.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="coach-box" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-accent)'
                  }}
                >
                  <Icon size={18} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{feat.title}</h3>
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
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
            From scan to fix in minutes
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
            Three simple steps to make your website faster and more welcoming.
          </p>
        </div>

        <div className="grid-cols-3">
          {howItWorks.map((work, idx) => (
            <div key={idx} className="coach-box" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: 'var(--color-accent)',
                  fontFamily: 'var(--font-mono)',
                  opacity: 0.8
                }}
              >
                {work.step}
              </span>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{work.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                {work.desc}
              </p>
            </div>
          ))}
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
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Frequently Asked Questions</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>Got questions? Here is how PerfLens helps you improve your site.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '720px', margin: '0 auto' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} className="expandable-card" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <div
                className="expandable-card-header"
                onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{faq.q}</span>
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
                <div className="expandable-card-body" style={{ padding: '0 16px 16px 16px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
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
          background: 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-secondary) 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 24px',
          textAlign: 'center'
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Ready to check your website?</h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px auto' }}>
          Paste your URL and get actionable recommendations in seconds.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => setCurrentTab(isAuthenticated ? 'analyze' : 'register')}
          >
            <span>{isAuthenticated ? 'Check a Website' : 'Get Started for Free'}</span>
            <ArrowRight size={14} />
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setCurrentTab(isAuthenticated ? 'dashboard' : 'login')}
          >
            <span>{isAuthenticated ? 'Go to Overview' : 'Log In'}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
