import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import ReportGenerator from '../services/analysis/index.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { ValidationGenerator } from '../services/analysis/validationGenerator.js';
import pdfService from '../services/report/index.js';

// Helper to normalize host prefixes
const normalizeUrl = (url: string): string => {
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  return clean;
};

// @desc    Analyze website and compile report
// @route   POST /api/v1/analysis/scan
// @access  Optional Private (Guests allowed)
export const scanWebsite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { url, includePageSpeed } = req.body;
  const targetUrl = normalizeUrl(url);

  console.log(`[Analysis Controller]: Starting concurrent scan pipelines for: ${targetUrl} (includePageSpeed: ${includePageSpeed})`);

  try {
    const startTime = Date.now();

    const reportData = await ReportGenerator.generate(
      targetUrl, 
      req.user ? (req.user.id || req.user._id || null) : null,
      includePageSpeed === undefined ? true : (includePageSpeed === true || includePageSpeed === 'true')
    );

    const duration = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
    
    const isPuppeteerSuccess = reportData.analysisSources?.puppeteerRuntime ?? false;
    const isPageSpeedSuccess = reportData.analysisSources?.googleLighthouse ?? false;
    let status = 'failed';
    if (isPuppeteerSuccess && isPageSpeedSuccess) {
      status = 'success';
    } else if (isPuppeteerSuccess || isPageSpeedSuccess) {
      status = 'partial_success';
    }

    let report: any;
    if (isSupabaseConfigured()) {
      try {
        const rawReport: any = reportData;
        const payload = {
          url: rawReport.url,
          owner_id: req.user ? (req.user.id || req.user._id) : null,
          scores: rawReport.scores || null,
          vitals: rawReport.vitals || null,
          breakdown: rawReport.breakdown || null,
          bundle_analysis: rawReport.bundleAnalysis || null,
          images: rawReport.images || null,
          recommendations: rawReport.recommendations || null,
          resources: rawReport.resources || null,
          page_speed: rawReport.pageSpeed || null,
          custom_analysis: rawReport.customAnalysis || null,
          analysis_sources: rawReport.analysisSources || null,
          metadata: rawReport.metadata || null,
          puppeteer: rawReport.puppeteer || null,
          image: rawReport.image || null,
          css: rawReport.css || null,
          js: rawReport.js || null,
          seo: rawReport.seo || null,
          accessibility: rawReport.accessibility || null,
          recommendation: rawReport.recommendation || null,
          summary: rawReport.summary || null,
          overall_health_score: rawReport.scores?.overall || 0,
          overall_performance_grade: (rawReport.scores?.overall ?? 0) >= 90 ? 'A' : (rawReport.scores?.overall ?? 0) >= 80 ? 'B' : (rawReport.scores?.overall ?? 0) >= 70 ? 'C' : (rawReport.scores?.overall ?? 0) >= 60 ? 'D' : 'F',
          status,
          duration
        };

        const { data: savedReport, error: insertError } = await supabase
          .from('reports')
          .insert(payload)
          .select('*')
          .single();

        if (insertError || !savedReport) {
          throw new Error(insertError?.message || 'Failed to save report to Supabase.');
        }

        report = {
          ...reportData,
          _id: savedReport.id,
          id: savedReport.id,
          duration,
          status,
          createdAt: savedReport.created_at,
          created_at: savedReport.created_at
        };
      } catch (dbErr: any) {
        console.warn(`[Analysis Controller]: Supabase save error (${dbErr.message}). Returning ephemeral report.`);
        const fallbackId = crypto.randomUUID();
        report = {
          _id: fallbackId,
          id: fallbackId,
          ...reportData,
          duration,
          status,
          createdAt: new Date().toISOString()
        };
      }
    } else {
      console.warn('[Analysis Controller]: Supabase not configured. Returning ephemeral report.');
      const fallbackId = crypto.randomUUID();
      report = {
        _id: fallbackId,
        id: fallbackId,
        ...reportData,
        duration,
        status,
        createdAt: new Date().toISOString()
      };
    }
    
    console.log(`[Analysis Controller]: Scan successfully processed for ${report.url || targetUrl} in ${duration}s. Report ID: ${report.id || report._id}`);

    // Automatically generate QA validation reports
    ValidationGenerator.generate(reportData, targetUrl).catch((err: any) => {
      console.error(`[Validation Framework Error]: Failed to generate validation reports - ${err.message}`);
    });

    res.status(200).json({
      success: true,
      duration: `${duration}s`,
      data: report
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Export an in-memory report directly as PDF
// @route   POST /api/v1/analysis/export-pdf
// @access  Public
export const exportPdfFromReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { report } = req.body;
    if (!report || !report.url) {
      return res.status(400).json({ success: false, message: 'Valid report object with url is required' });
    }

    const pdfBuffer = await pdfService.generateReportPdf({
      ...report,
      createdAt: report.createdAt ? new Date(report.createdAt) : new Date()
    } as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="perflens-report-${report.url.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
