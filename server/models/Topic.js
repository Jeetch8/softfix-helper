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
    // Store 4 variations of narration scripts with their prompts
    narrationScriptVariations: [
      {
        prompt: String,
        result: String,
        generatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
    // Store 4 variations of title prompts and their results
    titlePromptVariations: [
      {
        prompt: String,
        result: String,
        generatedAt: {
          type: Date,
          default: Date.now,
        },
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
    // Store 4 variations of thumbnail prompts and their results
    thumbnailPromptResults: [
      {
        prompt: String,
        url: String, // S3 URL
        generatedAt: {
          type: Date,
          default: Date.now,
        },
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
