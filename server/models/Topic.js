import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    topicName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    narrationScript: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    level: {
      type: String,
      enum: ['scripting', 'title', 'thumbnail', 'finished', 'editing', 'uploaded'],
      default: 'scripting',
    },
    generatedTitles: [
      {
        type: String,
      },
    ],
    selectedTitle: {
      type: String,
      default: null,
    },
    generatedThumbnails: [
      {
        index: Number,
        url: String, // S3 URL
      },
    ],
    selectedThumbnail: {
      type: String,
      default: null,
    },
    seoDescription: {
      type: String,
      default: null,
    },
    tags: [
      {
        type: String,
      },
    ],
    timestamps: [
      {
        time: String,
        description: String,
      },
    ],
    audioUrl: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    userId: {
      type: String,
      default: 'default-user',
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('Topic', topicSchema);
