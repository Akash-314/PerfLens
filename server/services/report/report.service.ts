import crypto from 'crypto';
import { supabase, isSupabaseConfigured } from '../../config/supabase.js';
import { validateReportId } from './helpers.js';

/**
 * Saves a consolidated analysis report for a user in the database.
 * @param userId User ID of the report owner
 * @param url Cleaned website URL target
 * @param analysisResult Full consolidated AnalysisEngineResult data
 * @returns Saved Report document
 */
export const saveReport = async (
  userId: string,
  url: string,
  analysisResult: any
): Promise<any> => {
  if (!userId) {
    throw new Error('User ID is required to save a report.');
  }

  // Extract score and performance grade details from consolidated recommendations
  const overallHealthScore = analysisResult.scores?.overall ?? analysisResult.recommendation?.summary?.overallHealthScore ?? 
    (analysisResult.recommendation?.summary?.seoScoreEstimate || 0);
  
  const overallPerformanceGrade = analysisResult.overallPerformanceGrade ?? 
    (overallHealthScore >= 90 ? 'A' : overallHealthScore >= 80 ? 'B' : overallHealthScore >= 70 ? 'C' : overallHealthScore >= 60 ? 'D' : 'F');

  const reportData = {
    url,
    owner_id: userId,
    scores: analysisResult.scores || null,
    vitals: analysisResult.vitals || null,
    breakdown: analysisResult.breakdown || null,
    bundle_analysis: analysisResult.bundleAnalysis || null,
    images: analysisResult.images || null,
    recommendations: analysisResult.recommendations || null,
    resources: analysisResult.resources || null,
    page_speed: analysisResult.pageSpeed || null,
    custom_analysis: analysisResult.customAnalysis || null,
    analysis_sources: analysisResult.analysisSources || null,
    metadata: analysisResult.metadata || null,
    puppeteer: analysisResult.puppeteer || null,
    image: analysisResult.image || null,
    css: analysisResult.css || null,
    js: analysisResult.js || null,
    seo: analysisResult.seo || null,
    accessibility: analysisResult.accessibility || null,
    recommendation: analysisResult.recommendation || null,
    summary: analysisResult.summary || null,
    overall_health_score: overallHealthScore,
    overall_performance_grade: overallPerformanceGrade,
    status: analysisResult.status || 'success',
    duration: analysisResult.duration || 0
  };

  if (!isSupabaseConfigured()) {
    console.warn('[Report Service]: Supabase unconfigured. Returning ephemeral saved report.');
    const id = crypto.randomUUID();
    return {
      _id: id,
      id,
      ...reportData,
      createdAt: new Date().toISOString()
    };
  }

  try {
    const { data: report, error } = await supabase
      .from('reports')
      .insert(reportData)
      .select('*')
      .single();

    if (error || !report) {
      throw new Error(error?.message || 'Failed to save report in Supabase');
    }

    return {
      ...report,
      _id: report.id,
      owner: report.owner_id,
      pageSpeed: report.page_speed,
      bundleAnalysis: report.bundle_analysis,
      customAnalysis: report.custom_analysis,
      analysisSources: report.analysis_sources,
      scoreExplanation: report.scores?.explanation || analysisResult.scoreExplanation || null,
      performanceScoreDetails: report.scores?.explanation || analysisResult.scoreExplanation || null,
      createdAt: report.created_at,
      created_at: report.created_at
    };
  } catch (err: any) {
    console.warn(`[Report Service]: Supabase save failed (${err.message}). Returning ephemeral report.`);
    const id = crypto.randomUUID();
    return {
      _id: id,
      id,
      ...reportData,
      createdAt: new Date().toISOString()
    };
  }
};

/**
 * Retrieves a report by ID, verifying user ownership.
 * @param reportId String ID / UUID of the report
 * @param userId User ID verifying ownership
 * @returns Report document
 */
export const getReport = async (
  reportId: string,
  userId: string
): Promise<any> => {
  if (!validateReportId(reportId)) {
    throw new Error('Invalid ID');
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Missing Report');
  }

  const { data: report, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('owner_id', userId)
    .maybeSingle();

  if (error || !report) {
    throw new Error('Missing Report');
  }

  return {
    ...report,
    _id: report.id,
    owner: report.owner_id,
    pageSpeed: report.page_speed,
    bundleAnalysis: report.bundle_analysis,
    customAnalysis: report.custom_analysis,
    analysisSources: report.analysis_sources,
    scoreExplanation: report.scores?.explanation || null,
    performanceScoreDetails: report.scores?.explanation || null,
    createdAt: report.created_at,
    created_at: report.created_at
  };
};

/**
 * Fetches all reports created by a user, ordered from newest to oldest.
 * @param userId User ID
 * @returns Array of Report documents
 */
export const getReportsByUser = async (
  userId: string
): Promise<any[]> => {
  if (!userId) {
    throw new Error('User ID is required to retrieve reports.');
  }

  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error || !reports) {
      return [];
    }

    return reports.map(r => ({
      ...r,
      _id: r.id,
      owner: r.owner_id,
      pageSpeed: r.page_speed,
      bundleAnalysis: r.bundle_analysis,
      customAnalysis: r.custom_analysis,
      analysisSources: r.analysis_sources,
      scoreExplanation: r.scores?.explanation || null,
      performanceScoreDetails: r.scores?.explanation || null,
      createdAt: r.created_at,
      created_at: r.created_at
    }));
  } catch {
    return [];
  }
};

/**
 * Deletes a report after checking ownership rules.
 * @param reportId String ID / UUID of the report
 * @param userId User ID checking ownership
 * @returns boolean true on success
 */
export const deleteReport = async (
  reportId: string,
  userId: string
): Promise<boolean> => {
  if (!validateReportId(reportId)) {
    throw new Error('Invalid ID');
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Missing Report');
  }

  const { data, error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId)
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    throw new Error('Missing Report');
  }

  return true;
};
