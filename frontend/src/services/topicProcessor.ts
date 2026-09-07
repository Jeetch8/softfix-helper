import Topic from '@/models/Topic';
import { generateNarrationScript } from './geminiService';

async function processPendingTopics() {
  try {
    const pendingTopics = await Topic.find({ status: 'pending' }).limit(5);

    if (pendingTopics.length === 0) {
      console.log('📭 No pending topics to process');
      return;
    }

    console.log(`📋 Found ${pendingTopics.length} pending topics to process`);

    for (const topic of pendingTopics) {
      try {
        topic.status = 'processing';
        await topic.save();

        console.log(`⏳ Processing topic: "${topic.topicName}" (ID: ${topic._id})`);

        let videoTitle = topic.topicName;
        const keywordsStr = await (topic as any).getKeywordsString();
        if (keywordsStr) {
          const kwList = keywordsStr.split(',').map((k: string) => {
            const parts = k.split('|');
            return {
              keyword: parts[0]?.trim(),
              volume: parseInt(parts[1]?.trim()) || 0,
            };
          }).filter((k: any) => k.keyword);
          if (kwList.length > 0) {
            kwList.sort((a: any, b: any) => b.volume - a.volume);
            videoTitle = kwList[0].keyword;
          }
        }

        const scripts = await generateNarrationScript(
          topic.topicName,
          videoTitle,
          topic.description,
          topic.stepByStepInstructions,
          keywordsStr,
          topic.regenerationComments,
        );

        topic.narrationScript = scripts[0];
        topic.narrationScriptVariations = scripts.map((script: string, index: number) => ({
          prompt: topic.regenerationComments ? `Regenerated with comments: ${topic.regenerationComments.substring(0, 50)}...` : `Auto-generated Variation ${index + 1}`,
          result: script,
          generatedAt: new Date(),
        })) as any;

        (topic.scriptVersions as any).push({
          script: scripts[0],
          comments: topic.regenerationComments || 'Initial generation',
          generatedAt: new Date(),
        });

        topic.status = 'completed';
        topic.processedAt = new Date();
        topic.regenerationComments = null;
        await topic.save();

        console.log(`✅ Successfully processed topic: "${topic.topicName}"`);
      } catch (error) {
        console.error(`❌ Error processing topic "${topic.topicName}":`, error);
        topic.status = 'failed';
        topic.errorMessage = error instanceof Error ? error.message : String(error);
        await topic.save();
      }
    }
  } catch (error) {
    console.error('❌ Error in topic processor:', error);
  }
}

export async function processTopicsNow() {
  console.log('🚀 Manually triggering topic processing...');
  await processPendingTopics();
}
