export interface DetectedFrameworkInfo {
  framework: 'Next.js' | 'Nuxt' | 'Astro' | 'Vite' | 'React' | 'WordPress' | 'Vue' | 'Angular' | 'Svelte' | null;
  variant?: 'App Router' | 'Pages Router' | null;
  confidence: 'verified' | 'inferred' | 'none';
  evidence?: string;
  signals?: string[];
}

/**
 * Detects project framework from verified DOM markers, script paths, and bundle packages.
 * Never guesses: returns confidence 'none' and framework null if no verified signals exist.
 */
export const detectFramework = (input: {
  seo?: any;
  js?: any;
  resources?: any[];
}): DetectedFrameworkInfo => {
  // 1. Check direct SEO DOM framework signal
  const directSignal = input.seo?.seo?.detectedFramework;
  if (directSignal && directSignal.name) {
    const name = directSignal.name;
    if (name === 'Next.js') {
      return {
        framework: 'Next.js',
        variant: null,
        confidence: 'verified',
        evidence: directSignal.evidence || 'DOM signal (__NEXT_DATA__ or /_next/ scripts)'
      };
    }
    if (name === 'Nuxt') {
      return { framework: 'Nuxt', confidence: 'verified', evidence: directSignal.evidence };
    }
    if (name === 'Astro') {
      return { framework: 'Astro', confidence: 'verified', evidence: directSignal.evidence };
    }
    if (name === 'WordPress') {
      return { framework: 'WordPress', confidence: 'verified', evidence: directSignal.evidence };
    }
    if (name === 'Vite') {
      return { framework: 'Vite', confidence: 'verified', evidence: directSignal.evidence };
    }
  }

  // 2. Check JS scripts & bundles
  const scripts: Array<{ url?: string; name?: string }> = input.js?.scripts || [];
  const resources: Array<{ url?: string; name?: string }> = input.resources || [];
  const allUrls = [...scripts, ...resources].map(s => (s.url || s.name || '').toLowerCase());

  if (allUrls.some(u => u.includes('/_next/static/chunks/app/') || u.includes('/_next/app'))) {
    return {
      framework: 'Next.js',
      variant: 'App Router',
      confidence: 'verified',
      evidence: 'Observed Next.js App Router chunks (/_next/static/chunks/app/)'
    };
  }

  if (allUrls.some(u => u.includes('/_next/static/'))) {
    return {
      framework: 'Next.js',
      variant: 'Pages Router',
      confidence: 'verified',
      evidence: 'Observed Next.js script bundles (/_next/static/)'
    };
  }

  if (allUrls.some(u => u.includes('/_nuxt/'))) {
    return {
      framework: 'Nuxt',
      confidence: 'verified',
      evidence: 'Observed Nuxt script bundles (/_nuxt/)'
    };
  }

  if (allUrls.some(u => u.includes('/_astro/'))) {
    return {
      framework: 'Astro',
      confidence: 'verified',
      evidence: 'Observed Astro asset bundles (/_astro/)'
    };
  }

  if (allUrls.some(u => u.includes('/wp-content/') || u.includes('/wp-includes/'))) {
    return {
      framework: 'WordPress',
      confidence: 'verified',
      evidence: 'Observed WordPress asset paths (/wp-content/)'
    };
  }

  if (allUrls.some(u => u.includes('/@vite/client') || u.includes('vite/dist/client'))) {
    return {
      framework: 'Vite',
      confidence: 'verified',
      evidence: 'Observed Vite runtime client (/@vite/client)'
    };
  }

  // 3. Fallback: No verified signals -> return none (never fabricate)
  return {
    framework: null,
    confidence: 'none',
    evidence: 'No framework-specific signals detected'
  };
};
