import Report from '../../models/Report.js';
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
  const overallHealthScore = analysisResult.recommendation?.summary?.overallHealthScore ?? 
    (analysisResult.recommendation?.summary?.seoScoreEstimate || 0);
  
  const overallPerformanceGrade = analysisResult.recommendation?.summary?.overallPerformanceGrade ?? 'F';

  const reportData = {
    url,
    owner: userId,
    metadata: analysisResult.metadata || null,
    pagespeed: analysisResult.pagespeed || null,
    puppeteer: analysisResult.puppeteer || null,
    image: analysisResult.image || null,
    css: analysisResult.css || null,
    js: analysisResult.js || null,
    seo: analysisResult.seo || null,
    accessibility: analysisResult.accessibility || null,
    recommendation: analysisResult.recommendation || null,
    overallHealthScore,
    overallPerformanceGrade,
    status: analysisResult.status || 'success',
    duration: analysisResult.duration || 0
  };

  const report = await Report.create(reportData);
  return report;
};

/**
 * Retrieves a report by ID, verifying user ownership.
 * @param reportId MongoDB ID of the report
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

  const report = await Report.findOne({ _id: reportId, owner: userId });
  if (!report) {
    throw new Error('Missing Report');
  }

  return report;
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

  const reports = await Report.find({ owner: userId }).sort({ createdAt: -1 });
  return reports;
};

/**
 * Deletes a report after checking ownership rules.
 * @param reportId MongoDB ID of the report
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

  const report = await Report.findOneAndDelete({ _id: reportId, owner: userId });
  if (!report) {
    throw new Error('Missing Report');
  }

  return true;
};
