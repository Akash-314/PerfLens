/**
 * PerfLens Developer Coach Utilities
 * Translates complex performance engineering jargon into friendly, human-first guidance.
 * Provides progressive disclosure: Level 1 (Simple explanation) -> Level 2 (Actionable fix) -> Level 3 (Technical detail).
 */

export interface HumanizedFindingTitle {
  headline: string;
  summary: string;
  whyItMatters: string;
  whatToDo: string;
}

export interface MetricHumanExplanation {
  label: string;
  friendlyName: string;
  shortDesc: string;
  goodRange: string;
}

/**
 * Maps known technical audit issues to friendly, conversational developer coach copy.
 */
export const humanizeFinding = (issueText: string, _category?: string): HumanizedFindingTitle => {
  const text = (issueText || '').toLowerCase();

  // JavaScript & Total Blocking Time
  if (text.includes('blocking time') || text.includes('long javascript') || text.includes('tbt') || text.includes('long task')) {
    return {
      headline: 'Your JavaScript is keeping the page busy',
      summary: 'Some scripts take too long to run, which makes buttons and scrolls feel unresponsive.',
      whyItMatters: 'Visitors might tap or click and feel like the page is frozen or lagging.',
      whatToDo: 'Break large JavaScript tasks into smaller pieces, or delay non-essential scripts until after the page loads.'
    };
  }

  // Large / Uncompressed Images
  if (text.includes('compress page image') || text.includes('oversized image') || text.includes('next-gen format') || text.includes('webp') || text.includes('avif') || text.includes('image format')) {
    return {
      headline: 'Your images are heavier than they need to be',
      summary: 'Images take up unnecessary bandwidth and take longer for visitors on mobile to download.',
      whyItMatters: 'Large image downloads are the #1 reason mobile pages feel slow to load.',
      whatToDo: 'Compress images and convert them to modern formats like WebP or AVIF.'
    };
  }

  // Image Dimensions / Aspect Ratio
  if (text.includes('explicit width and height') || text.includes('aspect ratio') || text.includes('unsized image')) {
    return {
      headline: 'Some images need set dimensions',
      summary: 'Without specified height and width, images push page content around while loading.',
      whyItMatters: 'This causes jarring layout jumps where visitors accidentally tap the wrong button.',
      whatToDo: 'Add explicit width and height attributes to your <img> tags or set a CSS aspect-ratio.'
    };
  }

  // Meta Description
  if (text.includes('meta description') || text.includes('search engine result snippet')) {
    return {
      headline: 'Your page is missing a search description',
      summary: 'There is no summary snippet for search engines to display under your link.',
      whyItMatters: 'A clear description helps people decide to click on your website in search results.',
      whatToDo: 'Add a <meta name="description" content="..."> tag with a concise 1-2 sentence description.'
    };
  }

  // Primary H1 Heading
  if (text.includes('primary h1') || text.includes('h1 heading') || text.includes('missing h1')) {
    return {
      headline: 'Your page needs a clear main heading',
      summary: 'Screen readers and search engines look for a single main heading (H1) to understand what the page is about.',
      whyItMatters: 'Without an H1, assistive technologies and search bots have to guess the page topic.',
      whatToDo: 'Add a single, descriptive <h1> element representing the main topic of your page.'
    };
  }

  // Multiple H1s
  if (text.includes('multiple h1') || text.includes('more than one h1')) {
    return {
      headline: 'Use only one main heading per page',
      summary: 'Your page has multiple top-level <h1> headings.',
      whyItMatters: 'Having one main heading creates a clear hierarchy for both search engines and screen readers.',
      whatToDo: 'Keep one <h1> for the main title, and use <h2> and <h3> for secondary sections.'
    };
  }

  // Canonical URL
  if (text.includes('canonical url') || text.includes('canonical link')) {
    return {
      headline: 'Your page is missing a preferred URL',
      summary: 'A canonical tag tells search engines which version of this page is the official one.',
      whyItMatters: 'Prevents duplicate content confusion when visitors access your site via www, http, or tracking links.',
      whatToDo: 'Add a <link rel="canonical" href="https://yourdomain.com/path"> tag to the <head>.'
    };
  }

  // robots.txt
  if (text.includes('robots.txt')) {
    return {
      headline: 'Search engines may have trouble reading your site instructions',
      summary: 'Your robots.txt file is either missing or blocking search bots from exploring your pages.',
      whyItMatters: 'Search engines like Google rely on robots.txt to know what they are allowed to index.',
      whatToDo: 'Make sure your robots.txt file exists at your domain root and allows indexing of your public pages.'
    };
  }

  // sitemap.xml
  if (text.includes('sitemap.xml') || text.includes('sitemap')) {
    return {
      headline: 'Help search engines discover all your pages',
      summary: 'A sitemap file lists all the important pages on your website.',
      whyItMatters: 'Without a sitemap, search crawlers might miss newly published or deeply linked pages.',
      whatToDo: 'Generate a sitemap.xml file and link to it in your robots.txt or submit it to Google Search Console.'
    };
  }

  // HTML Language attribute
  if (text.includes('html language') || text.includes('lang attribute') || text.includes('lang=')) {
    return {
      headline: 'Tell browsers what language your page uses',
      summary: 'The <html> element is missing a language attribute like lang="en".',
      whyItMatters: 'Screen readers need this to pronounce words with the right accent and dictionary.',
      whatToDo: 'Add lang="en" (or your language code) to the opening <html lang="en"> tag.'
    };
  }

  // Open Graph / Social Sharing
  if (text.includes('open graph') || text.includes('og:') || text.includes('social share') || text.includes('social preview')) {
    return {
      headline: 'Your shared links could look much better',
      summary: 'When someone shares your link on Twitter, LinkedIn, or Slack, no preview image or title appears.',
      whyItMatters: 'Links with attractive preview cards get significantly more clicks and shares.',
      whatToDo: 'Add og:title, og:description, and og:image meta tags to your <head>.'
    };
  }

  // Largest Contentful Paint (LCP)
  if (text.includes('largest contentful paint') || text.includes('lcp')) {
    return {
      headline: 'The main part of your page takes a while to appear',
      summary: 'The biggest image or text block takes too long to load on screen.',
      whyItMatters: 'When the main content is slow, visitors assume the site is broken and leave.',
      whatToDo: 'Preload your hero image, optimize server response time, and avoid render-blocking scripts.'
    };
  }

  // Cumulative Layout Shift (CLS)
  if (text.includes('cumulative layout shift') || text.includes('layout shift') || text.includes('cls')) {
    return {
      headline: 'Content jumps around while the page is loading',
      summary: 'Elements shift unexpectedly on screen as late-arriving fonts, ads, or images pop in.',
      whyItMatters: 'Layout shifts frustrate visitors and cause accidental mis-clicks.',
      whatToDo: 'Reserve space for images and banners before they finish loading, and avoid inserting new content above existing text.'
    };
  }

  // Unused CSS / JavaScript Bloat
  if (text.includes('unused css') || text.includes('unused javascript') || text.includes('unused code') || text.includes('tree-shak')) {
    return {
      headline: 'Your site loads code it doesn\'t actually use',
      summary: 'The browser is downloading stylesheets or script bundles that aren\'t needed on this page.',
      whyItMatters: 'Downloading extra code slows down page rendering, especially on slower mobile connections.',
      whatToDo: 'Split your bundles by page route and remove unused CSS libraries.'
    };
  }

  // Render Blocking Resources
  if (text.includes('render-blocking') || text.includes('eliminate render-blocking') || text.includes('block initial')) {
    return {
      headline: 'Some files are stopping the page from showing up',
      summary: 'The browser halts painting the page until certain CSS or JavaScript files finish downloading.',
      whyItMatters: 'Visitors are left looking at a blank white screen while waiting.',
      whatToDo: 'Add defer or async to script tags and inline critical above-the-fold CSS.'
    };
  }

  // Form Labels / Accessibility
  if (text.includes('form label') || text.includes('input label') || text.includes('missing label')) {
    return {
      headline: 'Some form inputs need clear labels',
      summary: 'Text fields or inputs don\'t have associated <label> elements.',
      whyItMatters: 'Visitors using screen readers cannot tell what information the field is asking for.',
      whatToDo: 'Wrap inputs in a <label> or connect them using htmlFor and matching id attributes.'
    };
  }

  // Alt Text on Images
  if (text.includes('alt text') || text.includes('image alt') || text.includes('missing alt')) {
    return {
      headline: 'Some images need a short description',
      summary: 'Images are missing the alt="..." attribute.',
      whyItMatters: 'Screen readers read the alt description aloud so visually impaired visitors know what the image shows.',
      whatToDo: 'Add a concise alt="Descriptive text" attribute to every informational image.'
    };
  }

  // Low Contrast
  if (text.includes('contrast') || text.includes('color contrast')) {
    return {
      headline: 'Some text is difficult to read',
      summary: 'The color contrast between text and its background is too subtle.',
      whyItMatters: 'Visitors in bright sunlight or with low vision will struggle to read your content.',
      whatToDo: 'Darken text colors on light backgrounds or brighten text colors on dark backgrounds.'
    };
  }

  // Time to First Byte / Server Response
  if (text.includes('time to first byte') || text.includes('ttfb') || text.includes('server response')) {
    return {
      headline: 'Your server takes a moment to respond',
      summary: 'The initial request to your host took longer than recommended before data started arriving.',
      whyItMatters: 'Everything else has to wait until the server sends the first response packet.',
      whatToDo: 'Use a content delivery network (CDN), enable edge caching, or optimize database queries.'
    };
  }

  // Fallback: Clean up the raw issue text into a friendly sentence
  const cleanHeadline = issueText
    .replace(/^ensure\s+/i, 'Make sure ')
    .replace(/^eliminate\s+/i, 'Remove ')
    .replace(/^reduce\s+/i, 'Lower ')
    .replace(/^provide\s+/i, 'Add ')
    .replace(/^specify\s+/i, 'Set ');

  return {
    headline: cleanHeadline.charAt(0).toUpperCase() + cleanHeadline.slice(1),
    summary: 'We found an opportunity to improve this part of your website.',
    whyItMatters: 'Fixing this helps visitors have a faster, smoother experience.',
    whatToDo: 'Review the technical evidence below to locate the element and apply the recommended fix.'
  };
};

