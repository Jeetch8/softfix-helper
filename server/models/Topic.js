import mongoose from 'mongoose';
import { fetchKeywordsForGroups } from '../services/keywordHelper.js';

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
    stepByStepInstructions: {
      type: String,
      default: '',
    },
    keywords: {
      type: String,
      default: '',
    },
    groupingIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grouping',
    }],
    narrationScript: {
      type: String,
      default: null,
    },
    recordingCues: {
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
    generatedThumbnails: {
      type: [[{
        index: Number,
        url: String, // S3 URL
      }]],
      default: [],
    },
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
    regenerationComments: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

topicSchema.methods.getKeywordsString = async function() {
  if (this.groupingIds && this.groupingIds.length > 0) {
    const ids = this.groupingIds.map((g) => (g && g._id ? g._id : g));
    const uniqueKeywords = await fetchKeywordsForGroups(ids);
    return uniqueKeywords.map((kw) => `${kw.keyword} | ${kw.search_volume}`).join(', ');
  }
  return this.keywords || '';
};

export default mongoose.model('Topic', topicSchema);
