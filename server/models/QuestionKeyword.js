import mongoose from 'mongoose';

const roundDownToOneDecimal = (val) => {
    if (val === null || val === undefined) return val;
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    return Math.floor(num * 10) / 10;
};

const questionKeywordSchema = new mongoose.Schema(
    {
        keyword: {
            type: String,
            required: true,
            trim: true,
        },
        competition: {
            type: Number,
            default: 0,
            set: roundDownToOneDecimal,
        },
        overall: {
            type: Number,
            required: true,
            default: 0,
            set: roundDownToOneDecimal,
        },
        searchVolume: {
            type: Number,
            default: 0,
        },
        thirtyDayAgoSearches: {
            type: Number,
            default: 0,
        },
        timestamp: {
            type: Number,
            default: null,
        },
        numberOfWords: {
            type: Number,
            default: 1,
        },
        addedToTitle: {
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

// Index for faster searching and filtering
questionKeywordSchema.index({ keyword: 'text' });
questionKeywordSchema.index({ overall: -1 });
questionKeywordSchema.index({ searchVolume: -1 });
questionKeywordSchema.index({ competition: 1 });
questionKeywordSchema.index({ userId: 1 });

export default mongoose.model('QuestionKeyword', questionKeywordSchema);
