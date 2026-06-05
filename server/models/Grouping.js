import mongoose from 'mongoose';

const roundDownToOneDecimal = (val) => {
    if (val === null || val === undefined) return val;
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    return Math.floor(num * 10) / 10;
};

const groupingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        keywords: {
            type: [[{
                id: {
                    type: String,
                },
                keyword: {
                    type: String,
                    required: true,
                },
                search_volume: {
                    type: Number,
                    default: 0,
                },
                overall: {
                    type: Number,
                    default: 0,
                    set: roundDownToOneDecimal,
                },
                competition: {
                    type: Number,
                    default: 0,
                    set: roundDownToOneDecimal,
                },
            }]],
            default: [],
        },
        total_average_volume: {
            type: Number,
            default: 0,
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

// Indexing for faster queries and searches
groupingSchema.index({ title: 'text' });
groupingSchema.index({ userId: 1 });

export default mongoose.model('Grouping', groupingSchema);
