import mongoose from 'mongoose';

const ideaSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        competition: {
            type: Number,
            default: 0,
        },
        overall: {
            type: Number,
            default: 0,
        },
        searchVolume: {
            type: Number,
            default: 0,
        },
        thirtyDayAgoSearches: {
            type: Number,
            default: 0,
        },
        numberOfWords: {
            type: Number,
            default: 1,
        },
        convertedToTopic: {
            type: Boolean,
            default: false,
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

ideaSchema.index({ title: 'text' });
ideaSchema.index({ convertedToTopic: 1 });
ideaSchema.index({ userId: 1 });

export default mongoose.model('Idea', ideaSchema);
