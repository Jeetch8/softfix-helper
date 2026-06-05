// import mongoose from 'mongoose';

// const roundDownToOneDecimal = (val) => {
//     if (val === null || val === undefined) return val;
//     const num = parseFloat(val);
//     if (isNaN(num)) return 0;
//     return Math.floor(num * 10) / 10;
// };

// const ideaSchema = new mongoose.Schema(
//     {
//         title: {
//             type: String,
//             required: true,
//             trim: true,
//         },
//         description: {
//             type: String,
//             default: '',
//         },
//         competition: {
//             type: Number,
//             default: 0,
//             set: roundDownToOneDecimal,
//         },
//         overall: {
//             type: Number,
//             default: 0,
//             set: roundDownToOneDecimal,
//         },
//         searchVolume: {
//             type: Number,
//             default: 0,
//         },
//         thirtyDayAgoSearches: {
//             type: Number,
//             default: 0,
//         },
//         numberOfWords: {
//             type: Number,
//             default: 1,
//         },
//         convertedToTopic: {
//             type: Boolean,
//             default: false,
//         },
//         userId: {
//             type: String,
//             default: 'default-user',
//         },
//     },
//     {
//         timestamps: true,
//     },
// );

// ideaSchema.index({ title: 'text' });
// ideaSchema.index({ convertedToTopic: 1 });
// ideaSchema.index({ userId: 1 });

// export default mongoose.model('Idea', ideaSchema);
