import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProject extends Document {
  name: string;
  websites: string[];
  owner: mongoose.Types.ObjectId;
  team: string[];
  createdAt: Date;
}

const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: [true, 'Please provide a workspace name'],
    trim: true
  },
  websites: [{
    type: String,
    trim: true
  }],
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  team: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Project: Model<IProject> = mongoose.model<IProject>('Project', projectSchema);
export default Project;