/**
 * Maps technical severities to friendly impact labels.
 */
export const humanizeSeverity = (severity?: string): { label: string; badgeClass: string; description: string } => {
  const sev = (severity || 'medium').toLowerCase();
  if (sev === 'critical' || sev === 'high') {
    return {
      label: 'High impact',
      badgeClass: 'badge-impact-high',
      description: 'Fixing this will make a noticeable difference for your visitors.'
    };
  }
  if (sev === 'medium') {
    return {
      label: 'Worth fixing',
      badgeClass: 'badge-impact-medium',
      description: 'A solid improvement that enhances site quality and speed.'
    };
  }
  return {
    label: 'Nice improvement',
    badgeClass: 'badge-impact-low',
    description: 'A small polish item to keep your site in top condition.'
  };
};

/**
 * Friendly Core Web Vitals definitions.
 */
export const CWV_METRICS: Record<string, MetricHumanExplanation> = {
  lcp: {
    label: 'LCP',
    friendlyName: 'Main content appears',
    shortDesc: 'How quickly the most important image or text block shows up.',
    goodRange: 'Under 2.5 seconds is ideal'
  },
  cls: {
    label: 'CLS',
    friendlyName: 'Visual stability',
    shortDesc: 'Checks whether buttons and text jump around while loading.',
    goodRange: 'Under 0.1 is smooth'
  },
  inp: {
    label: 'INP',
    friendlyName: 'Page response',
    shortDesc: 'How fast the page reacts when a visitor clicks or taps.',
    goodRange: 'Under 200 milliseconds is snappy'
  },
  fcp: {
    label: 'FCP',
    friendlyName: 'First visible content',
    shortDesc: 'The moment visitors see the very first thing on screen.',
    goodRange: 'Under 1.8 seconds is fast'
  },
  ttfb: {
    label: 'TTFB',
    friendlyName: 'Server response time',
    shortDesc: 'How fast your web host responds to the browser\'s initial request.',
    goodRange: 'Under 800 milliseconds is good'
  },
  tbt: {
    label: 'TBT',
    friendlyName: 'Main thread busy time',
    shortDesc: 'How long the browser is blocked by heavy script execution.',
    goodRange: 'Under 200 milliseconds is ideal'
  }
};

