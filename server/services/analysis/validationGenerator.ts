import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..', '..');
const validationDir = path.join(rootDir, 'reports', 'validation');

export class ValidationGenerator {
  /**
   * Generates validation.json and validation.pdf inside /reports/validation/
   * @param {any} reportData - Raw analyzer outputs and scanned page metadata
   * @param {string} targetUrl - Scanned website URL
   */
  static async generate(reportData: any, targetUrl: string): Promise<void> {
    console.log(`[Validation Generator]: Initiating QA Validation Framework for: ${targetUrl}`);
    
    // Ensure output directories exist
    if (!fs.existsSync(validationDir)) {
      fs.mkdirSync(validationDir, { recursive: true });
    }

    const domain = targetUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
    
    const pdfPath = path.join(validationDir, `validation-${domain}.pdf`);
    const jsonPath = path.join(validationDir, `validation-${domain}.json`);

    const genericPdfPath = path.join(validationDir, 'validation.pdf');
    const genericJsonPath = path.join(validationDir, 'validation.json');

    // 1. EXPORT JSON (debugging raw analyzer data)
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2), 'utf-8');
    fs.copyFileSync(jsonPath, genericJsonPath);
    console.log(`[Validation Generator]: JSON reports written successfully to ${jsonPath}`);

    // 2. EXPORT PDF
    await this.buildPdfReport(reportData, targetUrl, pdfPath, domain);
    fs.copyFileSync(pdfPath, genericPdfPath);
    console.log(`[Validation Generator]: PDF reports written successfully to ${pdfPath}`);
  }

  private static async buildPdfReport(reportData: any, targetUrl: string, pdfPath: string, domain: string): Promise<void> {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

        // Styling palettes
        const primaryColor = '#1D4ED8'; // Indigo-blue
        const textDark = '#111827';
        const textGray = '#4B5563';
        const strokeGray = '#E5E7EB';
        const passColor = '#15803D';
        const failColor = '#B91C1C';
        const unknownColor = '#B45309';

        // Helper: Check space and add new page
        let currentY = 40;
        const pageHeight = 842; // A4 height in points
        const checkPageBreak = (neededHeight: number) => {
          if (currentY + neededHeight > pageHeight - 50) {
            doc.addPage();
            currentY = 40;
            return true;
          }
          return false;
        };

        // Header Helper
        const drawSectionHeader = (title: string) => {
          checkPageBreak(40);
          doc.fillColor(primaryColor)
             .fontSize(14)
             .font('Helvetica-Bold')
             .text(title, 40, currentY);
          
          currentY += 18;
          doc.strokeColor(strokeGray)
             .lineWidth(1)
             .moveTo(40, currentY)
             .lineTo(555, currentY)
             .stroke();
          
          currentY += 12;
        };

        // ==========================================
        // COVER PAGE
        // ==========================================
        doc.fillColor(primaryColor)
           .fontSize(28)
           .font('Helvetica-Bold')
           .text('PerfLens', 40, 150);

        doc.fillColor(textGray)
           .fontSize(12)
           .font('Helvetica')
           .text('QA VALIDATION & EVIDENCE REPORT', 40, 185);

        doc.strokeColor(primaryColor)
           .lineWidth(3)
           .moveTo(40, 205)
           .lineTo(555, 205)
           .stroke();

        doc.fillColor(textDark)
           .fontSize(18)
           .font('Helvetica-Bold')
           .text(`Target: ${targetUrl}`, 40, 230);

        // Info table
        const scanTime = reportData.createdAt ? new Date(reportData.createdAt).toLocaleString() : new Date().toLocaleString();
        const browserVer = reportData.validationData?.browserVersion || 'Unknown';
        const nodeVer = reportData.validationData?.nodeVersion || process.version;
        const puppeteerVer = reportData.validationData?.puppeteerVersion || '24.0.0';
        const perfLensVer = reportData.validationData?.perfLensVersion || '1.0.0';

        doc.fillColor(textDark)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('SYSTEM METADATA', 40, 320);

        const metaRows = [
          { label: 'Website Domain', val: domain },
          { label: 'Scan Timestamp', val: scanTime },
          { label: 'PerfLens Version', val: perfLensVer },
          { label: 'Browser Version', val: browserVer },
          { label: 'Puppeteer Version', val: puppeteerVer },
          { label: 'Node.js Version', val: nodeVer }
        ];

        let mY = 340;
        metaRows.forEach(row => {
          doc.fillColor(textGray)
             .fontSize(9.5)
             .font('Helvetica')
             .text(row.label, 40, mY);

          doc.fillColor(textDark)
             .fontSize(9.5)
             .font('Helvetica-Bold')
             .text(row.val, 180, mY);

          mY += 18;
        });

        // Analyzer versions sub-table
        doc.fillColor(textDark)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('ANALYZER ENGINE MODULES', 40, 480);

        const analyzerRows = [
          { name: 'SEO Tag Index Analyzer', ver: 'v1.0.0' },
          { name: 'Accessibility Analyzer', ver: 'v1.0.0' },
          { name: 'Image Compression Analyzer', ver: 'v1.0.0' },
          { name: 'CSS Purge & Coverage Analyzer', ver: 'v1.0.0' },
          { name: 'JavaScript Bundle Analyzer', ver: 'v1.0.0' }
        ];

        let aY = 500;
        analyzerRows.forEach(row => {
          doc.fillColor(textGray)
             .fontSize(9.5)
             .font('Helvetica')
             .text(row.name, 40, aY);

          doc.fillColor(textDark)
             .fontSize(9.5)
             .font('Courier-Bold')
             .text(row.ver, 260, aY);

          aY += 18;
        });

        // End of cover page
        doc.addPage();
        currentY = 40;

        // ==========================================
        // SECTION 1: SUMMARY
        // ==========================================
        drawSectionHeader('SECTION 1: SUMMARY');

        const overallScore = reportData.scores?.overall ?? 'UNKNOWN';
        const debugLogs = reportData.validationData?.debugLogs || {};
        
        // Compute Overall Confidence Level
        // If any sub-analyzer used fallback, confidence reduces
        let fallbacksCount = 0;
        Object.values(debugLogs).forEach((log: any) => {
          if (log.fallbackUsed === 'YES') fallbacksCount++;
        });

        let confidence: 'High' | 'Medium' | 'Low' = 'High';
        if (fallbacksCount > 2) {
          confidence = 'Low';
        } else if (fallbacksCount > 0) {
          confidence = 'Medium';
        }

        const scanDuration = reportData.duration ? `${reportData.duration}s` : 'UNKNOWN';

        // Count Warnings & Errors
        let totalWarnings = 0;
        let totalErrors = 0;
        
        if (reportData.warnings) totalWarnings += reportData.warnings.length;
        if (reportData.errors) totalErrors += reportData.errors.length;

        doc.fillColor(textDark)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text(`Overall PerfLens Score:`, 40, currentY);

        const scoreColor = typeof overallScore === 'number' 
          ? (overallScore >= 90 ? passColor : overallScore >= 70 ? unknownColor : failColor)
          : unknownColor;

        doc.fillColor(scoreColor)
           .fontSize(16)
           .font('Courier-Bold')
           .text(`${overallScore}/100`, 220, currentY - 3);

        currentY += 24;

        const summaryData = [
          { label: 'QA Verification Confidence', val: confidence, color: confidence === 'High' ? passColor : confidence === 'Medium' ? unknownColor : failColor },
          { label: 'Scan Pipeline Duration', val: scanDuration, color: textDark },
          { label: 'Total Validation Warnings', val: `${totalWarnings}`, color: totalWarnings > 0 ? unknownColor : passColor },
          { label: 'Total Validation Errors', val: `${totalErrors}`, color: totalErrors > 0 ? failColor : passColor }
        ];

        summaryData.forEach(row => {
          doc.fillColor(textGray)
             .fontSize(10)
             .font('Helvetica')
             .text(row.label, 40, currentY);

          doc.fillColor(row.color)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text(row.val, 220, currentY);

          currentY += 20;
        });

        currentY += 15;

        // ==========================================
        // SECTION 2: SEO VALIDATION
        // ==========================================
        drawSectionHeader('SECTION 2: SEO VALIDATION');

        const seoEvidence = reportData.validationData?.seoAnalysis?.validationEvidence || {};

        const seoFields = [
          { name: 'Title', key: 'title', elName: 'title' },
          { name: 'Meta Description', key: 'description', elName: 'meta[name="description"]' },
          { name: 'Canonical URL', key: 'canonical', elName: 'link[rel="canonical"]' },
          { name: 'Viewport', key: 'viewport', elName: 'meta[name="viewport"]' },
          { name: 'Charset', key: 'charset', elName: 'meta[charset]' },
          { name: 'Robots Instructions', key: 'robots', elName: 'meta[name="robots"]' },
          { name: 'Keywords', key: 'keywords', elName: 'meta[name="keywords"]' }
        ];

        seoFields.forEach(field => {
          checkPageBreak(120);

          const itemData = seoEvidence[field.key] || { value: '', selector: 'none', html: '' };
          const detected = itemData.value || 'UNKNOWN';
          const selector = itemData.selector || 'none';
          const htmlSnippet = itemData.html || 'none';

          // Determine status
          let status: 'PASS' | 'FAIL' | 'UNKNOWN' = 'UNKNOWN';
          if (detected !== 'UNKNOWN' && detected !== '') {
            status = 'PASS';
          } else if (field.key === 'robots' || field.key === 'keywords') {
            // Optional, could be UNKNOWN or PASS if analyzer correctly extracted its empty state
            status = itemData.selector !== 'none' ? 'PASS' : 'UNKNOWN';
          } else {
            status = 'FAIL';
          }

          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text(field.name, 40, currentY);

          const statusCol = status === 'PASS' ? passColor : status === 'FAIL' ? failColor : unknownColor;
          doc.fillColor(statusCol)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text(status, 480, currentY);

          currentY += 15;

          const fieldRows = [
            { l: 'Selector Used', v: selector },
            { l: 'Detected Value', v: detected.length > 80 ? detected.substring(0, 77) + '...' : detected },
            { l: 'Raw HTML Evidence', v: htmlSnippet.length > 80 ? htmlSnippet.substring(0, 77) + '...' : htmlSnippet }
          ];

          fieldRows.forEach(fr => {
            doc.fillColor(textGray)
               .fontSize(8.5)
               .font('Helvetica')
               .text(fr.l, 55, currentY);

            doc.fillColor(textDark)
               .fontSize(8.5)
               .font(fr.l === 'Raw HTML Evidence' ? 'Courier' : 'Helvetica-Bold')
               .text(fr.v, 160, currentY);

            currentY += 13;
          });

          currentY += 10;
          doc.strokeColor(strokeGray)
             .lineWidth(0.5)
             .moveTo(50, currentY)
             .lineTo(540, currentY)
             .stroke();

          currentY += 10;
        });

        currentY += 15;

        // ==========================================
        // SECTION 3: IMAGE VALIDATION
        // ==========================================
        drawSectionHeader('SECTION 3: IMAGE VALIDATION');

        const imageAnalysis = reportData.validationData?.imageAnalysis || {};
        const imagesList = imageAnalysis.images || [];

        const totalImages = imageAnalysis.summary?.totalImages ?? 0;
        const largestImgUrl = imageAnalysis.summary?.largestImage?.url || 'UNKNOWN';
        const largestImgSize = imageAnalysis.summary?.largestImage?.sizeKb ? `${imageAnalysis.summary.largestImage.sizeKb}KB` : 'UNKNOWN';

        // Find largest image in the list to determine dimensions
        const largestImgItem = imagesList.find((img: any) => img.url === largestImgUrl);
        const largestImgDims = largestImgItem ? `${largestImgItem.width}x${largestImgItem.height}` : 'UNKNOWN';

        const missingAlt = imageAnalysis.summary?.imagesMissingAltText ?? 0;
        const missingLazy = imageAnalysis.summary?.imagesMissingLazyLoading ?? 0;
        const duplicates = imageAnalysis.summary?.duplicateImages ?? 0;

        // Modern formats: count webp/avif
        const modernCount = imagesList.filter((img: any) => 
          img.extension === 'webp' || img.extension === 'avif' || img.mimeType?.includes('webp') || img.mimeType?.includes('avif')
        ).length;

        checkPageBreak(120);

        const imgStats = [
          { l: 'Total Images Scanned', v: `${totalImages}` },
          { l: 'Largest Image Size', v: largestImgSize },
          { l: 'Largest Image Dimensions', v: largestImgDims },
          { l: 'Lazy Loaded Image Count', v: `${totalImages - missingLazy} / ${totalImages}` },
          { l: 'Missing ALT Attribute', v: `${missingAlt} / ${totalImages}` },
          { l: 'Modern Format WebP/AVIF', v: `${modernCount} / ${totalImages}` },
          { l: 'Duplicate Image URLs', v: `${duplicates}` }
        ];

        imgStats.forEach(st => {
          doc.fillColor(textGray)
             .fontSize(9.5)
             .font('Helvetica')
             .text(st.l, 40, currentY);

          doc.fillColor(textDark)
             .fontSize(9.5)
             .font('Helvetica-Bold')
             .text(st.v, 220, currentY);

          currentY += 15;
        });

        currentY += 15;

        // Print largest image details if present
        if (largestImgUrl !== 'UNKNOWN') {
          checkPageBreak(90);
          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Largest Image Evidence:', 40, currentY);

          currentY += 15;
          doc.fillColor(textGray).fontSize(8).text('URL:', 50, currentY);
          doc.fillColor(primaryColor).fontSize(8).font('Courier').text(largestImgUrl.length > 90 ? largestImgUrl.substring(0, 87) + '...' : largestImgUrl, 90, currentY);
          currentY += 12;

          doc.fillColor(textGray).fontSize(8).text('HTML:', 50, currentY);
          const largeHtml = largestImgItem?.html || 'none';
          doc.fillColor(textDark).fontSize(8).font('Courier').text(largeHtml.length > 90 ? largeHtml.substring(0, 87) + '...' : largeHtml, 90, currentY);
          currentY += 18;
        }

        // Print duplicates list if they exist
        const duplicateItems = imagesList.filter((img: any) => img.isDuplicate);
        if (duplicateItems.length > 0) {
          checkPageBreak(90);
          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text(`Duplicate Images (Showing top 3):`, 40, currentY);
          currentY += 15;

          duplicateItems.slice(0, 3).forEach((img: any) => {
            checkPageBreak(50);
            doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text(`URL:`, 50, currentY);
            doc.fillColor(primaryColor).fontSize(8.5).font('Courier').text(img.url.length > 90 ? img.url.substring(0, 87) + '...' : img.url, 90, currentY);
            currentY += 12;

            doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text(`Meta:`, 50, currentY);
            doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold').text(`${img.width || 'UNKNOWN'}x${img.height || 'UNKNOWN'} (${img.fileSizeKb}KB)`, 90, currentY);
            currentY += 15;
          });
        }

        currentY += 15;

        // ==========================================
        // SECTION 4: CSS VALIDATION
        // ==========================================
        drawSectionHeader('SECTION 4: CSS VALIDATION');

        const cssAnalysis = reportData.validationData?.cssAnalysis || {};
        const stylesheets = cssAnalysis.stylesheets || [];

        const totalStylesheets = cssAnalysis.summary?.totalCSSFiles ?? 0;
        const totalCSSWeight = cssAnalysis.summary?.totalCSSWeight ?? 0;
        const estimatedUnusedCSS = cssAnalysis.summary?.estimatedUnusedCSS ?? 0;
        const inlineCSSCount = cssAnalysis.summary?.inlineCSSCount ?? 0;
        const renderBlockingCSS = cssAnalysis.summary?.renderBlockingCSS ?? 0;

        const cssStats = [
          { l: 'Total Stylesheet Resources', v: `${totalStylesheets}` },
          { l: 'Total CSS Weight (KB)', v: `${totalCSSWeight}KB` },
          { l: 'Estimated Unused CSS (KB)', v: `${estimatedUnusedCSS}KB (${totalCSSWeight > 0 ? Math.round((estimatedUnusedCSS / totalCSSWeight) * 100) : 0}% unused)` },
          { l: 'Inline style blocks count', v: `${inlineCSSCount}` },
          { l: 'Render Blocking Stylesheets', v: `${renderBlockingCSS}` }
        ];

        cssStats.forEach(st => {
          doc.fillColor(textGray)
             .fontSize(9.5)
             .font('Helvetica')
             .text(st.l, 40, currentY);

          doc.fillColor(textDark)
             .fontSize(9.5)
             .font('Helvetica-Bold')
             .text(st.v, 220, currentY);

          currentY += 15;
        });

        if (stylesheets.length > 0) {
          currentY += 10;
          checkPageBreak(90);
          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('CSS Evidence Log:', 40, currentY);
          currentY += 15;

          stylesheets.forEach((sheet: any) => {
            checkPageBreak(65);
            doc.fillColor(textGray).fontSize(8.5).text('File:', 50, currentY);
            doc.fillColor(primaryColor).fontSize(8.5).font('Courier').text(sheet.url.length > 90 ? sheet.url.substring(0, 87) + '...' : sheet.url, 90, currentY);
            currentY += 11;

            const isBlocked = sheet.isRenderBlocking ? 'Render-Blocking' : 'Asynchronous';
            const isMin = sheet.isMinified ? 'Minified' : 'Unminified';
            doc.fillColor(textGray).fontSize(8.5).text('Meta:', 50, currentY);
            doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold')
               .text(`${sheet.fileSizeKb}KB | ${isMin} | ${isBlocked} | Unused: ${sheet.estimatedUnusedCssKb}KB`, 90, currentY);
            
            currentY += 18;
          });
        }

        currentY += 15;

        // ==========================================
        // SECTION 5: JAVASCRIPT VALIDATION
        // ==========================================
        drawSectionHeader('SECTION 5: JAVASCRIPT VALIDATION');

        const jsAnalysis = reportData.validationData?.jsAnalysis || {};
        const scripts = jsAnalysis.scripts || [];

        const totalJSFiles = jsAnalysis.summary?.totalJSFiles ?? 0;
        const totalJSWeight = jsAnalysis.summary?.totalJSWeight ?? 0;
        const estimatedUnusedJS = jsAnalysis.summary?.estimatedUnusedJS ?? 0;
        const thirdPartyScripts = jsAnalysis.summary?.thirdPartyScripts ?? 0;
        const renderBlockingScripts = jsAnalysis.summary?.renderBlockingScripts ?? 0;
        const largestJSUrl = jsAnalysis.summary?.largestJSFile?.url || 'UNKNOWN';
        const largestJSSize = jsAnalysis.summary?.largestJSFile?.sizeKb ? `${jsAnalysis.summary.largestJSFile.sizeKb}KB` : 'UNKNOWN';

        const jsStats = [
          { l: 'Total Script Resources', v: `${totalJSFiles}` },
          { l: 'Total JS Weight (KB)', v: `${totalJSWeight}KB` },
          { l: 'Estimated Unused JS (KB)', v: `${estimatedUnusedJS}KB (${totalJSWeight > 0 ? Math.round((estimatedUnusedJS / totalJSWeight) * 100) : 0}% unused)` },
          { l: 'Third-party script count', v: `${thirdPartyScripts}` },
          { l: 'Render Blocking Scripts', v: `${renderBlockingScripts}` },
          { l: 'Largest Script Bundle', v: largestJSSize }
        ];

        jsStats.forEach(st => {
          doc.fillColor(textGray)
             .fontSize(9.5)
             .font('Helvetica')
             .text(st.l, 40, currentY);

          doc.fillColor(textDark)
             .fontSize(9.5)
             .font('Helvetica-Bold')
             .text(st.v, 220, currentY);

          currentY += 15;
        });

        if (largestJSUrl !== 'UNKNOWN') {
          currentY += 10;
          checkPageBreak(40);
          doc.fillColor(textGray).fontSize(8.5).text('Largest script:', 40, currentY);
          doc.fillColor(primaryColor).fontSize(8.5).font('Courier').text(largestJSUrl.length > 90 ? largestJSUrl.substring(0, 87) + '...' : largestJSUrl, 120, currentY);
          currentY += 15;
        }

        if (scripts.length > 0) {
          checkPageBreak(90);
          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('JavaScript Evidence Log (Showing top 5):', 40, currentY);
          currentY += 15;

          scripts.slice(0, 5).forEach((script: any) => {
            checkPageBreak(65);
            doc.fillColor(textGray).fontSize(8.5).text('File:', 50, currentY);
            doc.fillColor(primaryColor).fontSize(8.5).font('Courier').text(script.url.length > 90 ? script.url.substring(0, 87) + '...' : script.url, 90, currentY);
            currentY += 11;

            const isBlocked = script.isRenderBlocking ? 'Render-Blocking' : 'Deferred/Async';
            const isMin = script.isMinified ? 'Minified' : 'Unminified';
            const isThird = script.isThirdParty ? 'Third-Party' : 'First-Party';
            doc.fillColor(textGray).fontSize(8.5).text('Meta:', 50, currentY);
            doc.fillColor(textDark).fontSize(8.5).font('Helvetica-Bold')
               .text(`${script.fileSizeKb}KB | ${isMin} | ${isBlocked} | ${isThird} | Unused: ${script.estimatedUnusedJsKb}KB`, 90, currentY);
            
            currentY += 18;
          });
        }

        currentY += 15;

        // ==========================================
        // SECTION 6: NETWORK
        // ==========================================
        drawSectionHeader('SECTION 6: NETWORK');

        const networkAnalysis = reportData.validationData?.networkAnalysis || {};
        const resources = reportData.validationData?.resources || [];

        const totalReqs = resources.length;
        const totalSizeKb = parseFloat(resources.reduce((sum: number, r: any) => sum + r.sizeKb, 0).toFixed(1));
        const cacheCoverage = networkAnalysis.stats?.cacheCoverageRate ?? 0;
        const compressionRate = networkAnalysis.stats?.compressionRate ?? 0;

        // Group by HTTP versions
        const http2Count = resources.filter((r: any) => r.httpVersion?.includes('2') || r.httpVersion?.includes('3')).length;
        const http1Count = totalReqs - http2Count;

        // Group by status codes
        const status2xx = resources.filter((r: any) => r.statusCode >= 200 && r.statusCode < 300).length;
        const status3xx = resources.filter((r: any) => r.statusCode >= 300 && r.statusCode < 400).length;
        const status4xx = resources.filter((r: any) => r.statusCode >= 400 && r.statusCode < 500).length;

        checkPageBreak(120);

        const netStats = [
          { l: 'Total Network Requests', v: `${totalReqs}` },
          { l: 'Total Network Weight', v: `${totalSizeKb}KB` },
          { l: 'Cache Coverage Rate', v: `${cacheCoverage}%` },
          { l: 'Compression Coverage Rate', v: `${compressionRate}%` },
          { l: 'Protocol Breakdown', v: `HTTP/2+: ${http2Count} requests | HTTP/1.x: ${http1Count} requests` },
          { l: 'Status Codes Breakdown', v: `2xx: ${status2xx} | 3xx: ${status3xx} | 4xx+: ${status4xx}` }
        ];

        netStats.forEach(st => {
          doc.fillColor(textGray)
             .fontSize(9.5)
             .font('Helvetica')
             .text(st.l, 40, currentY);

          doc.fillColor(textDark)
             .fontSize(9.5)
             .font('Helvetica-Bold')
             .text(st.v, 220, currentY);

          currentY += 15;
        });

        // Top 5 Largest Requests
        const sortedBySize = [...resources].sort((a: any, b: any) => b.sizeKb - a.sizeKb);
        if (sortedBySize.length > 0) {
          currentY += 10;
          checkPageBreak(100);
          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Top 5 Largest Network Requests:', 40, currentY);
          currentY += 15;

          sortedBySize.slice(0, 5).forEach((r: any) => {
            checkPageBreak(18);
            doc.fillColor(primaryColor).fontSize(8).font('Courier').text(r.url.length > 85 ? r.url.substring(0, 82) + '...' : r.url, 40, currentY);
            doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold').text(`${r.sizeKb}KB (${r.type.toUpperCase()})`, 480, currentY);
            currentY += 15;
          });
        }

        // Top 5 Slowest Requests
        const sortedByTime = [...resources].sort((a: any, b: any) => b.durationMs - a.durationMs);
        if (sortedByTime.length > 0) {
          currentY += 10;
          checkPageBreak(100);
          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Top 5 Slowest Network Requests:', 40, currentY);
          currentY += 15;

          sortedByTime.slice(0, 5).forEach((r: any) => {
            checkPageBreak(18);
            doc.fillColor(primaryColor).fontSize(8).font('Courier').text(r.url.length > 85 ? r.url.substring(0, 82) + '...' : r.url, 40, currentY);
            doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold').text(`${r.durationMs}ms`, 480, currentY);
            currentY += 15;
          });
        }

        // Network Waterfall Diagram (Bonus)
        if (resources.length > 0) {
          currentY += 15;
          checkPageBreak(180);
          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Network Waterfall Timeline (Top 10 Requests):', 40, currentY);
          
          currentY += 20;

          // Draw baseline
          doc.strokeColor(strokeGray)
             .lineWidth(1)
             .moveTo(180, currentY)
             .lineTo(540, currentY)
             .stroke();

          // Print timeline scales
          const maxTime = Math.max(...resources.slice(0, 10).map((r: any) => r.durationMs), 100);
          doc.fillColor(textGray).fontSize(7).font('Helvetica')
             .text('0ms', 180, currentY - 10)
             .text(`${Math.round(maxTime / 2)}ms`, 350, currentY - 10)
             .text(`${maxTime}ms`, 510, currentY - 10);

          let barY = currentY + 10;
          resources.slice(0, 10).forEach((r: any, idx: number) => {
            const shortName = r.url.split('/').pop()?.split('?')[0] || r.url;
            doc.fillColor(textDark).fontSize(8).font('Helvetica')
               .text(`${idx + 1}. ${shortName.length > 25 ? shortName.substring(0, 22) + '...' : shortName}`, 40, barY);

            // Draw timing Gantt bar
            const barWidth = Math.max(10, Math.min(350, (r.durationMs / maxTime) * 350));
            const barColor = r.type === 'js' ? '#F59E0B' : r.type === 'css' ? '#3B82F6' : r.type === 'image' ? '#10B981' : '#6B7280';
            
            doc.rect(180, barY - 1, barWidth, 8)
               .fill(barColor);

            doc.fillColor(textGray).fontSize(7.5).font('Courier-Bold')
               .text(`${r.durationMs}ms`, 185 + barWidth, barY);

            barY += 13;
          });

          currentY = barY + 15;
        }

        // ==========================================
        // SECTION 7: ACCESSIBILITY
        // ==========================================
        drawSectionHeader('SECTION 7: ACCESSIBILITY');

        const a11yEvidence = reportData.validationData?.accessibilityAnalysis?.validationEvidence || {};
        const accessibilityIssuesList = reportData.validationData?.accessibilityAnalysis?.warnings || [];

        const a11yImages = a11yEvidence.images || [];
        const a11yInputs = a11yEvidence.inputs || [];
        const a11yButtons = a11yEvidence.buttons || [];
        const a11yLinks = a11yEvidence.links || [];

        const totalViolations = accessibilityIssuesList.length;

        checkPageBreak(120);

        doc.fillColor(textGray)
           .fontSize(9.5)
           .font('Helvetica')
           .text('Total Accessibility Violations', 40, currentY);

        doc.fillColor(totalViolations > 0 ? failColor : passColor)
           .fontSize(9.5)
           .font('Helvetica-Bold')
           .text(`${totalViolations}`, 220, currentY);

        currentY += 18;

        const a11yElementsChecked = [
          { l: 'Images Scanned for ALT tags', v: `${a11yImages.length}` },
          { l: 'Form Input Elements Scanned', v: `${a11yInputs.length}` },
          { l: 'Buttons Scanned', v: `${a11yButtons.length}` },
          { l: 'Links Scanned', v: `${a11yLinks.length}` }
        ];

        a11yElementsChecked.forEach(el => {
          doc.fillColor(textGray)
             .fontSize(9.5)
             .font('Helvetica')
             .text(el.l, 40, currentY);

          doc.fillColor(textDark)
             .fontSize(9.5)
             .font('Helvetica-Bold')
             .text(el.v, 220, currentY);

          currentY += 15;
        });

        if (totalViolations > 0) {
          currentY += 10;
          checkPageBreak(100);
          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Accessibility Violations Log:', 40, currentY);
          currentY += 15;

          accessibilityIssuesList.forEach((issue: any) => {
            checkPageBreak(80);

            const severityColor = issue.severity === 'error' ? failColor : unknownColor;
            doc.fillColor(severityColor)
               .fontSize(9)
               .font('Helvetica-Bold')
               .text(`[${issue.severity.toUpperCase()}] ${issue.code || 'A11Y_ISSUE'}`, 40, currentY);
            currentY += 13;

            doc.fillColor(textDark)
               .fontSize(8.5)
               .font('Helvetica')
               .text(issue.message, 50, currentY, { width: 490 });
            
            const msgHeight = doc.heightOfString(issue.message, { width: 490 });
            currentY += msgHeight + 5;

            // Highlight source code and selector if present
            let selector = 'N/A';
            let sourceHtml = 'N/A';

            if (issue.code === 'A11Y_NO_LANG') {
              selector = 'html';
              sourceHtml = `<html lang="${a11yEvidence.htmlLang || ''}">`;
            } else if (issue.code === 'A11Y_NO_SKIP_LINK' || issue.code === 'A11Y_NO_TITLE') {
              selector = 'none';
              sourceHtml = 'none';
            } else if (issue.code === 'A11Y_MISSING_ALT') {
              const missingImg = a11yImages.find((img: any) => img.alt === null || img.alt === '');
              if (missingImg) {
                selector = missingImg.selector || 'img';
                sourceHtml = missingImg.html || 'none';
              }
            } else if (issue.code === 'A11Y_MISSING_ARIA') {
              const missingInput = a11yInputs.find((i: any) => !i.hasLabel);
              const missingButton = a11yButtons.find((b: any) => !b.hasLabel);
              if (missingInput) {
                selector = missingInput.selector || 'input';
                sourceHtml = missingInput.html || 'none';
              } else if (missingButton) {
                selector = missingButton.selector || 'button';
                sourceHtml = missingButton.html || 'none';
              }
            }

            doc.fillColor(textGray).fontSize(8).text('Selector:', 50, currentY);
            doc.fillColor(textDark).fontSize(8).font('Helvetica-Bold').text(selector, 100, currentY);
            currentY += 10;

            doc.fillColor(textGray).fontSize(8).text('HTML:', 50, currentY);
            doc.fillColor(textDark).fontSize(8).font('Courier').text(sourceHtml.length > 90 ? sourceHtml.substring(0, 87) + '...' : sourceHtml, 100, currentY);
            currentY += 16;
          });
        }

        currentY += 15;

        // ==========================================
        // SECTION 8: GOOGLE LIGHTHOUSE
        // ==========================================
        drawSectionHeader('SECTION 8: GOOGLE LIGHTHOUSE');

        const pageSpeed = reportData.pageSpeed;

        if (pageSpeed) {
          checkPageBreak(180);
          
          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Lighthouse Audit Scores:', 40, currentY);
          currentY += 15;

          const lhScores = [
            { l: 'Performance', v: `${pageSpeed.performance ?? 0}/100` },
            { l: 'Accessibility', v: `${pageSpeed.accessibility ?? 0}/100` },
            { l: 'SEO Score', v: `${pageSpeed.seo ?? 0}/100` },
            { l: 'Best Practices', v: `${pageSpeed.bestPractices ?? 0}/100` }
          ];

          lhScores.forEach(s => {
            doc.fillColor(textGray).fontSize(9).text(s.l, 50, currentY);
            doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(s.v, 180, currentY);
            currentY += 14;
          });

          currentY += 10;

          doc.fillColor(textDark)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Lighthouse Web Vitals Metrics:', 40, currentY);
          currentY += 15;

          const metrics = pageSpeed.metrics || {};
          const lhMetrics = [
            { l: 'First Contentful Paint (FCP)', v: metrics.fcp || 'N/A' },
            { l: 'Largest Contentful Paint (LCP)', v: metrics.lcp || 'N/A' },
            { l: 'Interaction to Next Paint (INP)', v: metrics.inp || 'N/A' },
            { l: 'Total Blocking Time (TBT)', v: metrics.tbt || 'N/A' },
            { l: 'Cumulative Layout Shift (CLS)', v: metrics.cls || 'N/A' },
            { l: 'Server Response Time (TTFB)', v: metrics.ttfb || 'N/A' }
          ];

          lhMetrics.forEach(m => {
            doc.fillColor(textGray).fontSize(9).text(m.l, 50, currentY);
            doc.fillColor(textDark).fontSize(9).font('Helvetica-Bold').text(m.v, 240, currentY);
            currentY += 14;
          });

        } else {
          checkPageBreak(40);
          doc.fillColor(failColor)
             .fontSize(11)
             .font('Helvetica-Bold')
             .text('Lighthouse Telemetry: Bypassed or Unavailable', 40, currentY);
          
          currentY += 15;
          doc.fillColor(textGray)
             .fontSize(9)
             .font('Helvetica')
             .text('PageSpeed API checks were either bypassed by request or failed due to network quotas/timeouts.', 40, currentY);
          currentY += 20;
        }

        currentY += 15;

        // ==========================================
        // SECTION 9: RECOMMENDATION VALIDATION
        // ==========================================
        drawSectionHeader('SECTION 9: RECOMMENDATION VALIDATION');

        const recommendations = reportData.recommendations || [];

        if (recommendations.length > 0) {
          recommendations.forEach((rec: any, idx: number) => {
            checkPageBreak(90);

            doc.fillColor(textDark)
               .fontSize(10)
               .font('Helvetica-Bold')
               .text(`${idx + 1}. ${rec.issue || rec.suggestion || 'Recommendation item'}`, 40, currentY);
            
            currentY += 15;

            // Extract Evidence & Reason
            let evidenceText = '';
            if (typeof rec.evidence === 'string' && rec.evidence) {
              evidenceText = rec.evidence;
            } else if (Array.isArray(rec.evidence) && rec.evidence.length > 0) {
              evidenceText = rec.evidence.map((e: any) => (typeof e === 'string' ? e : e.resource || e.type || '')).filter(Boolean).join('; ');
            }
            if (!evidenceText && rec.finding?.description) {
              evidenceText = rec.finding.description;
            }
            if (!evidenceText) {
              evidenceText = rec.whyItMatters || 'Purge unused resources or minimize asset overhead.';
            }

            const estimatedImpact = rec.estimatedSavings?.displayString || rec.estimatedImprovement || 'Not quantified';

            doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text('Evidence:', 50, currentY);
            doc.fillColor(textDark).fontSize(8.5).font('Helvetica').text(evidenceText, 130, currentY, { width: 410 });
            
            const evHeight = doc.heightOfString(evidenceText, { width: 410 });
            currentY += evHeight + 4;

            doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text('Estimated Impact:', 50, currentY);
            doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold').text(estimatedImpact, 130, currentY);
            currentY += 13;

            doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text('Confidence Score:', 50, currentY);
            
            // Assign score confidence based on recommendation confidence or priority
            const recConfidence = rec.confidence 
              ? `${rec.confidence.charAt(0).toUpperCase()}${rec.confidence.slice(1).toLowerCase()}`
              : (rec.priority === 'critical' || rec.priority === 'high' ? 'High' : rec.priority === 'medium' ? 'Medium' : 'Low');
            const recConfColor = recConfidence.toLowerCase() === 'high' ? passColor : recConfidence.toLowerCase() === 'medium' ? unknownColor : failColor;
            doc.fillColor(recConfColor).fontSize(8.5).font('Helvetica-Bold').text(recConfidence, 130, currentY);
            
            currentY += 18;
          });
        } else {
          checkPageBreak(30);
          doc.fillColor(passColor)
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('No optimization recommendations compile warnings generated.', 40, currentY);
          currentY += 15;
        }

        currentY += 15;

        // ==========================================
        // SECTION 10: DEBUG LOG
        // ==========================================
        drawSectionHeader('SECTION 10: DEBUG LOG');

        checkPageBreak(120);

        Object.keys(debugLogs).forEach(analyzerName => {
          checkPageBreak(80);
          const log = debugLogs[analyzerName];

          doc.fillColor(textDark)
             .fontSize(10.5)
             .font('Helvetica-Bold')
             .text(analyzerName.toUpperCase(), 40, currentY);
          currentY += 14;

          const startedTime = log.started ? new Date(log.started).toLocaleTimeString() : 'UNKNOWN';
          const finishedTime = log.finished ? new Date(log.finished).toLocaleTimeString() : 'UNKNOWN';

          const dbRows = [
            { l: 'Timestamp Started', v: startedTime },
            { l: 'Timestamp Finished', v: finishedTime },
            { l: 'Execution Time', v: `${log.executionTimeMs}ms` },
            { l: 'Fallback Mode Used', v: log.fallbackUsed, c: log.fallbackUsed === 'YES' ? failColor : passColor },
            { l: 'Confidence Level', v: log.confidence, c: log.confidence === 'High' ? passColor : log.confidence === 'Medium' ? unknownColor : failColor }
          ];

          dbRows.forEach(row => {
            doc.fillColor(textGray).fontSize(8.5).font('Helvetica').text(row.l, 50, currentY);
            doc.fillColor(row.c || textDark).fontSize(8.5).font('Helvetica-Bold').text(row.v, 180, currentY);
            currentY += 12;
          });

          currentY += 10;
        });

        // ==========================================
        // BONUS SECTION: EMBED SCREENSHOTS
        // ==========================================
        const ssData = reportData.validationData?.screenshots || {};
        const fullPagePath = ssData.fullPagePath;
        const viewportPath = ssData.viewportPath;

        if ((fullPagePath && fs.existsSync(fullPagePath)) || (viewportPath && fs.existsSync(viewportPath))) {
          doc.addPage();
          currentY = 40;
          drawSectionHeader('BONUS: SCREENSHOT EVIDENCE');

          if (viewportPath && fs.existsSync(viewportPath)) {
            checkPageBreak(250);
            doc.fillColor(textDark)
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('Viewport Screenshot (1366x768):', 40, currentY);
            currentY += 15;
            
            try {
              // Embed image scaled down to fit width
              doc.image(viewportPath, 40, currentY, { width: 320 });
              currentY += 190;
            } catch (err: any) {
              doc.fillColor(failColor).fontSize(8).text(`Failed to embed screenshot: ${err.message}`, 40, currentY);
              currentY += 15;
            }
          }

          if (fullPagePath && fs.existsSync(fullPagePath)) {
            checkPageBreak(300);
            doc.fillColor(textDark)
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('Full Page Screenshot:', 40, currentY);
            currentY += 15;
            
            try {
              // Scale down viewport to keep it small
              doc.image(fullPagePath, 40, currentY, { height: 280 });
              currentY += 295;
            } catch (err: any) {
              doc.fillColor(failColor).fontSize(8).text(`Failed to embed full screenshot: ${err.message}`, 40, currentY);
              currentY += 15;
            }
          }
        }

        // ==========================================
        // BONUS SECTION: LARGEST IMAGE VISUAL EMBED
        // ==========================================
        if (largestImgUrl !== 'UNKNOWN' && largestImgUrl.startsWith('http')) {
          const imgExt = largestImgItem?.extension || 'png';
          // only try embedding standard web formats
          if (['jpg', 'jpeg', 'png'].includes(imgExt.toLowerCase())) {
            checkPageBreak(250);
            doc.fillColor(textDark)
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('Largest Image Asset visual:', 40, currentY);
            currentY += 15;

            const tempImgPath = path.join(rootDir, 'server', 'temp', `largest_image_dl.${imgExt}`);
            try {
              const dlStream = await axios.get(largestImgUrl, { responseType: 'stream', timeout: 5000 });
              const writer = fs.createWriteStream(tempImgPath);
              dlStream.data.pipe(writer);
              
              await new Promise<void>((resolve, reject) => {
                writer.on('finish', () => resolve());
                writer.on('error', (err) => reject(err));
              });

              if (fs.existsSync(tempImgPath)) {
                doc.image(tempImgPath, 40, currentY, { width: 220 });
                currentY += 190;
                fs.unlinkSync(tempImgPath); // clean up
              }
            } catch (e: any) {
              doc.fillColor(textGray).fontSize(8).text(`Could not embed raw asset image dynamically: ${e.message}`, 40, currentY);
              currentY += 15;
            }
          }
        }

        doc.end();
        await new Promise<void>((resolve, reject) => {
          writeStream.on('finish', () => resolve());
          writeStream.on('error', (err) => reject(err));
        });
  }
}
