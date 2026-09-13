import { Page } from 'puppeteer';
import { PuppeteerScanResult } from '../puppeteer/types.js';
import {
  AccessibilityAnalysisResult,
  AccessibilityAnalysisSummary,
  AccessibilityAnalysisStatistics,
  AccessibilityAnalysisWarning,
  AccessibilityOptimizationCandidate
} from './types.js';

/**
 * Analyzes accessibility features of a website using the Puppeteer page DOM.
 * Checks for HTML lang attribute, page title, skip links, landmarks, and missing labels/alts.
 * 
 * @param page Active Puppeteer page instance
 * @param puppeteerResult Result object from the Puppeteer service
 * @returns AccessibilityAnalysisResult object
 */
export const analyzeAccessibility = async (
  page: Page | null,
  puppeteerResult: PuppeteerScanResult | null
): Promise<AccessibilityAnalysisResult> => {
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
  if (!meta || !page) {
    return {
      ...emptyResult,
      errors: errors.length > 0 ? errors : ['No active browser tab found for accessibility scans.']
    };
  }

  let domData: any = {
    htmlLang: '',
    hasTitle: false,
    images: [],
    inputs: [],
    buttons: [],
    links: [],
    landmarks: {
      hasHeader: false,
      hasNav: false,
      hasMain: false,
      hasFooter: false,
      hasAside: false
    },
    skipLink: null
  };

  try {
    domData = await page.evaluate(() => {
      // HTML lang and Title
      const htmlLang = document.documentElement.lang || '';
      const hasTitle = !!document.querySelector('title');

      // Images Alt Check
      const images = Array.from(document.querySelectorAll('img')).map(el => {
        const alt = el.getAttribute('alt');
        const selector = el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(/\s+/).join('.') : '');
        return {
          src: el.src || '',
          alt: alt !== null ? alt.trim() : null,
          selector,
          html: el.outerHTML
        };
      });

      // Inputs Label Check
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => {
        const id = el.getAttribute('id');
        const type = el.getAttribute('type');
        if (type === 'hidden' || type === 'submit' || type === 'button') return null;

        const ariaLabel = el.getAttribute('aria-label') || '';
        const ariaLabelledBy = el.getAttribute('aria-labelledby') || '';
        
        let hasLabel = false;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label && label.textContent?.trim()) hasLabel = true;
        }
        if (!hasLabel) {
          const parentLabel = el.closest('label');
          if (parentLabel && parentLabel.textContent?.trim()) hasLabel = true;
        }

        const selector = el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(/\s+/).join('.') : '');

        return {
          id,
          type,
          hasLabel: hasLabel || ariaLabel.length > 0 || ariaLabelledBy.length > 0,
          selector,
          html: el.outerHTML
        };
      }).filter(Boolean);

      // Buttons accessible name check
      const buttons = Array.from(document.querySelectorAll('button')).map(el => {
        const text = el.textContent?.trim() || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        const ariaLabelledBy = el.getAttribute('aria-labelledby') || '';
        const selector = el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(/\s+/).join('.') : '');
        return {
          hasLabel: text.length > 0 || ariaLabel.length > 0 || ariaLabelledBy.length > 0,
          selector,
          html: el.outerHTML
        };
      });

      // Links accessible name check
      const links = Array.from(document.querySelectorAll('a')).map(el => {
        const text = el.textContent?.trim() || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        const hasChildImgWithAlt = !!el.querySelector('img[alt]');
        const selector = el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(/\s+/).join('.') : '');
        return {
          hasLabel: text.length > 0 || ariaLabel.length > 0 || hasChildImgWithAlt,
          selector,
          html: el.outerHTML
        };
      });

      // Landmarks checks
      const hasHeader = !!document.querySelector('header, [role="banner"]');
      const hasNav = !!document.querySelector('nav, [role="navigation"]');
      const hasMain = !!document.querySelector('main, [role="main"]');
      const hasFooter = !!document.querySelector('footer, [role="contentinfo"]');
      const hasAside = !!document.querySelector('aside, [role="complementary"]');

      // Skip Navigation link checks
      const skipLink = Array.from(document.querySelectorAll('a')).find(el => {
        const text = el.textContent?.toLowerCase() || '';
        const href = el.getAttribute('href') || '';
        return text.includes('skip') || href.startsWith('#main');
      });

      return {
        htmlLang,
        hasTitle,
        images,
        inputs,
        buttons,
        links,
        landmarks: { hasHeader, hasNav, hasMain, hasFooter, hasAside },
        skipLink: skipLink ? { selector: skipLink.id ? '#' + skipLink.id : skipLink.tagName.toLowerCase() + (skipLink.className ? '.' + skipLink.className.split(/\s+/).join('.') : ''), html: skipLink.outerHTML } : null
      };
    });
  } catch (err: any) {
    console.error(`[Accessibility Service DOM extraction error]: ${err.message}`);
    errors.push(`DOM Extraction Failed: ${err.message}`);
  }

  // 1. Analyze and Compile Details
  const languageAttribute = domData.htmlLang || meta.language || null;
  const missingPageTitle = !domData.hasTitle;
  const missingHtmlLanguageAttribute = !languageAttribute || languageAttribute.trim().length === 0;

  const imagesMissingAltText = domData.images.filter((img: any) => img.alt === null).length;
  const emptyAltAttributes = domData.images.filter((img: any) => img.alt === '').length;
  const buttonsWithoutAccessibleLabels = domData.buttons.filter((b: any) => !b.hasLabel).length;
  const linksWithoutText = domData.links.filter((l: any) => !l.hasLabel).length;
  const formInputsWithoutLabels = domData.inputs.filter((i: any) => !i.hasLabel).length;
  
  const missingLandmarkElements = Object.values(domData.landmarks).filter(present => !present).length;
  const skipNavigationLink = domData.skipLink ? domData.skipLink.html : null;

  // Compile Accessibility Details with alignments for AppContext frontend mapping compatibility
  const accessibilityDetails: any = {
    imagesMissingAltText,
    emptyAltAttributes,
    buttonsWithoutAccessibleLabels,
    linksWithoutText,
    formInputsWithoutLabels,
    missingAriaLabels: formInputsWithoutLabels + buttonsWithoutAccessibleLabels,
    missingAriaRoles: 0,
    missingLandmarkElements,
    headingHierarchy: null,
    colorContrastIndicators: null,
    missingHtmlLanguageAttribute,
    missingPageTitle,
    missingFocusableElements: null,
    keyboardNavigationIndicators: null,
    skipNavigationLink,
    accessibleTableHeaders: null,
    // Realignment properties mapping to avoid "Missing" faking:
    htmlLang: !missingHtmlLanguageAttribute,
    title: !missingPageTitle,
    imagesWithoutAltCount: imagesMissingAltText,
    imagesWithoutAltUrls: domData.images.filter((img: any) => img.alt === null).map((img: any) => img.src)
  };

  // 2. Calculate Score & Summary
  // Accessibility Score:
  // Lang tag: 15 points
  // Page title: 15 points
  // Skip navigation link: 10 points
  // Form input labels: 20 points
  // Button labels: 15 points
  // Image alt text: 15 points
  // Landmark tags: 10 points
  let accessibilityScoreEstimate = 0;
  if (!missingHtmlLanguageAttribute) accessibilityScoreEstimate += 15;
  if (!missingPageTitle) accessibilityScoreEstimate += 15;
  if (skipNavigationLink) accessibilityScoreEstimate += 10;
  
  // Ratios for lists
  const inputRatio = domData.inputs.length > 0 ? (domData.inputs.length - formInputsWithoutLabels) / domData.inputs.length : 1;
  const buttonRatio = domData.buttons.length > 0 ? (domData.buttons.length - buttonsWithoutAccessibleLabels) / domData.buttons.length : 1;
  const imageRatio = domData.images.length > 0 ? (domData.images.length - imagesMissingAltText) / domData.images.length : 1;
  const landmarkRatio = (5 - missingLandmarkElements) / 5;

  accessibilityScoreEstimate += Math.round(inputRatio * 20);
  accessibilityScoreEstimate += Math.round(buttonRatio * 15);
  accessibilityScoreEstimate += Math.round(imageRatio * 15);
  accessibilityScoreEstimate += Math.round(landmarkRatio * 10);

  const summary: AccessibilityAnalysisSummary = {
    accessibilityScoreEstimate,
    imagesMissingAlt: imagesMissingAltText,
    formsMissingLabels: formInputsWithoutLabels,
    buttonsMissingLabels: buttonsWithoutAccessibleLabels,
    linksMissingText: linksWithoutText,
    headingIssues: null,
    ariaIssues: formInputsWithoutLabels + buttonsWithoutAccessibleLabels,
    missingLandmarks: missingLandmarkElements,
    missingSkipNavigation: !skipNavigationLink
  };

  // 3. Compute Statistics
  const statistics: AccessibilityAnalysisStatistics = {
    imagesCount: domData.images.length,
    formsCount: domData.inputs.length,
    buttonsCount: domData.buttons.length,
    linksCount: domData.links.length
  };

  // 4. Generate Warnings
  if (missingHtmlLanguageAttribute) {
    warnings.push({
      code: 'A11Y_NO_LANG',
      message: 'HTML language attribute is missing. Screen readers require the lang attribute to announce text pronunciations correctly.',
      severity: 'error'
    });
  }

  if (missingPageTitle) {
    warnings.push({
      code: 'A11Y_NO_TITLE' as any,
      message: 'Page title is missing. Titles identify the current page context to screen reader interfaces.',
      severity: 'error'
    });
  }

  if (!skipNavigationLink) {
    warnings.push({
      code: 'A11Y_NO_SKIP_LINK',
      message: 'Skip navigation link was not detected. Skip links allow keyboard users to bypass layout header items.',
      severity: 'warning'
    });
  }

  if (imagesMissingAltText > 0) {
    const missingAltImages = domData.images.filter((img: any) => img.alt === null).slice(0, 5);
    const selectors = missingAltImages.map((img: any) => img.selector).filter(Boolean).join(', ');
    warnings.push({
      code: 'A11Y_MISSING_ALT' as any,
      message: `${imagesMissingAltText} image(s) are missing alt description text${selectors ? ` (e.g. ${selectors})` : ''}. Visual assets must include alternative descriptions.`,
      severity: 'error'
    });
  }

  if (formInputsWithoutLabels > 0) {
    const unlabeledInputs = domData.inputs.filter((i: any) => !i.hasLabel).slice(0, 5);
    const selectors = unlabeledInputs.map((i: any) => i.selector).filter(Boolean).join(', ');
    warnings.push({
      code: 'A11Y_MISSING_ARIA',
      message: `${formInputsWithoutLabels} form inputs are missing associated label elements or aria-label attributes${selectors ? ` (e.g. ${selectors})` : ''}.`,
      severity: 'error'
    });
  }

  if (buttonsWithoutAccessibleLabels > 0) {
    const unlabeledButtons = domData.buttons.filter((b: any) => !b.hasLabel).slice(0, 5);
    const selectors = unlabeledButtons.map((b: any) => b.selector).filter(Boolean).join(', ');
    warnings.push({
      code: 'A11Y_MISSING_ARIA',
      message: `${buttonsWithoutAccessibleLabels} buttons are missing text content or accessible labels${selectors ? ` (e.g. ${selectors})` : ''}.`,
      severity: 'error'
    });
  }

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
    errors,
    validationEvidence: domData
  };
};
