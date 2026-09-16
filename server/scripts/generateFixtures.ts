import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesRoot = path.resolve(__dirname, '..', 'tests', 'fixtures');

const seoDir = path.join(fixturesRoot, 'seo');
const networkDir = path.join(fixturesRoot, 'network');
const dynamicDir = path.join(fixturesRoot, 'dynamic');

[seoDir, networkDir, dynamicDir].forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

// --- SEO FIXTURES ---
const seoFixtures: Record<string, string> = {
  'complete.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PerfLens Comprehensive Valid SEO Testing Document</title>
  <meta name="description" content="A comprehensive valid SEO test document engineered to verify that all primary metadata tags pass analyzer quality standards.">
  <link rel="canonical" href="https://example.com/test-complete">
  <meta name="robots" content="index, follow">
  
  <!-- OpenGraph Metadata -->
  <meta property="og:title" content="PerfLens Complete OpenGraph Title">
  <meta property="og:description" content="A complete OpenGraph description verifying social card properties.">
  <meta property="og:image" content="https://example.com/images/og-hero.jpg">
  <meta property="og:url" content="https://example.com/test-complete">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="PerfLens Testing">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "PerfLens Test Suite",
    "url": "https://example.com"
  }
  </script>
</head>
<body>
  <header>
    <h1>Primary Main Header (H1)</h1>
  </header>
  <main>
    <h2>Secondary Section Header (H2)</h2>
    <p>This is a paragraph under the secondary header providing valid content.</p>
    <h3>Tertiary Subsection Header (H3)</h3>
    <p>This is a paragraph under the tertiary header demonstrating valid hierarchical progression.</p>
  </main>
</body>
</html>`,

  'missing-title.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Document without a title element to verify missing title detection.">
</head>
<body>
  <h1>Page Lacking Title</h1>
</body>
</html>`,

  'short-title.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tiny</title>
  <meta name="description" content="Document with an extremely short title (<10 characters).">
</head>
<body>
  <h1>Page With Short Title</h1>
</body>
</html>`,

  'long-title.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>This Is An Extremely Long And Verbose Page Title That Exceeds Seventy Characters Easily In Search Engine Results Pages</title>
  <meta name="description" content="Document with an excessively long title exceeding standard SERP guidelines.">
</head>
<body>
  <h1>Page With Long Title</h1>
</body>
</html>`,

  'missing-description.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Valid Document Title Without Meta Description</title>
</head>
<body>
  <h1>Page Without Meta Description</h1>
</body>
</html>`,

  'short-description.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document With Very Short Meta Description</title>
  <meta name="description" content="Too brief.">
</head>
<body>
  <h1>Page With Short Description</h1>
</body>
</html>`,

  'long-description.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document With Excessively Long Meta Description</title>
  <meta name="description" content="This is an excessively long meta description that stretches far beyond the recommended length for search engine snippets. It keeps going and going, providing unnecessary amounts of explanatory prose that will almost certainly be truncated with an ellipsis by Google, Bing, and other modern search crawlers.">
</head>
<body>
  <h1>Page With Long Description</h1>
</body>
</html>`,

  'valid-canonical.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Valid Canonical Document</title>
  <link rel="canonical" href="https://example.com/canonical-target">
</head>
<body>
  <h1>Valid Canonical</h1>
</body>
</html>`,

  'missing-canonical.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Missing Canonical Document</title>
</head>
<body>
  <h1>Missing Canonical</h1>
</body>
</html>`,

  'duplicate-canonical.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Duplicate Canonical Document</title>
  <link rel="canonical" href="https://example.com/canonical-one">
  <link rel="canonical" href="https://example.com/canonical-two">
</head>
<body>
  <h1>Duplicate Canonical</h1>
</body>
</html>`,

  'malformed-canonical.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Malformed Canonical Document</title>
  <link rel="canonical" href=":::not-a-valid-uri:::">
</head>
<body>
  <h1>Malformed Canonical</h1>
</body>
</html>`,

  'no-jsonld.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>No JSON-LD Document</title>
</head>
<body>
  <h1>Document without structured data</h1>
</body>
</html>`,

  'valid-jsonld.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Valid JSON-LD Document</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Testing JSON-LD Parsing",
    "author": {
      "@type": "Person",
      "name": "Quality Engineer"
    }
  }
  </script>
</head>
<body>
  <h1>Document with valid single schema</h1>
