import mongoose from 'mongoose';

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
