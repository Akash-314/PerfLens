import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISavedComparison extends Document {
  url1: string;
  url2: string;
  report1: mongoose.Types.ObjectId;
  report2: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
}

const savedComparisonSchema = new Schema<ISavedComparison>({
  url1: {
    type: String,
    required: true
  },
  url2: {
    type: String,
    required: true
  },
  report1: {
    type: Schema.Types.ObjectId,
    ref: 'Report',
    required: true
  },
  report2: {
    type: Schema.Types.ObjectId,
    ref: 'Report',
    required: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SavedComparison: Model<ISavedComparison> = mongoose.model<ISavedComparison>('SavedComparison', savedComparisonSchema);
export default SavedComparison;
