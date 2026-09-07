import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Topic from '@/models/Topic';
import Grouping from '@/models/Grouping';
import { resolveMediaUrl } from '@/services/s3Service';

async function resolveTopicMediaUrls(topicObj: any) {
  if (topicObj.selectedThumbnail) topicObj.selectedThumbnail = await resolveMediaUrl(topicObj.selectedThumbnail);
  if (topicObj.audioUrl) topicObj.audioUrl = await resolveMediaUrl(topicObj.audioUrl);
  if (topicObj.audioUrls?.length) topicObj.audioUrls = await Promise.all(topicObj.audioUrls.map(resolveMediaUrl));
  if (topicObj.generatedThumbnails) {
    for (let i = 0; i < topicObj.generatedThumbnails.length; i++) {
      for (let j = 0; j < topicObj.generatedThumbnails[i].length; j++) {
        topicObj.generatedThumbnails[i][j].url = await resolveMediaUrl(topicObj.generatedThumbnails[i][j].url);
      }
    }
  }
  if (topicObj.thumbnailPromptResults) {
    for (let i = 0; i < topicObj.thumbnailPromptResults.length; i++) {
      topicObj.thumbnailPromptResults[i].url = await resolveMediaUrl(topicObj.thumbnailPromptResults[i].url);
    }
  }
  if (topicObj.audioVersions) {
    for (let i = 0; i < topicObj.audioVersions.length; i++) {
      if (topicObj.audioVersions[i].audioUrl) topicObj.audioVersions[i].audioUrl = await resolveMediaUrl(topicObj.audioVersions[i].audioUrl);
      if (topicObj.audioVersions[i].audioUrls?.length) topicObj.audioVersions[i].audioUrls = await Promise.all(topicObj.audioVersions[i].audioUrls.map(resolveMediaUrl));
    }
  }
  return topicObj;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const topics = await Topic.find(userId ? { userId } : {}).populate('groupingIds').sort({ createdAt: -1 });
    const data = await Promise.all(topics.map(async (topic) => {
      const topicObj = topic.toObject();
      topicObj.keywords = await (topic as any).getKeywordsString();
      return resolveTopicMediaUrls(topicObj);
    }));
    return NextResponse.json({ success: true, message: 'Topics retrieved successfully', count: data.length, data });
  } catch (error) {
    console.error('Error retrieving topics:', error);
    return NextResponse.json({ success: false, message: 'Error retrieving topics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { topicName, description, stepByStepInstructions, groupingIds, userId } = body;
    if (!topicName || topicName.trim() === '') {
      return NextResponse.json({ success: false, message: 'Topic name is required' }, { status: 400 });
    }
    const newTopic = new Topic({
      topicName: topicName.trim(),
      description: description || '',
      stepByStepInstructions: stepByStepInstructions || '',
      groupingIds: Array.isArray(groupingIds) ? groupingIds : [],
      userId: userId || 'default-user',
      status: 'completed',
    });
    await newTopic.save();
    if (newTopic.groupingIds?.length) {
      await Grouping.updateMany({ _id: { $in: newTopic.groupingIds } }, { $set: { isUsed: true } });
    }
    console.log(`New topic created: "${topicName}" (ID: ${newTopic._id})`);
    return NextResponse.json({ success: true, message: 'Topic created successfully.', data: newTopic }, { status: 201 });
  } catch (error) {
    console.error('Error creating topic:', error);
    return NextResponse.json({ success: false, message: 'Error creating topic' }, { status: 500 });
  }
}
