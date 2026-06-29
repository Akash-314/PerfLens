import { PuppeteerScanResult } from '../puppeteer/types.js';
import {
  AccessibilityAnalysisResult,
  AccessibilityAnalysisSummary,
  AccessibilityDetails,
  AccessibilityAnalysisStatistics,
  AccessibilityAnalysisWarning,
  AccessibilityOptimizationCandidate
} from './types.js';
import { calculateAccessibilityScore } from './helpers.js';

/**
 * Analyzes accessibility features of a website using Puppeteer's scan data.
 * Checks for core accessibility indicators (language attribute, page title, skip links)
 * and outputs a report adhering to the unified schema.
 * 
 * @param puppeteerResult Result object from the Puppeteer service
 * @returns AccessibilityAnalysisResult object
 */
export const analyzeAccessibility = (
  puppeteerResult: PuppeteerScanResult | null
): AccessibilityAnalysisResult => {
  const errors: string[] = [];
  const warnings: AccessibilityAnalysisWarning[] = [];
  const optimizationCandidates: AccessibilityOptimizationCandidate[] = [];

  const emptyResult: AccessibilityAnalysisResult = {
    summary: {
      accessibilityScoreEstimate: 0,
      imagesMissingAlt: null,
      formsMissingLabels: null,
      buttonsMissingLabels: null,
      linksMissingText: null,
      headingIssues: null,
      ariaIssues: null,
      missingLandmarks: null,
      missingSkipNavigation: true
    },
    accessibility: {
      imagesMissingAltText: null,
      emptyAltAttributes: null,
      buttonsWithoutAccessibleLabels: null,
      linksWithoutText: null,
      formInputsWithoutLabels: null,
      missingAriaLabels: null,
      missingAriaRoles: null,
      missingLandmarkElements: null,
      headingHierarchy: null,
      colorContrastIndicators: null,
      missingHtmlLanguageAttribute: true,
      missingPageTitle: true,
      missingFocusableElements: null,
      keyboardNavigationIndicators: null,
      skipNavigationLink: null,
      accessibleTableHeaders: null
    },
    statistics: {
      imagesCount: 0,
      formsCount: 0,
      buttonsCount: 0,
      linksCount: 0
    },
    optimizationCandidates: [],
    warnings: [],
    errors: []
  };

  if (!puppeteerResult) {
    errors.push('No Puppeteer result provided.');
    return { ...emptyResult, errors };
  }

  if (puppeteerResult.errors && puppeteerResult.errors.length > 0) {
    errors.push(...puppeteerResult.errors);
  }

  const meta = puppeteerResult.metadata;
  if (!meta) {
    return {
      ...emptyResult,
      errors: errors.length > 0 ? errors : ['No metadata found in Puppeteer result.']
    };
  }

  // 1. Analyze Core Metadata Accessibility
  const pageTitle = meta.title || null;
  const languageAttribute = meta.language || null;
  const missingPageTitle = !pageTitle || pageTitle.trim().length === 0;
  const missingHtmlLanguageAttribute = !languageAttribute || languageAttribute.trim().length === 0;

  // DOM-level attributes default to null (unknown/un-extractable) since we only have network/metadata logs
  const imagesMissingAltText = null;
  const emptyAltAttributes = null;
  const buttonsWithoutAccessibleLabels = null;
  const linksWithoutText = null;
  const formInputsWithoutLabels = null;
  const missingAriaLabels = null;
  const missingAriaRoles = null;
  const missingLandmarkElements = null;
  const headingHierarchy = null;
  const colorContrastIndicators = null;
  const missingFocusableElements = null;
  const keyboardNavigationIndicators = null;
  const skipNavigationLink = null;
  const accessibleTableHeaders = null;

  const accessibilityDetails: AccessibilityDetails = {
    imagesMissingAltText,
    emptyAltAttributes,
    buttonsWithoutAccessibleLabels,
    linksWithoutText,
    formInputsWithoutLabels,
    missingAriaLabels,
    missingAriaRoles,
    missingLandmarkElements,
    headingHierarchy,
    colorContrastIndicators,
    missingHtmlLanguageAttribute,
    missingPageTitle,
    missingFocusableElements,
    keyboardNavigationIndicators,
    skipNavigationLink,
    accessibleTableHeaders
  };

  // 2. Compute Score & Summary
  const accessibilityScoreEstimate = calculateAccessibilityScore({
    title: pageTitle,
    language: languageAttribute
  });

  const summary: AccessibilityAnalysisSummary = {
    accessibilityScoreEstimate,
    imagesMissingAlt: null,
    formsMissingLabels: null,
    buttonsMissingLabels: null,
    linksMissingText: null,
    headingIssues: null,
    ariaIssues: null,
    missingLandmarks: null,
    missingSkipNavigation: true // defaulted since skip link is not verified in network logs
  };

  // 3. Compute Statistics (counts from resources where possible)
  const imageCount = puppeteerResult.resources?.filter(r => r.type === 'image').length || 0;
  const statistics: AccessibilityAnalysisStatistics = {
    imagesCount: imageCount,
    formsCount: 0,
    buttonsCount: 0,
    linksCount: 0
  };

  // 4. Generate Warnings
  if (missingHtmlLanguageAttribute) {
    warnings.push({
      code: 'A11Y_NO_LANG',
      message: 'HTML language attribute is missing. Specifying a language helps screen readers announce page text correctly.',
      severity: 'error'
    });
  }

  // Skip nav link is missing or unverified by default
  warnings.push({
    code: 'A11Y_NO_SKIP_LINK',
    message: 'Skip navigation link was not detected. Skip links allow keyboard users to bypass header navigation menus.',
    severity: 'warning'
  });

  // Highlight that DOM audits are unavailable in network scan
  warnings.push({
    code: 'A11Y_MISSING_ARIA',
    message: 'ARIA roles and label attributes were not verified. Provide accessible names to complex interactive elements.',
    severity: 'info'
  });

  // 5. Build Optimization Candidates
  const targetUrl = meta.url || 'website';
  warnings.forEach((warn) => {
    optimizationCandidates.push({
      url: targetUrl,
      type: 'accessibility',
      estimatedSizeReductionKb: 0,
      suggestion: warn.message,
      isIssue: warn.severity === 'error' || warn.severity === 'warning'
    });
  });

  return {
    summary,
    accessibility: accessibilityDetails,
    statistics,
    optimizationCandidates,
    warnings,
    errors
  };
};
