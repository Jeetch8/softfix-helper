import mongoose from 'mongoose';

const groupingsGroupSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        numberOfGroups: {
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
    }
);

// Indexing for faster queries and searches
groupingsGroupSchema.index({ title: 'text' });
groupingsGroupSchema.index({ userId: 1 });

export default mongoose.model('GroupingsGroup', groupingsGroupSchema);
