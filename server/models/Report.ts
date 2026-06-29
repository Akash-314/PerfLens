import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMetricDetail {
  score: number;
  value: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface IRecommendation {
  category: string;
  issue: string;
  whyItMatters: string;
  suggestedFix: string;
  estimatedImprovement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'high' | 'medium' | 'low';
  refUrl: string;
}

export interface IReport extends Document {
  url: string;
  owner?: mongoose.Types.ObjectId;
  
  // Legacy properties (retained for backward compatibility, declared as non-optional to satisfy PDF generator compilation)
  scores: {
    overall: number;
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  };
  vitals: {
    fcp: IMetricDetail;
    lcp: IMetricDetail;
    fid: IMetricDetail;
    cls: IMetricDetail;
    ttfb: IMetricDetail;
    tbt: IMetricDetail;
  };
  breakdown: {
    images: { sizeKb: number; count: number };
    js: { sizeKb: number; count: number; unusedKb: number };
    css: { sizeKb: number; count: number; unusedKb: number };
    fonts: { sizeKb: number; count: number };
    thirdParty: { sizeKb: number; count: number };
  };
  bundleAnalysis: Array<{
    packageName: string;
    sizeKb: number;
    isUnused: boolean;
    isDuplicate: boolean;
  }>;
  images: Array<{
    src: string;
    sizeKb: number;
    format: string;
    suggestedFormat: string;
    savingsKb: number;
    hasAlt: boolean;
    lazyLoaded: boolean;
  }>;
  recommendations: IRecommendation[];
  resources: Array<{
    name: string;
    type: 'html' | 'js' | 'css' | 'image' | 'font' | 'other';
    sizeKb: number;
    timeMs: number;
    compression: string;
    cacheControl: string;
  }>;

  // Modern unified analysis properties (optional to support legacy document instances at runtime)
  metadata?: any;
  pagespeed?: any;
  puppeteer?: any;
  image?: any;
  css?: any;
  js?: any;
  seo?: any;
  accessibility?: any;
  recommendation?: any;
  overallHealthScore?: number;
  overallPerformanceGrade?: string;
  status: string;
  duration: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>({
  url: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Legacy properties schema mapping
  scores: { type: Schema.Types.Mixed, default: null },
  vitals: { type: Schema.Types.Mixed, default: null },
  breakdown: { type: Schema.Types.Mixed, default: null },
  bundleAnalysis: { type: Schema.Types.Mixed, default: null },
  images: { type: Schema.Types.Mixed, default: null },
  recommendations: { type: Schema.Types.Mixed, default: null },
  resources: { type: Schema.Types.Mixed, default: null },

  // Modern unified properties schema mapping
  metadata: { type: Schema.Types.Mixed, default: null },
  pagespeed: { type: Schema.Types.Mixed, default: null },
  puppeteer: { type: Schema.Types.Mixed, default: null },
  image: { type: Schema.Types.Mixed, default: null },
  css: { type: Schema.Types.Mixed, default: null },
  js: { type: Schema.Types.Mixed, default: null },
  seo: { type: Schema.Types.Mixed, default: null },
  accessibility: { type: Schema.Types.Mixed, default: null },
  recommendation: { type: Schema.Types.Mixed, default: null },
  overallHealthScore: {
    type: Number,
    index: true
  },
  overallPerformanceGrade: {
    type: String
  },
  status: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

const Report: Model<IReport> = mongoose.model<IReport>('Report', reportSchema);
export default Report;
