import mongoose from 'mongoose';
import { fetchKeywordsForGroups } from '@/services/keywordHelper';

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
    scriptVersions: [
      {
        script: String,
        comments: String,
        generatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    audioVersions: [
      {
        audioUrl: String,
        audioUrls: [String],
        generatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
        url: String,
      }]],
      default: [],
    },
    thumbnailPromptResults: [
      {
        prompt: String,
        url: String,
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
    videoTranscript: {
      type: String,
      default: null,
    },
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
    audioUrls: {
      type: [String],
      default: [],
    },
    errorMessage: {
      type: String,
      default: null,
    },
    localVideoPath: {
      type: String,
      default: null,
    },
    privacyStatus: {
      type: String,
      enum: ['private', 'public', 'unlisted'],
      default: 'private',
    },
    youtubeUrl: {
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

topicSchema.methods.getKeywordsString = async function(): Promise<string> {
  if (this.groupingIds && this.groupingIds.length > 0) {
    const ids = this.groupingIds.map((g: any) => (g && g._id ? g._id : g));
    const uniqueKeywords = await fetchKeywordsForGroups(ids);
    return uniqueKeywords.map((kw) => `${kw.keyword} | ${kw.search_volume}`).join(', ');
  }
  return this.keywords || '';
};

export default mongoose.model('Topic', topicSchema);
