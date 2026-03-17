import cron from 'node-cron';
import Topic from '../models/Topic.js';
import { generateNarrationScript } from './geminiService.js';

let cronJob = null;

export function startCronJob() {
  // Run the cron job every 2 minutes
  cronJob = cron.schedule('*/2 * * * *', async () => {
    console.log('🔄 Running cron job to process pending topics...');
    await processPendingTopics();
  });

  console.log('✅ Cron job scheduled - runs every 2 minutes');
}

export function stopCronJob() {
  if (cronJob) {
    cronJob.stop();
    console.log('⏹️ Cron job stopped');
  }
}

async function processPendingTopics() {
  try {
    // Find all pending topics
    const pendingTopics = await Topic.find({ status: 'pending' }).limit(5);

    if (pendingTopics.length === 0) {
      console.log('📭 No pending topics to process');
      return;
    }

    console.log(`📋 Found ${pendingTopics.length} pending topics to process`);

    for (const topic of pendingTopics) {
      try {
        // Update status to processing
        topic.status = 'processing';
        await topic.save();

        console.log(
          `⏳ Processing topic: "${topic.topicName}" (ID: ${topic._id})`,
        );

        // Generate narration script using Gemini AI
        const scripts = await generateNarrationScript(
          topic.topicName,
          topic.description,
          topic.keywords
        );

        // Update topic with generated scripts
        // scripts is an array of strings
        topic.narrationScript = scripts[0]; // Default to first variation
        topic.narrationScriptVariations = scripts.map((script, index) => ({
          prompt: `Auto-generated Variation ${index + 1}`,
          result: script,
        }));

        topic.status = 'completed';
        topic.processedAt = new Date();
        await topic.save();

        console.log(`✅ Successfully processed topic: "${topic.topicName}"`);
      } catch (error) {
        console.error(
          `❌ Error processing topic "${topic.topicName}":`,
          error.message,
        );

        // Update topic with error status
        topic.status = 'failed';
        topic.errorMessage = error.message;
        await topic.save();
      }
    }
  } catch (error) {
    console.error('❌ Error in cron job:', error.message);
  }
}

// Optional: Manual function to process topics immediately
export async function processTopicsNow() {
  console.log('🚀 Manually triggering topic processing...');
  await processPendingTopics();
}