/**
 * Score coaching interpretations.
 */
export const getScoreCoaching = (score: number): {
  headline: string;
  summary: string;
  badgeClass: string;
  pillText: string;
} => {
  if (score >= 90) {
    return {
      headline: 'Looking great!',
      summary: 'Your website is fast, accessible, and well-structured for visitors.',
      badgeClass: 'metric-score-green',
      pillText: 'Great condition'
    };
  }
  if (score >= 70) {
    return {
      headline: 'Good progress',
      summary: 'Your site is in a solid place, but a few key fixes will make it noticeably better.',
      badgeClass: 'metric-score-orange',
      pillText: 'Good, with fixes'
    };
  }
  if (score >= 50) {
    return {
      headline: 'Needs attention',
      summary: 'A few significant bottlenecks are slowing your visitors down.',
      badgeClass: 'metric-score-orange',
      pillText: 'Needs attention'
    };
  }
  return {
    headline: 'Let\'s fix the important stuff',
    summary: 'There are major issues hurting your speed or search readiness. Start with the high-impact fixes.',
    badgeClass: 'metric-score-red',
    pillText: 'Action needed'
  };
};

/**
 * Maps category keys to human-friendly labels.
 */
export const humanizeCategory = (cat: string): string => {
  switch ((cat || '').toLowerCase()) {
    case 'performance':
      return 'Speed';
    case 'accessibility':
      return 'Accessibility';
    case 'seo':
      return 'Search & Sharing';
    case 'images':
      return 'Images';
    case 'js':
      return 'JavaScript';
    case 'css':
      return 'Stylesheets';
    case 'best-practices':
      return 'Best Practices';
    default:
      return cat;
  }
};
