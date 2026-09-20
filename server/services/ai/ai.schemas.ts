export const EXPLANATION_JSON_SCHEMA = {
  type: 'object',
  required: [
    'title',
    'whatIsHappening',
    'whyItMatters',
    'evidenceExplanation',
    'knownFacts',
    'unknowns',
    'confidence'
  ],
  properties: {
    title: { type: 'string', description: 'Concise, professional title for the explanation.' },
    whatIsHappening: { type: 'string', description: 'Factual, plain-English diagnosis of the observed problem.' },
    whyItMatters: { type: 'string', description: 'Clear consequence for real users, SEO crawlers, or web vitals.' },
    evidenceExplanation: { type: 'string', description: 'Coherent connection of the provided evidence into an explanation.' },
    knownFacts: {
      type: 'array',
      items: { type: 'string' },
      description: 'Bullet points of observed measurements or facts directly derived from supplied evidence.'
    },
    unknowns: {
      type: 'array',
      items: { type: 'string' },
      description: 'Bullet points of analysis boundaries or items that cannot be determined from this evidence alone.'
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'Confidence in this explanation: high (direct measurement), medium (combined signals), low (requires more evidence).'
    },
    relatedFindingIds: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};
