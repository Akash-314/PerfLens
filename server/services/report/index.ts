import PDFDocument from 'pdfkit';
import { IReport } from '../../models/Report.js';
import { OpenGraphPropertyCheck } from '../seoAnalyzer/types.js';

class PdfService {
  /**
   * Compile a report into a PDF document buffer
   * @param {IReport} report - Mongoose Report document
   * @returns {Promise<Buffer>} - Compiled PDF buffer
   */
  generateReportPdf(report: IReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        // Collect document streams
        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: any) => reject(err));

        // Styling constants
        const primaryColor = '#3B82F6';
        const darkColor = '#09090B';
        const grayColor = '#71717A';
        const lightGray = '#27272A';

        // --- PAGE 1: TITLE & CORE SCORES ---
        // Brand logo
        doc.fillColor(primaryColor)
           .fontSize(24)
           .font('Helvetica-Bold')
           .text('PerfLens', 50, 50);

        doc.fillColor(grayColor)
           .fontSize(10)
           .font('Helvetica')
           .text('FRONTEND PERFORMANCE REPORT', 50, 78);

        // Horizontal border line
        doc.strokeColor(lightGray)
           .lineWidth(1)
           .moveTo(50, 95)
           .lineTo(545, 95)
           .stroke();

        // Target URL
        doc.fillColor(darkColor)
           .fontSize(18)
           .font('Helvetica-Bold')
           .text(report.url, 50, 120);

        doc.fillColor(grayColor)
           .fontSize(9)
           .font('Helvetica')
           .text(`Executed on: ${report.createdAt ? new Date(report.createdAt).toLocaleString() : new Date().toLocaleString()} • PerfLens Engine v${report.version || '2.0'}`, 50, 140);

        // Core score cards grid
        doc.fillColor(darkColor)
           .fontSize(13)
           .font('Helvetica-Bold')
           .text('Summary Scores', 50, 180);

        const cardWidth = 110;
        const cardHeight = 60;
        const startY = 205;

        const scoreCards = [
          { label: 'Overall', val: report.scores?.overall ?? 0 },
          { label: 'Performance', val: report.scores?.performance ?? 0 },
          { label: 'Accessibility', val: report.scores?.accessibility ?? 0 },
          { label: 'SEO Health', val: report.scores?.seo ?? 0 }
        ];

        scoreCards.forEach((c, idx) => {
          const startX = 50 + idx * (cardWidth + 15);
          
          // Draw card outline box
          doc.rect(startX, startY, cardWidth, cardHeight)
             .strokeColor(lightGray)
             .lineWidth(1)
             .stroke();

          // Card contents
          doc.fillColor(grayColor)
             .fontSize(8)
             .font('Helvetica')
             .text(c.label.toUpperCase(), startX + 10, startY + 12);

          const scoreColor = c.val >= 90 ? '#22C55E' : c.val >= 70 ? '#F59E0B' : '#EF4444';
          doc.fillColor(scoreColor)
             .fontSize(18)
             .font('Courier-Bold')
             .text(`${c.val}`, startX + 10, startY + 28);
        });

        // Core Web Vitals Section
        const isPageSpeed = report.provenance?.primaryEngine === 'pagespeed' || !!report.pageSpeed;
        const cwvTitle = isPageSpeed
          ? 'Core Web Vitals — Google PageSpeed / CrUX Telemetry'
          : 'Core Web Vitals — PerfLens Lab Measurement';
        
        doc.fillColor(darkColor)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text(cwvTitle, 50, 272);
        
        doc.fillColor('#6B7280')
           .fontSize(8)
           .font('Helvetica')
           .text('Thresholds based on Google/web.dev guidance', 50, 285);

        const cwvItems = [
          { 
            name: 'Largest Contentful Paint (LCP)', 
            val: report.vitals?.lcp?.value ?? 'N/A', 
            rating: report.vitals?.lcp?.rating ?? 'unrated',
            source: report.vitals?.lcp?.source || 'lighthouse',
            mode: report.vitals?.lcp?.mode || 'lab'
          },
          { 
            name: 'Cumulative Layout Shift (CLS)', 
            val: report.vitals?.cls?.value ?? 'N/A', 
            rating: report.vitals?.cls?.rating ?? 'unrated',
            source: report.vitals?.cls?.source || 'lighthouse',
            mode: report.vitals?.cls?.mode || 'lab'
          },
          { 
            name: 'Interaction to Next Paint (INP)', 
            val: (report.vitals?.inp?.available && report.vitals.inp.value && report.vitals.inp.value !== 'N/A')
              ? report.vitals.inp.value
              : (report.pageSpeed?.metrics?.inp || 'Not measured'), 
            rating: report.vitals?.inp?.rating ?? 'unrated',
            source: report.vitals?.inp?.source || (report.pageSpeed?.metrics?.inp ? 'crux' : 'lab'),
            mode: report.vitals?.inp?.mode || (report.pageSpeed?.metrics?.inp ? 'field' : 'lab')
          }
        ];

        cwvItems.forEach((v, idx) => {
          const itemY = 300 + idx * 20;

          doc.fillColor(darkColor)
             .fontSize(9.5)
             .font('Helvetica')
             .text(v.name, 50, itemY);

          const isNotMeasured = v.val === 'Not measured' || v.val === 'N/A';
          const ratingColor = isNotMeasured ? '#6B7280' : v.rating === 'good' ? '#22C55E' : v.rating === 'needs-improvement' ? '#F59E0B' : v.rating === 'poor' ? '#EF4444' : '#6B7280';
          const valDisplay = isNotMeasured ? 'Not measured (—)' : `${v.val} [${v.mode.toUpperCase()}] (${String(v.rating).toUpperCase()})`;

          doc.fillColor(ratingColor)
             .fontSize(9.5)
             .font('Courier-Bold')
             .text(valDisplay, 340, itemY);
        });

        // Other Performance Metrics Section
        doc.fillColor(darkColor)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('Other Performance Metrics (Lab Diagnostics)', 50, 368);

        const otherMetrics = [
          { 
            name: 'First Contentful Paint (FCP)', 
            val: report.vitals?.fcp?.value ?? 'N/A', 
            rating: report.vitals?.fcp?.rating ?? 'unrated',
            source: report.vitals?.fcp?.source || 'lighthouse',
            mode: report.vitals?.fcp?.mode || 'lab',
            evidence: report.vitals?.fcp?.source === 'puppeteer'
              ? 'Source: Navigation Timing API / Paint Timing API'
              : 'Source: Google Lighthouse lab audit (first paint)'
          },
          { 
            name: 'Total Blocking Time (TBT)', 
            val: report.vitals?.tbt?.value ?? 'N/A', 
            rating: report.vitals?.tbt?.rating ?? 'unrated',
            source: report.vitals?.tbt?.source || 'lighthouse',
            mode: report.vitals?.tbt?.mode || 'lab',
            evidence: report.vitals?.tbt?.source === 'lighthouse'
              ? 'Source: Google Lighthouse lab audit'
              : 'Source: Measured in lab'
          },
          { 
            name: 'Time to First Byte (TTFB)', 
            val: report.vitals?.ttfb?.value ?? 'N/A', 
            rating: report.vitals?.ttfb?.rating ?? 'unrated',
            source: report.vitals?.ttfb?.source || 'lighthouse',
            mode: report.vitals?.ttfb?.mode || 'lab',
            evidence: report.vitals?.ttfb?.source === 'puppeteer'
              ? 'Source: Navigation Timing API (Measured in lab)'
              : 'Source: Google Lighthouse lab audit (server-response-time)'
          }
        ];

        otherMetrics.forEach((v, idx) => {
          const itemY = 388 + idx * 30;

          doc.fillColor(darkColor)
             .fontSize(9.5)
             .font('Helvetica')
             .text(v.name, 50, itemY);

          const ratingColor = v.rating === 'good' ? '#22C55E' : v.rating === 'needs-improvement' ? '#F59E0B' : v.rating === 'poor' ? '#EF4444' : '#6B7280';
          doc.fillColor(ratingColor)
             .fontSize(9.5)
             .font('Courier-Bold')
             .text(`${v.val} [${v.mode.toUpperCase()}] (${String(v.rating).toUpperCase()})`, 340, itemY);

          doc.fillColor('#6B7280')
             .fontSize(7.5)
             .font('Helvetica')
             .text(v.evidence, 50, itemY + 12);
        });

        // Resource payload breakdown
        doc.fillColor(darkColor)
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('Resource Payload Size Breakdown', 50, 490);

        const breakdownItems = [
          { label: 'Scripts (JS)', val: `${report.breakdown?.js?.sizeKb ?? 0} KB (${report.breakdown?.js?.count ?? 0} files)` },
          { label: 'Stylesheets (CSS)', val: `${report.breakdown?.css?.sizeKb ?? 0} KB (${report.breakdown?.css?.count ?? 0} files)` },
          { label: 'Images', val: `${report.breakdown?.images?.sizeKb ?? 0} KB (${report.breakdown?.images?.count ?? 0} files)` },
          { label: 'Fonts', val: `${report.breakdown?.fonts?.sizeKb ?? 0} KB (${report.breakdown?.fonts?.count ?? 0} files)` }
        ];

        breakdownItems.forEach((b, idx) => {
          const itemY = 515 + idx * 22;
          doc.fillColor(darkColor)
             .fontSize(9.5)
             .font('Helvetica')
             .text(b.label, 50, itemY);

          doc.fillColor(grayColor)
             .fontSize(9.5)
             .font('Helvetica')
             .text(b.val, 380, itemY);
        });

        // --- PAGE 2: PERFORMANCE SCORE EXPLAINABILITY & AUDIT TRAIL ---
        const scoreDetails = report.scoreExplanation || report.performanceScoreDetails;
        if (scoreDetails && Array.isArray(scoreDetails.breakdown) && scoreDetails.breakdown.length > 0) {
          doc.addPage();

          doc.fillColor(darkColor)
             .fontSize(14)
             .font('Helvetica-Bold')
             .text('Performance Score Explainability & Audit Trail', 50, 50);

          doc.strokeColor(lightGray)
             .lineWidth(1)
             .moveTo(50, 68)
             .lineTo(545, 68)
             .stroke();

          const methodText = scoreDetails.method || 'PerfLens Weighted Performance Score';
          const formulaText = scoreDetails.formula && scoreDetails.formula.includes('SI')
            ? 'Performance Score = (Normalized LCP Score × 25%) + (Normalized TBT Score × 30%) + (Normalized CLS Score × 25%) + (Normalized FCP Score × 10%) + (Normalized Speed Index Score × 10%)'
            : (scoreDetails.formula || 'Performance Score = Σ(Normalized Metric Score × weight) / Σ(includedWeights)');

          doc.fillColor(grayColor)
             .fontSize(8.5)
             .font('Helvetica')
             .text(`Auditing Methodology: ${methodText}`, 50, 78);

          const formulaStartY = 90;
          doc.fillColor(grayColor)
             .fontSize(7.5)
             .font('Helvetica')
             .text(`Scoring Formula: ${formulaText}`, 50, formulaStartY, { width: 495 });

          const formulaHeight = doc.heightOfString(`Scoring Formula: ${formulaText}`, { width: 495 });
          const noteY = formulaStartY + formulaHeight + 4;

          doc.fillColor('#6B7280')
             .fontSize(7)
             .font('Helvetica-Oblique')
             .text('Calculated from normalized metric scores (0–100) using the configured metric weights.', 50, noteY, { width: 495 });

          const noteHeight = doc.heightOfString('Calculated from normalized metric scores (0–100) using the configured metric weights.', { width: 495 });
          const tableStartY = Math.round(noteY + noteHeight + 8);
          doc.rect(50, tableStartY, 495, 20)
             .fillColor('#F3F4F6')
             .fill();

          doc.fillColor(darkColor)
             .fontSize(8)
             .font('Helvetica-Bold')
             .text('METRIC', 55, tableStartY + 6)
             .text('RAW VALUE', 185, tableStartY + 6)
             .text('RATING', 270, tableStartY + 6)
             .text('WEIGHT', 345, tableStartY + 6)
             .text('SCORE', 410, tableStartY + 6)
             .text('CONTRIBUTION', 470, tableStartY + 6);

          let rowY = tableStartY + 24;
          scoreDetails.breakdown.forEach((row: any) => {
            const ratingColor = row.classification === 'good' ? '#15803D' : row.classification === 'needs-improvement' ? '#B45309' : row.classification === 'poor' ? '#B91C1C' : '#6B7280';
            const weightStr = row.weightFormatted || (typeof row.weight === 'number' ? `${Math.round(row.weight * 100)}%` : '0%');
            const scoreStr = row.score != null ? String(row.score) : '—';
            const contribStr = row.contribution != null ? `+${row.contribution}` : (row.available === false ? 'Excluded' : '0');

            doc.fillColor(darkColor)
               .fontSize(8)
               .font('Helvetica')
               .text(row.metric || row.name, 55, rowY, { width: 125, ellipsis: true });

            doc.fillColor('#374151')
               .fontSize(8)
               .font('Courier')
               .text(String(row.raw || '—'), 185, rowY, { width: 80, ellipsis: true });

            doc.fillColor(ratingColor)
               .fontSize(8)
               .font('Helvetica-Bold')
               .text(String(row.classification || 'unrated').toUpperCase(), 270, rowY);

            doc.fillColor('#374151')
               .fontSize(8)
               .font('Courier')
               .text(weightStr, 345, rowY);

            doc.fillColor('#374151')
               .fontSize(8)
               .font('Courier')
               .text(scoreStr, 410, rowY);

            doc.fillColor(row.contribution != null ? '#1D4ED8' : '#6B7280')
               .fontSize(8)
               .font('Courier-Bold')
               .text(contribStr, 470, rowY);

            rowY += 16;
          });

          // Table summary line
          doc.strokeColor(lightGray)
             .lineWidth(1)
             .moveTo(50, rowY + 4)
             .lineTo(545, rowY + 4)
             .stroke();

          const finalScore = scoreDetails.overallPerformanceScore ?? report.scores?.performance ?? 0;
          doc.fillColor(darkColor)
             .fontSize(9)
             .font('Helvetica-Bold')
             .text('Authoritative Performance Score:', 55, rowY + 10)
             .font('Courier-Bold')
             .fillColor(finalScore >= 90 ? '#15803D' : finalScore >= 50 ? '#B45309' : '#B91C1C')
             .text(`${finalScore} / 100`, 470, rowY + 10);

          const ttfbObj = report.vitals?.ttfb;
          const ttfbSource = ttfbObj?.source === 'puppeteer'
            ? 'Measured in lab (Navigation Timing API)'
            : 'Measured in lab (Google Lighthouse)';

          const tbtObj = report.vitals?.tbt;
          const tbtSource = tbtObj?.source === 'lighthouse'
            ? 'Measured in lab (Google Lighthouse simulated audit)'
            : 'Measured in lab (Browser observer)';

          doc.fillColor('#6B7280')
             .fontSize(8)
             .font('Helvetica')
             .text(`* TTFB Source: ${ttfbSource}`, 55, rowY + 26, { width: 485 })
             .text(`* TBT Source: ${tbtSource}`, 55, rowY + 38, { width: 485 });
        }

        // --- PAGE 3: SEO & METADATA AUDIT ---
        const seoData = report.seo?.seo || {};
        if (seoData && (seoData.pageTitle || seoData.metaDescription || seoData.canonicalUrl || seoData.detectedFramework)) {
          doc.addPage();

          const seoScore = report.seo?.summary?.seoScoreEstimate ?? 0;
          const scoreBadgeColor = seoScore >= 80 ? '#15803D' : seoScore >= 60 ? '#B45309' : '#B91C1C';
          const scoreExplanation = report.seo?.summary?.scoreExplanation || seoData.seoScoreExplanation;

          doc.fillColor(darkColor)
             .fontSize(15)
             .font('Helvetica-Bold')
             .text('SEO & Rendered Metadata Audit', 50, 50);

          doc.fillColor(scoreBadgeColor)
             .fontSize(13)
             .font('Helvetica-Bold')
             .text(`SEO Health: ${seoScore} / 100`, 400, 50, { width: 145, align: 'right' });

          doc.strokeColor(lightGray)
             .lineWidth(1)
             .moveTo(50, 70)
             .lineTo(545, 70)
             .stroke();

          let seoY = 85;

          // Framework banner if detected
          if (seoData.detectedFramework && seoData.detectedFramework.name) {
            doc.rect(50, seoY, 495, 26)
               .fillColor('#F3F4F6')
               .fill();

            doc.fillColor(primaryColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text(`VERIFIED FRAMEWORK: ${seoData.detectedFramework.name}`, 60, seoY + 8, { continued: true })
               .font('Helvetica')
               .fillColor(grayColor)
               .text(` — Evidence: ${seoData.detectedFramework.evidence || 'DOM signals'}`);

            seoY += 36;
          }

          // SEO Checklist
          const isRobotsTxtPass = !seoData.robotsTxtDetails || seoData.robotsTxtDetails.status === 'verified_exists' || seoData.robotsTxtDetails.status === 'missing' || (seoData.robotsTxtDetails as any).status === 'exists';
          const isSitemapPass = !seoData.sitemapXmlDetails || seoData.sitemapXmlDetails.status === 'verified_exists' || seoData.sitemapXmlDetails.status === 'missing' || seoData.sitemapXmlDetails.status === 'access_blocked' || (seoData.sitemapXmlDetails as any).status === 'exists';
          const h1Count = seoData.headingsHierarchy?.h1Count ?? 0;

          // Format Structured Data status accurately
          let structDataVal = 'No JSON-LD structured data detected on rendered page';
          let structDataPass = true;
          const structData = seoData.structuredDataDetails;
          if (structData) {
            if (structData.status === 'NOT_DETECTED') {
              structDataVal = 'No JSON-LD structured data detected on rendered page';
              structDataPass = true;
            } else if (structData.status === 'VALID') {
              structDataVal = `Detected (${structData.validCount} valid schema${structData.validCount === 1 ? '' : 's'}${structData.schemaTypes?.length > 0 ? ': ' + structData.schemaTypes.join(', ') : ''})`;
              structDataPass = true;
            } else if (structData.status === 'INVALID') {
              structDataVal = `Invalid JSON-LD syntax (${structData.syntaxErrors?.[0]?.error || 'Malformed JSON'})`;
              structDataPass = false;
            } else if (structData.status === 'PARTIALLY_VALID') {
              structDataVal = `Partially valid (${structData.validCount} valid, ${structData.syntaxErrors?.length} syntax error(s))`;
              structDataPass = false;
            }
          } else if (seoData.structuredData && Array.isArray(seoData.structuredData) && seoData.structuredData.length > 0) {
            structDataVal = `Detected (${seoData.structuredData.length} schema block(s))`;
          }

          // Format Sitemap Probe accurately
          let sitemapVal = 'Not checked';
          if (seoData.sitemapXmlDetails) {
            if (seoData.sitemapXmlDetails.status === 'access_blocked') {
              sitemapVal = 'Access blocked (HTTP 403) — Verify crawler access rules';
            } else if (seoData.sitemapXmlDetails.status === 'verified_exists') {
              sitemapVal = 'Valid XML sitemap discovered (HTTP 200)';
            } else if (seoData.sitemapXmlDetails.status === 'missing') {
              sitemapVal = 'Not found (HTTP 404)';
            } else {
              sitemapVal = `Status: ${seoData.sitemapXmlDetails.status}`;
            }
          }

          const checkItems = [
            { label: 'Document Title', val: seoData.pageTitle ? `"${seoData.pageTitle}" (${seoData.pageTitle.length} chars)` : 'Missing in rendered DOM', pass: !!seoData.pageTitle },
            { label: 'Meta Description', val: seoData.metaDescription ? `"${seoData.metaDescription}" (${seoData.metaDescription.length} chars)` : 'Missing in rendered head', pass: !!seoData.metaDescription },
            { label: 'Canonical Link', val: seoData.canonicalDetails?.url ? `${seoData.canonicalDetails.url} [${seoData.canonicalDetails.canonicalState || seoData.canonicalDetails.status}]` : (seoData.canonicalUrl || 'Missing in rendered head'), pass: seoData.canonicalDetails?.status === 'valid' || seoData.canonicalDetails?.canonicalState === 'PRESENT_VALID' },
            { label: 'Robots Directives', val: seoData.robotsMeta?.content || (seoData.robotsMeta?.noindex ? 'noindex' : 'index, follow (default)'), pass: !seoData.robotsMeta?.noindex },
            { label: 'robots.txt Probe', val: seoData.robotsTxtDetails?.status ? `Status: ${seoData.robotsTxtDetails.status}` : 'Not checked', pass: isRobotsTxtPass },
            { label: 'sitemap.xml Probe', val: sitemapVal, pass: isSitemapPass },
            { label: 'Primary H1 Heading', val: seoData.headingsHierarchy?.h1?.[0] ? `"${seoData.headingsHierarchy.h1[0]}" (${h1Count} declared)` : 'No H1 found', pass: h1Count >= 1 },
            { label: 'Heading Hierarchy', val: seoData.headingsHierarchy?.isHierarchyValid ? 'Sequential (No skipped levels)' : `Skipped levels: ${seoData.headingsHierarchy?.skippedLevels?.length ?? 0}`, pass: !!seoData.headingsHierarchy?.isHierarchyValid },
            { label: 'Structured Data', val: structDataVal, pass: structDataPass }
          ];

          checkItems.forEach(item => {
            const statusColor = item.pass ? '#15803D' : '#B45309';
            doc.fillColor(darkColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text(item.label, 50, seoY, { width: 130 });

            doc.fillColor(statusColor)
               .font('Helvetica')
               .text(item.val, 185, seoY, { width: 360 });

            seoY += 21;
          });

          // Format OpenGraph Social item-level status cleanly and safely without control characters
          doc.fillColor(darkColor)
             .fontSize(8.5)
             .font('Helvetica-Bold')
             .text('OpenGraph Social', 50, seoY, { width: 130 });

          const og = seoData.openGraph;
          const ogProps: OpenGraphPropertyCheck[] = (og && Array.isArray(og.properties) && og.properties.length > 0)
            ? og.properties
            : (og ? ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(tag => ({
                property: tag,
                present: Boolean((og as any)[tag.replace('og:', '')] || (og as any)[tag]),
                value: (og as any)[tag.replace('og:', '')] || (og as any)[tag] || null
              })) : []);

          if (og && ogProps.length > 0) {
            const present = og.presentCount ?? ogProps.filter((p: OpenGraphPropertyCheck) => p.present).length;
            const total = og.totalCount ?? ogProps.length;
            const coverage = og.coveragePercentage ?? Math.round((present / total) * 100);

            let ogLineY = seoY;
            ogProps.forEach((p: OpenGraphPropertyCheck) => {
              const isPresent = Boolean(p.present);
              // In ZapfDingbats (Standard PDF Type 1 font): '4' is heavy checkmark (✓), '8' is heavy cross (✗).
              // ASCII 0x34 and 0x38 are standard printable characters, producing ZERO control characters in the PDF stream.
              const symCode = isPresent ? '4' : '8';
              const symColor = isPresent ? '#15803D' : '#DC2626';
              const propName = p.property.startsWith('og:') ? p.property : `og:${p.property}`;

              doc.font('ZapfDingbats')
                 .fontSize(8.5)
                 .fillColor(symColor)
                 .text(symCode, 185, ogLineY);

              doc.font('Helvetica')
                 .fontSize(8.5)
                 .fillColor(darkColor)
                 .text(propName, 197, ogLineY);

              ogLineY += 13;
            });

            ogLineY += 3;
            const summaryColor = coverage >= 50 ? '#15803D' : '#B45309';
            doc.font('Helvetica-Bold')
               .fontSize(8.5)
               .fillColor(summaryColor)
               .text(`${present}/${total} present (${coverage}%)`, 185, ogLineY);

            seoY = ogLineY + 20;
          } else {
            doc.fillColor('#B45309')
               .font('Helvetica')
               .text('Not configured', 185, seoY, { width: 360 });
            seoY += 21;
          }

          // Explainable SEO Score Breakdown
          if (scoreExplanation && scoreExplanation.breakdown && scoreExplanation.breakdown.length > 0) {
            seoY += 8;
            doc.strokeColor(lightGray).lineWidth(0.5).moveTo(50, seoY).lineTo(545, seoY).stroke();
            seoY += 8;

            doc.fillColor(darkColor)
               .fontSize(9)
               .font('Helvetica-Bold')
               .text('SEO Health Score Contribution Breakdown:', 50, seoY);
            seoY += 14;

            scoreExplanation.breakdown.forEach((bItem: any) => {
              const itemPass = bItem.score === bItem.maxScore;
              const isBlocked = bItem.status === 'ACCESS_BLOCKED' || bItem.status === 'UNABLE_TO_VERIFY';
              const bColor = isBlocked ? '#2563EB' : itemPass ? '#15803D' : bItem.score > 0 ? '#B45309' : '#B91C1C';
              const icon = isBlocked ? 'ℹ' : itemPass ? '✓' : bItem.score > 0 ? '⚠' : '✗';

              doc.fillColor(darkColor)
                 .fontSize(7.8)
                 .font('Helvetica-Bold')
                 .text(`${bItem.name}:`, 50, seoY, { width: 130 });

              doc.fillColor(bColor)
                 .font('Helvetica')
                 .text(`${icon} ${bItem.score}/${bItem.maxScore} pts — ${bItem.explanation}`, 185, seoY, { width: 360 });

              seoY += 14;
            });
          }
        }

        // --- RECOMMENDATIONS PAGE ---
        doc.addPage();

        doc.fillColor(darkColor)
           .fontSize(15)
           .font('Helvetica-Bold')
           .text('Actionable Optimization Recommendations', 50, 50);

        doc.strokeColor(lightGray)
           .lineWidth(1)
           .moveTo(50, 70)
           .lineTo(545, 70)
           .stroke();

        let recY = 90;
        (report.recommendations || []).forEach((rec: any, idx: number) => {
          if (recY > 600) {
            doc.addPage();
            recY = 50;
          }

          const severityStr = String(rec.severity || rec.priority || 'medium').toUpperCase();
          const badgeColor = severityStr === 'HIGH' || severityStr === 'CRITICAL' ? '#EF4444' : severityStr === 'MEDIUM' ? '#F59E0B' : '#22C55E';
          
          // Badge: Severity & Category
          doc.fillColor(badgeColor)
             .fontSize(8)
             .font('Helvetica-Bold')
             .text(`${severityStr} • ${String(rec.category || 'performance').toUpperCase()}`, 50, recY + 2);

          // Confidence label
          const isVerified = rec.standardFinding?.confidence === 'verified' || rec.confidence === 'high';
          const confStr = isVerified ? 'EVIDENCE: VERIFIED' : `CONFIDENCE: ${String(rec.confidence || 'HIGH').toUpperCase()}`;
          doc.fillColor(isVerified ? '#15803D' : grayColor)
             .fontSize(7.5)
             .font('Helvetica-Bold')
             .text(confStr, 440, recY + 2, { align: 'right' });

          // Title
          doc.fillColor(darkColor)
             .fontSize(10.5)
             .font('Helvetica-Bold')
             .text(`${idx + 1}. ${rec.title || rec.issue}`, 50, recY + 16, { width: 495 });

          let currentY = recY + 30;

          // Finding (What is wrong?)
          const problemText = rec.standardFinding?.explanation?.problem || rec.finding?.description;
          if (problemText) {
            doc.fillColor(darkColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text('What Is Wrong: ', 50, currentY, { continued: true })
               .font('Helvetica')
               .fillColor(grayColor)
               .text(problemText, { width: 495 });
            currentY += doc.heightOfString(`What Is Wrong: ${problemText}`, { width: 495 }) + 3;
          }

          // Evidence summary (What PerfLens found)
          let evidenceSummary = rec.standardFinding?.explanation?.observedEvidence || '';
          if (!evidenceSummary) {
            if (typeof rec.evidence === 'string' && rec.evidence.trim().length > 0) {
              evidenceSummary = rec.evidence.trim();
            } else {
              const evidenceList = Array.isArray(rec.evidenceDetails) && rec.evidenceDetails.length > 0
                ? rec.evidenceDetails
                : (Array.isArray(rec.evidence) ? rec.evidence : []);
              if (evidenceList.length > 0) {
                evidenceSummary = evidenceList.slice(0, 3).map((e: any) => {
                  let res = e.resource || e.selector || '';
                  if (typeof res === 'string' && res.length > 70) {
                    res = res.slice(0, 55) + '...[' + res.slice(-10) + ']';
                  }
                  const dur = e.duration ? ` [${e.duration}ms]` : '';
                  const sz = e.sizeKb ? ` [${e.sizeKb}KB]` : '';
                  return `${res ? `${res}` : e.type}${dur}${sz}`;
                }).join(' | ');
              }
            }
          }
          if (evidenceSummary) {
            if (evidenceSummary.length > 250) {
              evidenceSummary = evidenceSummary.slice(0, 240) + '...';
            }
            doc.fillColor(darkColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text('Evidence Found: ', 50, currentY, { continued: true })
               .font('Helvetica')
               .fillColor(grayColor)
               .text(evidenceSummary, { width: 495 });
            currentY += doc.heightOfString(`Evidence Found: ${evidenceSummary}`, { width: 495 }) + 3;
          }

          // Potential Impact (Why it matters)
          const impactText = rec.standardFinding?.explanation?.whyItMatters || rec.potentialImpact || rec.whyItMatters || '';
          if (impactText) {
            doc.fillColor(darkColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text('Why It Matters: ', 50, currentY, { continued: true })
               .font('Helvetica')
               .fillColor(grayColor)
               .text(impactText, { width: 495 });
            currentY += doc.heightOfString(`Why It Matters: ${impactText}`, { width: 495 }) + 3;
          }

          // Fix Strategy / Recommended Action
          const actionText = rec.standardFinding?.fixStrategy || rec.suggestedFix || '';
          if (actionText) {
            doc.fillColor(darkColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text('Fix Strategy: ', 50, currentY, { continued: true })
               .font('Helvetica')
               .fillColor(grayColor)
               .text(actionText, { width: 495 });
            currentY += doc.heightOfString(`Fix Strategy: ${actionText}`, { width: 495 }) + 3;
          }

          // Validation steps if present
          const validationSteps: string[] = rec.standardFinding?.validationSteps || rec.validationSteps || [];
          if (validationSteps.length > 0) {
            doc.fillColor(darkColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text('Validation Steps: ', 50, currentY, { continued: true })
               .font('Helvetica')
               .fillColor(grayColor)
               .text(validationSteps.slice(0, 2).join(' • '), { width: 495 });
            currentY += doc.heightOfString(`Validation Steps: ${validationSteps.slice(0, 2).join(' • ')}`, { width: 495 }) + 3;
          }

          // AI Fix Prompt Note
          if (rec.aiFixPrompt || rec.standardFinding?.aiFixPrompt) {
            doc.fillColor('#7C3AED')
               .fontSize(7.5)
               .font('Helvetica-Bold')
               .text('AI Prompt: Ready to copy into Cursor / Antigravity / Claude Code via web dashboard.', 50, currentY);
            currentY += 10;
          }

          recY = currentY + 8;
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default new PdfService();
export * from './report.service.js';
export * from './helpers.js';
export * from './types.js';
