export interface AccessibilityAnalysisSummary {
  accessibilityScoreEstimate: number; // 0-100
  imagesMissingAlt: number | null;
  formsMissingLabels: number | null;
  buttonsMissingLabels: number | null;
  linksMissingText: number | null;
  headingIssues: number | null;
  ariaIssues: number | null;
  missingLandmarks: number | null;
  missingSkipNavigation: boolean | null;
}

export interface AccessibilityDetails {
  imagesMissingAltText: string[] | null;
  emptyAltAttributes: string[] | null;
  buttonsWithoutAccessibleLabels: string[] | null;
  linksWithoutText: string[] | null;
  formInputsWithoutLabels: string[] | null;
  missingAriaLabels: boolean | null;
  missingAriaRoles: boolean | null;
  missingLandmarkElements: string[] | null;
  headingHierarchy: string[] | null;
  colorContrastIndicators: string | null;
  missingHtmlLanguageAttribute: boolean;
  missingPageTitle: boolean;
  missingFocusableElements: boolean | null;
  keyboardNavigationIndicators: string | null;
  skipNavigationLink: string | null;
  accessibleTableHeaders: boolean | null;
}

export interface AccessibilityAnalysisStatistics {
  imagesCount: number;
  formsCount: number;
  buttonsCount: number;
  linksCount: number;
}

export interface AccessibilityAnalysisWarning {
  code: 'A11Y_MISSING_ALT' | 'A11Y_EMPTY_ALT' | 'A11Y_BUTTON_NO_LABEL' | 'A11Y_INPUT_NO_LABEL' | 'A11Y_MISSING_ARIA' | 'A11Y_HEADING_STRUCTURE' | 'A11Y_NO_SKIP_LINK' | 'A11Y_NO_LANG';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface AccessibilityOptimizationCandidate {
  url: string;
  type: 'accessibility';
  estimatedSizeReductionKb: number;
  suggestion: string;
  isIssue: boolean;
}

export interface AccessibilityAnalysisResult {
  summary: AccessibilityAnalysisSummary;
  accessibility: AccessibilityDetails;
  statistics: AccessibilityAnalysisStatistics;
  optimizationCandidates: AccessibilityOptimizationCandidate[];
  warnings: AccessibilityAnalysisWarning[];
  errors: string[];
}
