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
           .text(`Executed on: ${report.createdAt.toLocaleString()}`, 50, 140);

        // Core score cards grid
        doc.fillColor(darkColor)
           .fontSize(13)
           .font('Helvetica-Bold')
           .text('Summary Scores', 50, 180);

        const cardWidth = 110;
        const cardHeight = 60;
        const startY = 205;

        const scoreCards = [
          { label: 'Overall', val: report.scores.overall },
          { label: 'Performance', val: report.scores.performance },
          { label: 'Accessibility', val: report.scores.accessibility },
          { label: 'SEO Tag Index', val: report.scores.seo }
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
        doc.fillColor(darkColor)
           .fontSize(13)
           .font('Helvetica-Bold')
           .text('Core Web Vitals Telemetry', 50, 300);

        const vitalItems = [
          { name: 'Largest Contentful Paint (LCP)', val: report.vitals.lcp.value, rating: report.vitals.lcp.rating },
          { name: 'First Contentful Paint (FCP)', val: report.vitals.fcp.value, rating: report.vitals.fcp.rating },
          { name: 'Cumulative Layout Shift (CLS)', val: report.vitals.cls.value, rating: report.vitals.cls.rating },
          { name: 'Total Blocking Time (TBT)', val: report.vitals.tbt.value, rating: report.vitals.tbt.rating }
        ];

        vitalItems.forEach((v, idx) => {
          const itemY = 325 + idx * 30;

          doc.fillColor(darkColor)
             .fontSize(10)
             .font('Helvetica')
             .text(v.name, 50, itemY);

          const ratingColor = v.rating === 'good' ? '#22C55E' : v.rating === 'needs-improvement' ? '#F59E0B' : '#EF4444';
          doc.fillColor(ratingColor)
             .fontSize(10)
             .font('Courier-Bold')
             .text(`${v.val} (${v.rating.toUpperCase()})`, 380, itemY);
        });

        // Resource payload breakdown
        doc.fillColor(darkColor)
           .fontSize(13)
           .font('Helvetica-Bold')
           .text('Payload Payload Size Breakdown', 50, 480);

        const breakdownItems = [
          { label: 'Scripts (JS)', val: `${report.breakdown.js.sizeKb} KB (${report.breakdown.js.count} files)` },
          { label: 'Stylesheets (CSS)', val: `${report.breakdown.css.sizeKb} KB (${report.breakdown.css.count} files)` },
          { label: 'Images', val: `${report.breakdown.images.sizeKb} KB (${report.breakdown.images.count} files)` },
          { label: 'Fonts', val: `${report.breakdown.fonts.sizeKb} KB (${report.breakdown.fonts.count} files)` }
        ];

        breakdownItems.forEach((b, idx) => {
          const itemY = 505 + idx * 25;
          doc.fillColor(darkColor)
             .fontSize(10)
             .font('Helvetica')
             .text(b.label, 50, itemY);

          doc.fillColor(grayColor)
             .fontSize(10)
             .font('Helvetica')
             .text(b.val, 380, itemY);
        });

        // --- PAGE 2: RECOMMENDATIONS ---
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
        report.recommendations.forEach((rec, idx) => {
          if (recY > 700) {
            doc.addPage();
            recY = 50;
          }

          const badgeColor = rec.priority === 'high' ? '#EF4444' : rec.priority === 'medium' ? '#F59E0B' : '#22C55E';
          
          doc.fillColor(badgeColor)
             .fontSize(8)
             .font('Helvetica-Bold')
             .text(rec.priority.toUpperCase(), 50, recY + 2);

          doc.fillColor(darkColor)
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(`${idx + 1}. ${rec.issue}`, 100, recY);

          doc.fillColor(grayColor)
             .fontSize(9.5)
             .font('Helvetica')
             .text(rec.whyItMatters, 100, recY + 16, { width: 440 });

          // Compute spacing height occupied by description
          const textHeight = doc.heightOfString(rec.whyItMatters, { width: 440 });

          doc.fillColor(primaryColor)
             .fontSize(9)
             .font('Helvetica')
             .text(`Est. Improvement: ${rec.estimatedImprovement}`, 100, recY + 20 + textHeight);

          recY += 45 + textHeight;
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default new PdfService();
