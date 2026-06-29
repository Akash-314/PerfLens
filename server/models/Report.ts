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
  createdAt: Date;
}

const metricDetailSchema = new Schema<IMetricDetail>({
  score: Number,
  value: String,
  rating: {
    type: String,
    enum: ['good', 'needs-improvement', 'poor']
  }
}, { _id: false });

const recommendationSchema = new Schema<IRecommendation>({
  category: String,
  issue: String,
  whyItMatters: String,
  suggestedFix: String,
  estimatedImprovement: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard']
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low']
  },
  refUrl: String
}, { _id: false });

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
  scores: {
    overall: Number,
    performance: Number,
    accessibility: Number,
    seo: Number,
    bestPractices: Number
  },
  vitals: {
    fcp: metricDetailSchema,
    lcp: metricDetailSchema,
    fid: metricDetailSchema,
    cls: metricDetailSchema,
    ttfb: metricDetailSchema,
    tbt: metricDetailSchema
  },
  breakdown: {
    images: { sizeKb: Number, count: Number },
    js: { sizeKb: Number, count: Number, unusedKb: Number },
    css: { sizeKb: Number, count: Number, unusedKb: Number },
    fonts: { sizeKb: Number, count: Number },
    thirdParty: { sizeKb: Number, count: Number }
  },
  bundleAnalysis: [{
    packageName: String,
    sizeKb: Number,
    isUnused: Boolean,
    isDuplicate: Boolean
  }],
  images: [{
    src: String,
    sizeKb: Number,
    format: String,
    suggestedFormat: String,
    savingsKb: Number,
    hasAlt: Boolean,
    lazyLoaded: Boolean
  }],
  recommendations: [recommendationSchema],
  resources: [{
    name: String,
    type: {
      type: String,
      enum: ['html', 'js', 'css', 'image', 'font', 'other']
    },
    sizeKb: Number,
    timeMs: Number,
    compression: String,
    cacheControl: String
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const Report: Model<IReport> = mongoose.model<IReport>('Report', reportSchema);
export default Report;