</body>
</html>`,

  'invalid-jsonld.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invalid JSON-LD Document</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Malformed JSON without closing brace"
  </script>
</head>
<body>
  <h1>Document with malformed JSON-LD</h1>
</body>
</html>`,

  'multiple-jsonld.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multiple JSON-LD Document</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PerfLens Inc",
    "url": "https://example.com"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "PerfLens Testing Hub"
  }
  </script>
</head>
<body>
  <h1>Document with two schema blocks</h1>
</body>
</html>`,

  'complete-og.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Complete OpenGraph</title>
  <meta property="og:title" content="Full OpenGraph Title">
  <meta property="og:description" content="Full OpenGraph Description">
  <meta property="og:image" content="https://example.com/cover.png">
  <meta property="og:url" content="https://example.com/page">
  <meta property="og:type" content="website">
</head>
<body>
  <h1>5 of 5 OpenGraph present</h1>
</body>
</html>`,

  'partial-og.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Partial OpenGraph</title>
  <meta property="og:title" content="Partial OpenGraph Title">
  <meta property="og:description" content="Partial OpenGraph Description">
  <meta property="og:type" content="website">
  <!-- og:image and og:url intentionally missing (3/5 present = 60%) -->
</head>
<body>
  <h1>3 of 5 OpenGraph present</h1>
</body>
</html>`,

  'no-og.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>No OpenGraph</title>
</head>
<body>
  <h1>0 of 5 OpenGraph present</h1>
</body>
</html>`,

  'duplicate-og.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Duplicate OpenGraph</title>
  <meta property="og:title" content="Primary Title">
  <meta property="og:title" content="Secondary Duplicate Title">
  <meta property="og:description" content="First Description">
  <meta property="og:description" content="Second Description">
  <meta property="og:image" content="https://example.com/one.png">
  <meta property="og:url" content="https://example.com/page">
  <meta property="og:type" content="website">
</head>
<body>
  <h1>Duplicate OG properties</h1>
</body>
</html>`,

  'empty-og.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Empty OpenGraph Tags</title>
  <meta property="og:title" content="   ">
  <meta property="og:description" content="">
  <meta property="og:image" content="">
  <meta property="og:url" content="">
  <meta property="og:type" content="">
</head>
<body>
  <h1>Tags declared but content empty</h1>
</body>
</html>`,

  'heading-valid.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Valid Heading Hierarchy</title>
</head>
<body>
  <h1>Main Topic</h1>
  <h2>Sub Topic A</h2>
  <h3>Detail A1</h3>
  <h3>Detail A2</h3>
  <h2>Sub Topic B</h2>
</body>
</html>`,

  'heading-skipped.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Skipped Heading Hierarchy</title>
</head>
<body>
  <h1>Main Topic</h1>
  <h2>Sub Topic A</h2>
  <h4>Skipped Level H4 Direct from H2</h4>
</body>
</html>`,

  'multiple-h1.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Multiple H1 Headings</title>
</head>
<body>
  <h1>First Primary Heading</h1>
  <p>Some content...</p>
  <h1>Second Competing Primary Heading</h1>
</body>
</html>`,

  'missing-h1.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Missing H1 Heading</title>
</head>
<body>
  <h2>First Header is H2</h2>
  <h3>Subsection H3</h3>
</body>
</html>`,

  'missing-lang.html': `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Missing Lang Attribute</title>
</head>
<body>
  <h1>Document without lang attribute on html tag</h1>
</body>
</html>`,

  'valid-lang.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Valid Lang Attribute</title>
</head>
<body>
  <h1>Document with lang="en"</h1>
</body>
</html>`,

  'complete-mobile-viewport.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile Responsive Viewport</title>
</head>
<body>
  <h1>Responsive page with proper viewport tag</h1>
</body>
</html>`,

  'missing-mobile-viewport.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Non-Responsive Page</title>
</head>
<body>
  <h1>Page missing viewport meta tag</h1>
</body>
</html>`
};

for (const [filename, content] of Object.entries(seoFixtures)) {
  fs.writeFileSync(path.join(seoDir, filename), content.trim());
}

// --- NETWORK FIXTURES ---
const networkFixtures: Record<string, string> = {
  'robots-200.txt': `User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /public/
Sitemap: https://example.com/sitemap.xml
`,

  'robots-invalid.html': `<!DOCTYPE html>
