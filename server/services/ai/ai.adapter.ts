import { ExplanationInput, VerifiedEvidenceItem, FindingCategory, FindingSeverity } from './ai.types.js';

export class EvidenceGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceGateError';
  }
}

/**
 * Strips any potential tokens, authorization headers, passwords, cookies, or database keys from strings.
 */
function sanitizeText(value: any): string {
  if (typeof value !== 'string') {
    if (value === null || value === undefined) return '';
    return String(value);
  }
  return value
    .replace(/(bearer\s+)[a-zA-Z0-9_.-]+/gi, '$1[REDACTED]')
    .replace(/(api[_-]?key[:=]\s*)[a-zA-Z0-9_-]+/gi, '$1[REDACTED]')
    .replace(/(secret[:=]\s*)[a-zA-Z0-9_-]+/gi, '$1[REDACTED]')
    .replace(/(password[:=]\s*)[^\s&]+/gi, '$1[REDACTED]')
    .trim();
}

/**
 * Adapts and normalizes a verified finding and evidence into a minimal, clean ExplanationInput.
 * Strictly enforces the Evidence Gate: No finding or no evidence -> Error thrown.
 */
export function adaptFindingToExplanationInput(finding: any, context?: any): ExplanationInput {
  if (!finding) {
    throw new EvidenceGateError('Evidence Gate violation: No finding provided to AI Explainer.');
  }

  const findingId = finding.id || finding.code || finding.findingId;
  if (!findingId || typeof findingId !== 'string') {
    throw new EvidenceGateError('Evidence Gate violation: Finding must possess a valid identifier.');
  }

  const title = finding.issue || finding.title || finding.name;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new EvidenceGateError('Evidence Gate violation: Finding title or issue description is missing.');
  }

  // Extract and normalize evidence
  const rawEvidence = finding.evidence || finding.evidenceDetails || [];
  const normalizedEvidence: VerifiedEvidenceItem[] = [];

  if (typeof rawEvidence === 'string' && rawEvidence.trim().length > 0) {
    normalizedEvidence.push({
      id: 'E001',
      source: sanitizeText(finding.source || 'perflens-engine'),
      value: sanitizeText(rawEvidence),
      details: { text: sanitizeText(rawEvidence) }
    });
  } else if (Array.isArray(rawEvidence) && rawEvidence.length > 0) {
    rawEvidence.forEach((item, index) => {
      if (!item) return;
      if (typeof item === 'string') {
        normalizedEvidence.push({
          id: `E${String(index + 1).padStart(3, '0')}`,
          source: sanitizeText(finding.source || 'perflens-engine'),
          details: { text: sanitizeText(item) }
        });
      } else if (typeof item === 'object') {
        const evId = item.id || `E${String(index + 1).padStart(3, '0')}`;
        normalizedEvidence.push({
          id: String(evId),
          source: sanitizeText(item.source || finding.source || 'perflens-engine'),
          metric: item.metric ? sanitizeText(item.metric) : undefined,
          value: item.value !== undefined ? item.value : (item.duration !== undefined ? item.duration : (item.sizeKb !== undefined ? item.sizeKb : undefined)),
          unit: item.unit ? sanitizeText(item.unit) : (item.duration !== undefined ? 'ms' : (item.sizeKb !== undefined ? 'KB' : undefined)),
          resource: item.resource ? sanitizeText(item.resource) : undefined,
          selector: item.selector ? sanitizeText(item.selector) : undefined,
          details: item.details ? JSON.parse(JSON.stringify(item.details)) : undefined
        });
      }
    });
  }

  // Also check standardFinding explanation if available
  if (normalizedEvidence.length === 0 && finding.standardFinding?.explanation?.observedEvidence) {
    normalizedEvidence.push({
      id: 'E001',
      source: 'perflens-engine',
      details: { text: sanitizeText(finding.standardFinding.explanation.observedEvidence) }
    });
  }

  // Also check finding.finding object if available
  if (normalizedEvidence.length === 0 && finding.finding) {
    const findingDesc = finding.finding.description || (finding.finding.metric ? `${finding.finding.metric}: ${finding.finding.value ?? ''}${finding.finding.unit ?? ''}` : '');
    if (findingDesc && findingDesc.trim().length > 0) {
      normalizedEvidence.push({
        id: 'E001',
        source: sanitizeText(finding.source || 'perflens-engine'),
        metric: finding.finding.metric ? sanitizeText(finding.finding.metric) : undefined,
        value: finding.finding.value !== undefined ? finding.finding.value : undefined,
        unit: finding.finding.unit ? sanitizeText(finding.finding.unit) : undefined,
        details: { text: sanitizeText(findingDesc) }
      });
    }
  }

  // Also check verified impact/whyItMatters if present
  if (normalizedEvidence.length === 0 && finding.whyItMatters && typeof finding.whyItMatters === 'string' && finding.whyItMatters.trim().length > 0) {
    normalizedEvidence.push({
      id: 'E001',
      source: sanitizeText(finding.source || 'perflens-engine'),
      details: { text: sanitizeText(finding.whyItMatters) }
    });
  }

  // Mandatory Evidence Gate: Evidence MUST exist
  if (normalizedEvidence.length === 0) {
    throw new EvidenceGateError(`Evidence Gate violation: Finding "${findingId}" has no verified evidence.`);
  }

  // Normalize category
  const rawCat = (finding.category || 'performance').toLowerCase();
  const validCategories: FindingCategory[] = [
    'performance',
    'accessibility',
    'seo',
    'images',
    'js',
    'css',
    'best-practices',
    'security'
  ];
  const category: FindingCategory = validCategories.includes(rawCat as any)
    ? (rawCat as FindingCategory)
    : 'performance';

  // Normalize severity
  const rawSev = (finding.severity || finding.priority || 'medium').toLowerCase();
  const validSeverities: FindingSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
  const severity: FindingSeverity = validSeverities.includes(rawSev as any)
    ? (rawSev as FindingSeverity)
    : 'medium';

  const sanitizedUrl = sanitizeText(finding.url || finding.sourceUrl || context?.url || '');

  // Extract known context if verified
  let knownContext: ExplanationInput['knownContext'] = undefined;
  if (context || finding.standardFinding) {
    knownContext = {};
    if (context?.totalJsKb) knownContext.totalJsKb = context.totalJsKb;
    if (context?.totalRequests) knownContext.totalRequests = context.totalRequests;
    if (context?.framework && context?.frameworkVerified) {
      knownContext.framework = sanitizeText(context.framework);
      knownContext.verifiedFramework = true;
    }
  }

  // Bound evidence to at most 15 items to prevent uncontrolled prompt growth (Section 51)
  const boundedEvidence = normalizedEvidence.slice(0, 15);

  return {
    findingId: sanitizeText(findingId),
    category,
    severity,
    title: sanitizeText(title),
    url: sanitizedUrl || undefined,
    evidence: boundedEvidence,
    knownContext
  };
}

export const adaptFindingToAIInput = adaptFindingToExplanationInput;

