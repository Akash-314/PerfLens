import PDFDocument from 'pdfkit';
import { IReport } from '../../models/Report.js';

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
          { label: 'SEO Tag Index', val: report.scores?.seo ?? 0 }
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
            val: report.vitals?.inp?.value ?? (report.pageSpeed?.metrics?.inp || 'N/A'), 
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

          const ratingColor = v.rating === 'good' ? '#22C55E' : v.rating === 'needs-improvement' ? '#F59E0B' : v.rating === 'poor' ? '#EF4444' : '#6B7280';
          doc.fillColor(ratingColor)
             .fontSize(9.5)
             .font('Courier-Bold')
             .text(`${v.val} [${v.mode.toUpperCase()}] (${String(v.rating).toUpperCase()})`, 340, itemY);
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
            evidence: (() => {
              const tbtDet = report.vitals?.tbtDetails;
              const tbtSrc = report.vitals?.tbt?.source === 'lighthouse' ? 'Google Lighthouse lab audit' : 'Puppeteer browser observer';
              const taskInfo = tbtDet && tbtDet.longTaskCount > 0 
                ? `${tbtDet.longTaskCount} long task(s), max: ${tbtDet.maxTaskDurationMs}ms`
                : 'task attribution from audit';
              return `Source: ${tbtSrc} (${taskInfo})`;
            })()
          },
          { 
            name: 'Time to First Byte (TTFB)', 
            val: report.vitals?.ttfb?.value ?? 'N/A', 
            rating: report.vitals?.ttfb?.rating ?? 'unrated',
            source: report.vitals?.ttfb?.source || 'lighthouse',
            mode: report.vitals?.ttfb?.mode || 'lab',
            evidence: report.vitals?.ttfb?.source === 'puppeteer'
              ? `Source: Navigation Timing API (responseStart - requestStart = ${report.vitals?.ttfb?.normalizedValueMs ?? report.vitals?.ttfb?.rawValue ?? 0}ms)`
              : `Source: Google Lighthouse audit (server-response-time, root document response)`
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
            ? 'Performance Score = (Normalized Metric Score LCP × 0.25) + (Normalized Metric Score TBT × 0.30) + (Normalized Metric Score CLS × 0.25) + (Normalized Metric Score FCP × 0.10) + (Normalized Metric Score SI × 0.10)'
            : 'Performance Score = Σ(Normalized Metric Score × weight) / Σ(includedWeights)';

          doc.fillColor(grayColor)
             .fontSize(8.5)
             .font('Helvetica')
             .text(`Auditing Methodology: ${methodText}`, 50, 78);

          doc.fillColor(grayColor)
             .fontSize(7.5)
             .font('Helvetica')
             .text(`Scoring Formula: ${formulaText}`, 50, 90, { width: 495 });

          doc.fillColor('#6B7280')
             .fontSize(7)
             .font('Helvetica-Oblique')
             .text('Note: Individual metric values are first normalized to 0–100 scores based on web.dev CWV thresholds before applying weights.', 50, 101, { width: 495 });

          // Table Header
          const tableStartY = 116;
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
            const scoreStr = row.score != null ? String(row.score) : 'N/A';
            const contribStr = row.contribution != null ? `+${row.contribution}` : (row.available === false ? 'Excluded' : '0');

            doc.fillColor(darkColor)
               .fontSize(8)
               .font('Helvetica')
               .text(row.metric || row.name, 55, rowY, { width: 125, ellipsis: true });

            doc.fillColor('#374151')
               .fontSize(8)
               .font('Courier')
               .text(String(row.raw || 'N/A'), 185, rowY, { width: 80, ellipsis: true });

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
          const ttfbEvidenceText = ttfbObj?.source === 'puppeteer'
            ? `TTFB Evidence: Measured via Navigation Timing API (responseStart - requestStart = ${ttfbObj.normalizedValueMs ?? ttfbObj.rawValue ?? 0}ms)`
            : `TTFB Evidence: Measured via Google Lighthouse 'server-response-time' audit (root document response = ${ttfbObj?.value || 'N/A'})`;

          const tbtObj = report.vitals?.tbt;
          const tbtDet = report.vitals?.tbtDetails;
          const tbtEvidenceText = tbtObj?.source === 'lighthouse'
            ? `TBT Evidence: Measured via Google Lighthouse simulated 4x CPU throttling (${tbtObj?.value || 'N/A'}; ${tbtDet?.longTaskCount || 0} long task(s) captured)`
            : `TBT Evidence: Measured via Puppeteer browser observer (sum of tasks > 50ms = ${tbtObj?.normalizedValueMs ?? 0}ms)`;

          doc.fillColor('#6B7280')
             .fontSize(7.5)
             .font('Helvetica')
             .text(`* ${ttfbEvidenceText}`, 55, rowY + 26, { width: 485 })
             .text(`* ${tbtEvidenceText}`, 55, rowY + 38, { width: 485 });
        }

        // --- PAGE 3: RECOMMENDATIONS ---
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
          if (recY > 620) {
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
          const confStr = `CONFIDENCE: ${String(rec.confidence || 'HIGH').toUpperCase()}`;
          doc.fillColor(grayColor)
             .fontSize(7.5)
             .font('Helvetica')
             .text(confStr, 440, recY + 2, { align: 'right' });

          // Title
          doc.fillColor(darkColor)
             .fontSize(10.5)
             .font('Helvetica-Bold')
             .text(`${idx + 1}. ${rec.title || rec.issue}`, 50, recY + 16, { width: 495 });

          let currentY = recY + 30;

          // Finding
          if (rec.finding?.description) {
            doc.fillColor(darkColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text('Finding: ', 50, currentY, { continued: true })
               .font('Helvetica')
               .fillColor(grayColor)
               .text(rec.finding.description, { width: 495 });
            currentY += doc.heightOfString(`Finding: ${rec.finding.description}`, { width: 495 }) + 3;
          }

          // Evidence summary
          let evidenceSummary = '';
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
              return `${e.type}${res ? `: ${res}` : ''}${dur}${sz}`;
            }).join(' | ');
          } else if (typeof rec.evidence === 'string') {
            evidenceSummary = rec.evidence;
          }
          if (evidenceSummary) {
            if (evidenceSummary.length > 250) {
              evidenceSummary = evidenceSummary.slice(0, 240) + '...';
            }
            doc.fillColor(darkColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text('Evidence: ', 50, currentY, { continued: true })
               .font('Helvetica')
               .fillColor(grayColor)
               .text(evidenceSummary, { width: 495 });
            currentY += doc.heightOfString(`Evidence: ${evidenceSummary}`, { width: 495 }) + 3;
          }

          // Potential Impact
          const impactText = rec.potentialImpact || rec.whyItMatters || '';
          if (impactText) {
            doc.fillColor(darkColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text('Potential Impact: ', 50, currentY, { continued: true })
               .font('Helvetica')
               .fillColor(grayColor)
               .text(impactText, { width: 495 });
            currentY += doc.heightOfString(`Potential Impact: ${impactText}`, { width: 495 }) + 3;
          }

          // Estimated Savings with Estimate Type
          const estType = String(rec.estimateType || rec.estimatedSavings?.type || 'not_quantified').toUpperCase();
          const estSavingsText = rec.estimatedSavings?.displayString || rec.estimatedImprovement || 'Not quantified';
          const assumptionText = rec.estimatedSavings?.assumption ? ` (Assumption: ${rec.estimatedSavings.assumption})` : '';

          doc.fillColor(primaryColor)
             .fontSize(8.5)
             .font('Helvetica-Bold')
             .text(`Estimated Savings [${estType}]: `, 50, currentY, { continued: true })
             .font('Helvetica')
             .text(`${estSavingsText}${assumptionText}`, { width: 495 });
          currentY += doc.heightOfString(`Estimated Savings [${estType}]: ${estSavingsText}${assumptionText}`, { width: 495 }) + 3;

          // Recommended Action
          const actionText = rec.suggestedFix || '';
          if (actionText) {
            doc.fillColor(darkColor)
               .fontSize(8.5)
               .font('Helvetica-Bold')
               .text('Recommended Action: ', 50, currentY, { continued: true })
               .font('Helvetica')
               .fillColor(grayColor)
               .text(actionText, { width: 495 });
            currentY += doc.heightOfString(`Recommended Action: ${actionText}`, { width: 495 }) + 6;
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
