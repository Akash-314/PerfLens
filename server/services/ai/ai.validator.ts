import { ExplanationInput, ExplanationOutput, ExplanationConfidence } from './ai.types.js';

export interface ValidationResult {
  valid: boolean;
  data?: ExplanationOutput;
  errors: string[];
}

const COMMON_FRAMEWORKS = [
  'react',
  'next.js',
  'nextjs',
  'vue',
  'nuxt',
  'angular',
  'svelte',
  'gatsby',
  'remix',
  'astro',
  'wordpress',
  'laravel',
  'django'
];

const COMMON_LIBRARIES = [
  'lodash',
  'jquery',
  'moment',
  'momentjs',
  'redux',
  'mobx',
  'zustand'
];

/**
 * Parses raw model text into structured JSON, stripping markdown code blocks if present.
 */
export function parseModelJson(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Model returned empty response.');
  }

  let cleaned = rawText.trim();
  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  }

  // Handle accidental outer quotes
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error(`Model output is not valid JSON: ${err.message}`);
  }
}

/**
 * Validates the structured output against schema and hallucination guard rules.
 */
export function validateExplanationOutput(
  rawJson: any,
  input: ExplanationInput,
  meta: { model: string; provider: string; promptVersion: string }
): ValidationResult {
  const errors: string[] = [];

  if (!rawJson || typeof rawJson !== 'object') {
    return { valid: false, errors: ['Output must be a JSON object.'] };
  }

  // 1. Validate required fields
  const requiredStringFields: (keyof ExplanationOutput)[] = [
    'title',
    'whatIsHappening',
    'whyItMatters',
    'evidenceExplanation'
  ];

  for (const field of requiredStringFields) {
    if (typeof rawJson[field] !== 'string' || rawJson[field].trim().length === 0) {
      errors.push(`Field "${field}" is required and must be a non-empty string.`);
    }
  }

  // 2. Validate knownFacts and unknowns
  if (!Array.isArray(rawJson.knownFacts) || rawJson.knownFacts.length === 0) {
    errors.push('Field "knownFacts" must be a non-empty array of strings.');
  } else {
    for (const item of rawJson.knownFacts) {
      if (typeof item !== 'string' || item.trim().length === 0) {
        errors.push('Each entry in "knownFacts" must be a non-empty string.');
        break;
      }
    }
  }

  if (!Array.isArray(rawJson.unknowns) || rawJson.unknowns.length === 0) {
    errors.push('Field "unknowns" must be a non-empty array of strings.');
  } else {
    for (const item of rawJson.unknowns) {
      if (typeof item !== 'string' || item.trim().length === 0) {
        errors.push('Each entry in "unknowns" must be a non-empty string.');
        break;
      }
    }
  }

  // 3. Validate confidence
  const validConfidences: ExplanationConfidence[] = ['high', 'medium', 'low'];
  const confidence: ExplanationConfidence = validConfidences.includes(rawJson.confidence)
    ? rawJson.confidence
    : 'medium';

  if (!validConfidences.includes(rawJson.confidence)) {
    errors.push(`Field "confidence" must be one of "high", "medium", or "low".`);
  }

  // If initial schema checks failed, stop early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 4. Hallucination Guard
  const combinedText = [
    rawJson.title,
    rawJson.whatIsHappening,
    rawJson.whyItMatters,
    rawJson.evidenceExplanation,
    ...(rawJson.knownFacts || []),
    ...(rawJson.unknowns || [])
  ].join(' ');

  // 4A. Check for unsupplied framework claims
  const suppliedFramework = (input.knownContext?.framework || '').toLowerCase();
  const lowerCombined = combinedText.toLowerCase();

  for (const fw of COMMON_FRAMEWORKS) {
    if (lowerCombined.includes(fw) && !suppliedFramework.includes(fw)) {
      // Check if evidence specifically mentions it (e.g. script resource containing 'react')
      const evidenceMentionsFw = input.evidence.some((e) =>
        JSON.stringify(e).toLowerCase().includes(fw)
      );
      if (!evidenceMentionsFw) {
        errors.push(`Hallucination guard rejected unsupported framework claim: "${fw}".`);
      }
    }
  }

  // 4B. Check for unsupplied library claims
  for (const lib of COMMON_LIBRARIES) {
    const regex = new RegExp(`\\b${lib}\\b`, 'i');
    if (regex.test(combinedText)) {
      const evidenceMentionsLib = input.evidence.some((e) =>
        JSON.stringify(e).toLowerCase().includes(lib)
      );
      if (!evidenceMentionsLib) {
        errors.push(`Hallucination guard rejected unsupported library claim: "${lib}".`);
      }
    }
  }

  // 4C. Check for invented source code filenames (e.g. src/App.tsx, index.js, components/...)
  const filenameMatch = combinedText.match(/\b(src\/[a-zA-Z0-9_./-]+|\b[a-zA-Z0-9_-]+\.(tsx|jsx|vue|svelte|php|rb|py)\b)/i);
  if (filenameMatch) {
    const matchedName = filenameMatch[0];
    const evidenceHasFile = input.evidence.some((e) =>
      JSON.stringify(e).includes(matchedName)
    );
    if (!evidenceHasFile) {
      errors.push(`Hallucination guard rejected unsupported file reference: "${matchedName}".`);
    }
  }

  // 4D. Check for unsupported absolute penalty claims (e.g. "Google will penalize")
  if (/\b(will penalize|penalized by google|rankings will plummet|traffic will decrease by \d+%)\b/i.test(combinedText)) {
    errors.push('Hallucination guard rejected unsupported absolute claim or penalty speculation.');
  }

  // 4E. Check evidence reference integrity (e.g. E001, E002)
  const evidenceRefMatches = combinedText.match(/\bE\d{3}\b/g);
  if (evidenceRefMatches) {
    const validEvidenceIds = new Set(input.evidence.map((e) => e.id));
    for (const ref of evidenceRefMatches) {
      if (!validEvidenceIds.has(ref)) {
        errors.push(`Hallucination guard rejected non-existent evidence ID "${ref}".`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const sanitizedOutput: ExplanationOutput = {
    title: rawJson.title.trim().slice(0, 500),
    whatIsHappening: rawJson.whatIsHappening.trim().slice(0, 5000),
    whyItMatters: rawJson.whyItMatters.trim().slice(0, 5000),
    evidenceExplanation: rawJson.evidenceExplanation.trim().slice(0, 5000),
    knownFacts: rawJson.knownFacts.slice(0, 20).map((s: string) => s.trim().slice(0, 500)),
    unknowns: rawJson.unknowns.slice(0, 20).map((s: string) => s.trim().slice(0, 500)),
    confidence,
    relatedFindingIds: Array.isArray(rawJson.relatedFindingIds) ? rawJson.relatedFindingIds.slice(0, 10) : undefined,
    source: 'ai',
    promptVersion: meta.promptVersion,
    model: meta.model,
    provider: meta.provider
  };

  return {
    valid: true,
    data: sanitizedOutput,
    errors: []
  };
}

/**
 * High-level helper combining JSON stripping, schema validation, and hallucination guard.
 */
export function validateAIExplanation(
  rawInput: any,
  input: ExplanationInput,
  meta: { model: string; provider: string; promptVersion: string } = {
    model: 'test-model',
    provider: 'test-provider',
    promptVersion: 'explainer.v1'
  }
): { isValid: boolean; output?: ExplanationOutput; errors: string[] } {
  let parsed = rawInput;
  if (typeof rawInput === 'string') {
    try {
      parsed = parseModelJson(rawInput);
    } catch (err: any) {
      return { isValid: false, errors: [err.message] };
    }
  }
  const result = validateExplanationOutput(parsed, input, meta);
  return {
    isValid: result.valid,
    output: result.data,
    errors: result.errors
  };
}