<html>
<head><title>404 HTML Page</title></head>
<body><h1>Page Not Found in HTML</h1></body>
</html>`,

  'sitemap-200-valid.xml': `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-01-01</lastmod>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2026-01-02</lastmod>
  </url>
</urlset>`,

  'sitemap-200-invalid.xml': `<?xml version="1.0" encoding="UTF-8"?>
<malformed-sitemap>
  <unclosed-loc>https://example.com/broken
</malformed-sitemap>`
};

for (const [filename, content] of Object.entries(networkFixtures)) {
  fs.writeFileSync(path.join(networkDir, filename), content.trim());
}

// --- DYNAMIC & SPA FIXTURES ---
const dynamicFixtures: Record<string, string> = {
  'spa-delayed-metadata.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Initial HTML lacks title, meta description, canonical, OG, and JSON-LD -->
</head>
<body>
  <div id="root">Loading application...</div>
  <script>
    // Client-side JavaScript injects SEO metadata dynamically after mounting
    setTimeout(() => {
      document.title = "Rendered Dynamic SPA Page Title";
      
      const metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      metaDesc.content = "Dynamically injected client-side meta description for rendered DOM validation.";
      document.head.appendChild(metaDesc);

      const canonical = document.createElement('link');
      canonical.rel = "canonical";
      canonical.href = "https://example.com/spa-rendered-route";
      document.head.appendChild(canonical);

      const ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.content = "Rendered OG Title";
      document.head.appendChild(ogTitle);

      const ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      ogDesc.content = "Rendered OG Description";
      document.head.appendChild(ogDesc);

      const ogType = document.createElement('meta');
      ogType.setAttribute('property', 'og:type');
      ogType.content = "website";
      document.head.appendChild(ogType);

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SinglePageApplication",
        "name": "Dynamic SPA"
      });
      document.head.appendChild(script);

      const root = document.getElementById('root');
      root.innerHTML = "<h1>Rendered Dynamic SPA Heading</h1><p>Content successfully mounted.</p>";
    }, 50);
  </script>
</body>
</html>`,

  'spa-routes.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPA Router Root</title>
</head>
<body>
  <nav>
    <a href="#/">Home</a>
    <a href="#/about">About</a>
    <a href="#/products">Products</a>
    <a href="#/contact">Contact</a>
  </nav>
  <main id="view">
    <h1>Welcome Home</h1>
  </main>
  <script>
    function updateRoute() {
      const hash = window.location.hash || '#/';
      const view = document.getElementById('view');
      if (hash === '#/about') {
        document.title = "About Us - SPA";
        view.innerHTML = "<h1>About Our Company</h1>";
      } else if (hash === '#/products') {
        document.title = "Products Catalog - SPA";
        view.innerHTML = "<h1>Our Products</h1>";
      } else if (hash === '#/contact') {
        document.title = "Contact Us - SPA";
        view.innerHTML = "<h1>Get In Touch</h1>";
      } else {
        document.title = "SPA Router Root";
        view.innerHTML = "<h1>Welcome Home</h1>";
      }
    }
    window.addEventListener('hashchange', updateRoute);
    updateRoute();
  </script>
</body>
</html>`,

  'performance-heavy.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Heavy Performance Benchmark Target</title>
  <style>
    body { font-family: sans-serif; }
    .block { height: 100px; margin: 10px; background: #eee; }
  </style>
</head>
<body>
  <h1>Heavy Asset Test</h1>
  <div id="content"></div>
  <script>
    // Simulate long task main-thread work
    const start = performance.now();
    while (performance.now() - start < 80) {}
    
    // Simulate DOM generation
    const cont = document.getElementById('content');
    for (let i = 0; i < 50; i++) {
      const d = document.createElement('div');
      d.className = 'block';
      d.textContent = 'Block ' + i;
      cont.appendChild(d);
    }
  </script>
</body>
</html>`,

  'malformed-edge-cases.html': `<!DOCTYPE html>
<html lang="en">
<!-- Notice missing <head> tag and unclosed elements -->
<title>Unwrapped Title Element
<meta name="description" content="Page with malformed HTML structure to verify parser resilience.">
<link rel="canonical" href="https://example.com/edge-case">
<body>
  <div>
    <h1>Heading inside unclosed div
    <p>Paragraph text without closing tag
</body>`
};

for (const [filename, content] of Object.entries(dynamicFixtures)) {
  fs.writeFileSync(path.join(dynamicDir, filename), content.trim());
}

console.log('Successfully generated all test fixtures in', fixturesRoot);
