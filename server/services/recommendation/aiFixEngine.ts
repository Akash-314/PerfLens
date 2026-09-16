import { DetectedFrameworkInfo } from './frameworkDetector.js';

export interface GenerateAiFixPromptOptions {
  category: 'seo' | 'performance' | 'accessibility' | 'best-practices';
  problem: string;
  url: string;
  evidence: string;
  task: string;
  guidance?: string;
  frameworkInfo?: DetectedFrameworkInfo;
  validationSteps: string[];
}

/**
 * Generates an authoritative, copy-ready coding-agent fix prompt.
 * Strictly adheres to PerfLens Zero-Fabrication Rules:
 * - Never invents filenames (e.g. src/app/page.tsx)
 * - Never invents frameworks
 * - If framework is verified, provides framework-idiomatic guidance
 * - If framework is not verified, instructs to inspect existing architecture
 * - Enforces minimum change and strict architectural constraints
 * - Includes step-by-step verification instructions
 */
export const generateAiFixPrompt = (options: GenerateAiFixPromptOptions): string => {
  const categoryTitle = options.category.toUpperCase();

  // Determine framework guidance
  let frameworkAdvice = 'Inspect the existing architecture and apply the fix there.';
  if (options.frameworkInfo && options.frameworkInfo.confidence === 'verified' && options.frameworkInfo.framework) {
    const fw = options.frameworkInfo.framework;
    const variant = options.frameworkInfo.variant;

    if (fw === 'Next.js') {
      if (variant === 'App Router') {
        frameworkAdvice = 'Framework Detected: Next.js (App Router).\nApply the fix using the App Router metadata API (export static `metadata` object or implement `generateMetadata()` in layout/page). Do not write raw <head> tags in App Router.';
      } else if (variant === 'Pages Router') {
        frameworkAdvice = 'Framework Detected: Next.js (Pages Router).\nApply the fix using `next/head` (`import Head from "next/head"`).';
      } else {
        frameworkAdvice = 'Framework Detected: Next.js.\nApply the fix using the project\'s existing Next.js metadata/head architecture (e.g., App Router `metadata` export or Pages Router `next/head`).';
      }
    } else if (fw === 'Nuxt') {
      frameworkAdvice = 'Framework Detected: Nuxt.\nApply the fix using `useHead({ ... })` or `useSeoMeta({ ... })` in your setup script or page component.';
    } else if (fw === 'Astro') {
      frameworkAdvice = 'Framework Detected: Astro.\nApply the fix in the layout component `<head>` section.';
    } else if (fw === 'Vite' || fw === 'React') {
      frameworkAdvice = 'Framework Detected: Vite/React SPA.\nApply the fix in the root `index.html` <head> or use your client-side head manager (e.g., react-helmet-async / @unhead/react).';
    } else if (fw === 'WordPress') {
      frameworkAdvice = 'Framework Detected: WordPress.\nApply the fix via your theme `header.php`, functions.php `wp_head` action hook, or active SEO plugin.';
    }
  }

  const customGuidance = options.guidance ? `\n${options.guidance}` : '';

  const validationList = options.validationSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n');

  return `Fix the verified ${categoryTitle} issue below.

Problem:
${options.problem}

Affected Target:
${options.url}

Evidence:
${options.evidence}

Task:
${options.task}

Implementation Guidance:
${frameworkAdvice}${customGuidance}

Constraints:
- Do not redesign the UI.
- Do not introduce a new dependency unless required by your existing architecture.
- Do not create duplicate tags or metadata declarations.
- Do not modify unrelated functionality.
- Reuse the existing project architecture.
- Prefer the smallest, cleanest correct fix.

Validation:
${validationList}`;
};
