import { AIProvider, ExplanationInput, ExplanationOutput } from '../ai.types.js';

export class DeterministicProvider implements AIProvider {
  public readonly name = 'deterministic';
  public readonly modelName = 'deterministic-template-v1';

  public async explainFinding(input: ExplanationInput): Promise<ExplanationOutput> {
    const title = input.title;
    const lowerTitle = title.toLowerCase();
    const lowerId = input.findingId.toLowerCase();

    let whatIsHappening = '';
    let whyItMatters = '';
    let evidenceExplanation = '';
    const knownFacts: string[] = [];
    const unknowns: string[] = [];

    if (input.url) {
      knownFacts.push(`Target page URL: ${input.url}`);
    }

    // Extract facts from evidence
    for (const ev of input.evidence) {
      if (ev.url) {
        knownFacts.push(`Verified URL: ${ev.url}`);
      }
      if (ev.metric && ev.value !== undefined) {
        const formattedUnit = ev.unit ? (/^[a-zA-Z%]+$/.test(ev.unit) ? ev.unit : ` ${ev.unit}`) : '';
        knownFacts.push(`${ev.metric} was measured at ${ev.value}${formattedUnit}`);
        if (ev.source) {
          knownFacts.push(`Measured by ${ev.source}`);
        }
      } else if (ev.resource) {
        knownFacts.push(`Observed resource: ${ev.resource}${ev.value ? ` (${ev.value}${ev.unit || ''})` : ''}`);
      } else if (ev.selector) {
        knownFacts.push(`Target DOM element: ${ev.selector}`);
      } else if (ev.canonical) {
        knownFacts.push(`Canonical URL: ${ev.canonical}`);
      } else if (ev.details?.text) {
        knownFacts.push(`Evidence note: ${ev.details.text}`);
      }
    }

    if (knownFacts.length === 0) {
      knownFacts.push(`Finding "${input.findingId}" verified by PerfLens rule engine.`);
    }

    // Pattern matching on verified finding categories
    if (lowerId.includes('tbt') || lowerTitle.includes('tbt') || lowerTitle.includes('total blocking time') || lowerTitle.includes('blocking')) {
      const tbtVal = input.evidence.find((e) => (e.metric || '').toLowerCase() === 'tbt')?.value;
      whatIsHappening = `PerfLens detected substantial main-thread processing work${tbtVal !== undefined ? ` (${tbtVal}ms Total Blocking Time)` : ''} that delayed the browser from responding to user interactions during the tested load window.`;
      whyItMatters = 'When the main thread is occupied by long JavaScript execution, user actions such as taps, clicks, and keystrokes feel sluggish. Substantial main-thread delay harms perceived performance.';
      evidenceExplanation = `Total Blocking Time was recorded from ${input.evidence[0]?.source || 'lab diagnostic'} audits, indicating CPU-bound execution during hydration or script initialization.`;
      unknowns.push('The exact internal JavaScript function or module causing long tasks cannot be confirmed from this network audit alone without CPU profile sampling.');
      unknowns.push('User responsiveness on lower-end devices may experience longer delays than measured on this test runner.');
    } else if (lowerId.includes('lcp') || lowerTitle.includes('largest contentful paint')) {
      whatIsHappening = 'The largest visual element within the viewport took longer than the recommended target to finish rendering onto the screen.';
      whyItMatters = 'Largest Contentful Paint is a primary Core Web Vital. Delayed rendering gives users the perception that the website is slow or stalled.';
      evidenceExplanation = 'Measurements indicate time was spent waiting on resource download, render-blocking stylesheets, or layout execution before the hero element appeared.';
      unknowns.push('Server network conditions and cache hit ratio for first-time visitors versus returning visitors are not reflected in a single scan.');
    } else if (lowerId.includes('cls') || lowerTitle.includes('cumulative layout shift')) {
      whatIsHappening = 'Visible page content shifted unexpectedly as resources, images, or dynamic widgets loaded asynchronously into the viewport.';
      whyItMatters = 'Unexpected layout shifts disrupt user reading flow and cause accidental clicks on incorrect links or buttons.';
      evidenceExplanation = 'DOM element geometry shifts were recorded during the page render timeline, typically caused by images or dynamic containers without explicit dimensions.';
      unknowns.push('Layout stability under personalized user sessions or delayed asynchronous data fetching cannot be fully captured without authenticated session data.');
    } else if (lowerId.includes('meta-desc') || lowerTitle.includes('meta description')) {
      whatIsHappening = 'PerfLens could not find a valid, non-empty <meta name="description"> (meta description) tag within the rendered document <head>.';
      whyItMatters = 'Search engines use the meta description to generate search-result snippets, directly influencing click-through rates from search results.';
      evidenceExplanation = 'DOM head node inspection showed no matching meta tag or an empty content attribute in the rendered HTML.';
      unknowns.push('Whether server-side routing injects descriptions on specific edge routes cannot be established from this single target scan.');
    } else if (lowerId.includes('canonical') || lowerTitle.includes('canonical')) {
      const targetUrl = input.url || input.evidence.find(e => e.url)?.url;
      whatIsHappening = `No <link rel="canonical"> tag was detected in the rendered document <head>${targetUrl ? ` for ${targetUrl}` : ''}.`;
      whyItMatters = 'A canonical link communicates the authoritative URL for a page to search engine crawlers, preventing duplicate content dilution across URL parameters or protocol variants.';
      evidenceExplanation = `Inspection of document head nodes${targetUrl ? ` for ${targetUrl}` : ''} revealed zero canonical link tags present in the rendered DOM.`;
      unknowns.push('The authoritative or preferred canonical URL structure intended by the application architecture is not known to the scanner.');
      unknowns.push('The authoritative or preferred canonical URL structure intended by the application architecture is not known to the scanner.');
    } else if (lowerId.includes('h1') || lowerTitle.includes('h1')) {
      if (lowerTitle.includes('multiple') || lowerId.includes('multiple')) {
        whatIsHappening = 'Multiple <h1> heading elements were found within the rendered document body.';
        whyItMatters = 'While valid in HTML5, having multiple top-level headings can confuse screen readers and search crawlers regarding the primary topic of the document.';
        evidenceExplanation = 'DOM heading traversal detected more than one <h1> element rendered in the document hierarchy.';
        unknowns.push('Whether component modularization or microfrontend composition intentionally renders multiple headings is unknown.');
      } else {
        whatIsHappening = 'PerfLens did not find a primary <h1> (H1) heading element within the rendered document structure.';
        whyItMatters = 'The primary heading (H1) element serves as the principal semantic headline of a webpage, assisting screen reader navigation and establishing page topic hierarchy.';
        evidenceExplanation = 'DOM traversal across all heading elements confirmed no <h1> tag was rendered.';
        unknowns.push('Whether headings are injected dynamically following asynchronous user interaction cannot be determined from this scan.');
      }
    } else if (lowerId.includes('image') || lowerTitle.includes('image')) {
      whatIsHappening = 'Images were detected that transfer more bytes than necessary or lack modern compression formats like WebP or AVIF.';
      whyItMatters = 'Oversized image payloads inflate mobile data usage, consume browser memory, and delay both First Contentful Paint and Largest Contentful Paint.';
      evidenceExplanation = 'Network resource sizes and image header payloads showed legacy format transfers with high byte counts.';
      unknowns.push('Whether an image CDN or dynamic transform service is configured upstream is not evident from static asset response headers alone.');
    } else if (lowerId.includes('js') || lowerTitle.includes('javascript') || lowerTitle.includes('bundle') || lowerTitle.includes('minif')) {
      whatIsHappening = 'JavaScript assets with large transfer sizes, unminified source code, or redundant runtime payloads were detected.';
      whyItMatters = 'Excessive JavaScript increases download time, main-thread parse/compile overhead, and battery consumption on client devices.';
      evidenceExplanation = 'Network inspection and script text analysis identified unminified source code patterns or large bundle payloads.';
      unknowns.push('Internal bundler configuration, tree-shaking rules, and code-splitting boundaries inside the build pipeline cannot be seen from production bundles alone.');
    } else {
      whatIsHappening = `PerfLens identified an issue regarding ${input.category}: "${title}".`;
      whyItMatters = `Addressing this finding aligns the page with established ${input.category} best practices and reduces risk of user experience degradation.`;
      evidenceExplanation = `Verified evidence was collected by the ${input.evidence[0]?.source || 'diagnostic'} analyzer engine.`;
      unknowns.push('Underlying server configuration and client-side framework internals cannot be verified without direct repository access.');
    }

    return {
      title: `Explanation: ${title}`,
      whatIsHappening,
      whyItMatters,
      evidenceExplanation,
      knownFacts,
      unknowns,
      confidence: 'high',
      source: 'deterministic_fallback',
      promptVersion: 'deterministic.v1',
      model: this.modelName,
      provider: this.name
    };
  }
}
