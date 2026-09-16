import { describe, it, expect } from 'vitest';
import { detectFramework } from '../services/recommendation/frameworkDetector.js';
import { generateAiFixPrompt } from '../services/recommendation/aiFixEngine.js';

describe('PERFLEX AI Code-Editor Fix Engine & Framework Detector', () => {
  describe('detectFramework', () => {
    it('returns verified Next.js App Router when /_next/static/chunks/app/ scripts are observed', () => {
      const result = detectFramework({
        resources: [
          { url: 'https://example.com/_next/static/chunks/app/layout-123.js' },
          { url: 'https://example.com/_next/static/chunks/main-app-456.js' }
        ]
      });

      expect(result.framework).toBe('Next.js');
      expect(result.variant).toBe('App Router');
      expect(result.confidence).toBe('verified');
      expect(result.evidence).toContain('/_next/static/chunks/app/');
    });

    it('returns verified Next.js Pages Router when /_next/static/ but no app chunks are observed', () => {
      const result = detectFramework({
        resources: [
          { url: 'https://example.com/_next/static/chunks/pages/index-123.js' }
        ]
      });

      expect(result.framework).toBe('Next.js');
      expect(result.variant).toBe('Pages Router');
      expect(result.confidence).toBe('verified');
    });

    it('detects Nuxt from DOM framework signals', () => {
      const result = detectFramework({
        seo: {
          seo: {
            detectedFramework: {
              name: 'Nuxt',
              evidence: 'Observed Nuxt hydration marker'
            }
          }
        }
      });

      expect(result.framework).toBe('Nuxt');
      expect(result.confidence).toBe('verified');
    });

    it('detects Astro from DOM markers', () => {
      const result = detectFramework({
        seo: {
          seo: {
            detectedFramework: {
              name: 'Astro',
              evidence: 'Observed Astro component markers (data-astro-cid)'
            }
          }
        }
      });

      expect(result.framework).toBe('Astro');
      expect(result.confidence).toBe('verified');
    });

    it('returns confidence "none" and framework null when no verified indicators exist', () => {
      const result = detectFramework({
        resources: [
          { url: 'https://example.com/assets/main.js' },
          { url: 'https://example.com/assets/style.css' }
        ]
      });

      expect(result.framework).toBeNull();
      expect(result.confidence).toBe('none');
      expect(result.evidence).toBe('No framework-specific signals detected');
    });
  });

  describe('generateAiFixPrompt', () => {
    it('generates non-hallucinated prompt for unconfirmed generic frameworks', () => {
      const prompt = generateAiFixPrompt({
        category: 'seo',
        problem: 'The homepage has no meta description.',
        url: 'https://example.com/',
        evidence: 'No <meta name="description"> was found in the rendered <head>.',
        task: 'Add one page-specific meta description using the project\'s existing SEO/metadata architecture.',
        frameworkInfo: {
          framework: null,
          confidence: 'none',
          evidence: 'No framework markers detected'
        },
        validationSteps: [
          'Inspect the rendered page <head> and confirm exactly one <meta name="description"> exists.',
          'Verify the content attribute is between 70 and 160 characters.'
        ]
      });

      // Must NOT hallucinate specific file paths like src/app/page.tsx or components/Header.jsx
      expect(prompt).not.toContain('src/app/page.tsx');
      expect(prompt).not.toContain('components/Header');
      // Must contain generic guidance
      expect(prompt).toContain('Inspect the existing architecture and apply the fix there.');
      // Must contain strict constraints
      expect(prompt).toContain('Constraints:');
      expect(prompt).toContain('Do not redesign the UI.');
      expect(prompt).toContain('Do not modify unrelated functionality.');
      // Must contain validation steps
      expect(prompt).toContain('Validation:');
      expect(prompt).toContain('1. Inspect the rendered page <head>');
    });

    it('tailors prompt guidance when Next.js App Router is verified without guessing file paths', () => {
      const prompt = generateAiFixPrompt({
        category: 'seo',
        problem: 'The page title is missing.',
        url: 'https://example.com/blog',
        evidence: 'No <title> tag detected in rendered DOM',
        task: 'Define one unique <title> tag.',
        frameworkInfo: {
          framework: 'Next.js',
          variant: 'App Router',
          confidence: 'verified',
          evidence: 'Observed Next.js App Router chunks'
        },
        validationSteps: [
          'Verify title appears in page <head>.'
        ]
      });

      expect(prompt).toContain('Framework Detected: Next.js (App Router)');
      expect(prompt).toContain('App Router metadata API');
      expect(prompt).not.toContain('pages/index.js');
    });
  });
});
