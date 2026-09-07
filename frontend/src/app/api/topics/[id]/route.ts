import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Topic from '@/models/Topic';
import Grouping from '@/models/Grouping';
import { processTopicsNow } from '@/services/topicProcessor';
import { generateYouTubeTitles, generateYouTubeThumbnails, generateSEODescription, generateTags, generateRecordingCues, generateVideoChapters, annotateScriptChunks } from '@/services/geminiService';
import { generateWAVAudio } from '@/services/audioService';
import { deleteImageFromS3, uploadImageToS3, resolveMediaUrl } from '@/services/s3Service';

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const topic = await Topic.findById(id).populate('groupingIds');
    if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
    const topicObj = topic.toObject();
    topicObj.keywords = await (topic as any).getKeywordsString();
    const resolved = await resolveTopicMediaUrls(topicObj);
    return NextResponse.json({ success: true, message: 'Topic retrieved successfully', data: resolved });
  } catch (error) {
    console.error('Error retrieving topic:', error);
    return NextResponse.json({ success: false, message: 'Error retrieving topic' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const topic = await Topic.findByIdAndDelete(id);
    if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
    if (topic.groupingIds?.length) {
      for (const groupId of topic.groupingIds) {
        const count = await Topic.countDocuments({ groupingIds: groupId });
        if (count === 0) await Grouping.findByIdAndUpdate(groupId, { isUsed: false });
      }
    }
    return NextResponse.json({ success: true, message: 'Topic deleted successfully', data: topic });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return NextResponse.json({ success: false, message: 'Error deleting topic' }, { status: 500 });
  }
}

// PUT endpoints for individual fields
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const pathname = request.nextUrl.pathname;
    const field = pathname.split('/').pop(); // script, description, keywords, name, instructions, audio, update-title

    if (!['script', 'description', 'keywords', 'name', 'instructions', 'audio', 'update-title'].includes(field!)) {
      return NextResponse.json({ success: false, message: 'Invalid field' }, { status: 400 });
    }

    const body = await request.json();
    let topic: any;

    switch (field) {
      case 'script': {
        const { narrationScript } = body;
        if (!narrationScript || narrationScript.trim() === '') {
          return NextResponse.json({ success: false, message: 'Narration script is required' }, { status: 400 });
        }
        topic = await Topic.findByIdAndUpdate(
          id,
          {
            $set: { narrationScript: narrationScript.trim(), status: 'completed', processedAt: new Date() },
            $push: { scriptVersions: { script: narrationScript.trim(), comments: 'Manual edit', generatedAt: new Date() } },
          },
          { new: true }
        ) as any;
        break;
      }
      case 'description': {
        const { description } = body;
        if (description === undefined) return NextResponse.json({ success: false, message: 'Description is required' }, { status: 400 });
        topic = await Topic.findByIdAndUpdate(id, { description: description.trim() }, { new: true }).populate('groupingIds');
        break;
      }
      case 'keywords': {
        const { keywords } = body;
        if (keywords === undefined) return NextResponse.json({ success: false, message: 'Keywords are required' }, { status: 400 });
        await Topic.findByIdAndUpdate(
          id,
          { keywords: keywords.trim(), groupingIds: [] }
        );
        const t = await Topic.findById(id).populate('groupingIds') as any;
        const topicObj = t.toObject();
        topicObj.keywords = await t.getKeywordsString();
        return NextResponse.json({ success: true, message: 'Keywords updated successfully', data: topicObj });
      }
      case 'name': {
        const { topicName } = body;
        if (!topicName || topicName.trim() === '') return NextResponse.json({ success: false, message: 'Topic name is required' }, { status: 400 });
        topic = await Topic.findByIdAndUpdate(id, { topicName: topicName.trim() }, { new: true }).populate('groupingIds');
        break;
      }
      case 'instructions': {
        const { stepByStepInstructions } = body;
        if (stepByStepInstructions === undefined) return NextResponse.json({ success: false, message: 'Step-by-step instructions are required' }, { status: 400 });
        topic = await Topic.findByIdAndUpdate(id, { stepByStepInstructions: stepByStepInstructions.trim() }, { new: true }).populate('groupingIds');
        break;
      }
      case 'audio': {
        const { audioUrl, audioUrls } = body;
        if (!audioUrl && (!audioUrls || audioUrls.length === 0)) {
          return NextResponse.json({ success: false, message: 'Audio URL or URLs are required' }, { status: 400 });
        }
        const updateData: any = {};
        if (audioUrl) updateData.audioUrl = audioUrl.trim();
        if (audioUrls?.length) updateData.audioUrls = audioUrls;
        if (!audioUrl && audioUrls?.length) updateData.audioUrl = audioUrls[0];
        topic = await Topic.findByIdAndUpdate(id, updateData, { new: true }).populate('groupingIds');
        break;
      }
      case 'update-title': {
        const { title } = body;
        if (!title || title.trim() === '') return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
        topic = await Topic.findByIdAndUpdate(id, { selectedTitle: title.trim() }, { new: true }).populate('groupingIds');
        break;
      }
    }

    if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
    const topicObj = await resolveTopicMediaUrls(topic.toObject());
    return NextResponse.json({ success: true, message: `${field} updated successfully`, data: topicObj });
  } catch (error) {
    console.error('Error updating topic:', error);
    return NextResponse.json({ success: false, message: 'Error updating topic' }, { status: 500 });
  }
}

// POST endpoints for topic actions
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const pathname = request.nextUrl.pathname;
  try {
    await connectDB();
    const { id } = await params;
    const action = pathname.split('/').pop(); // regenerate, generate-titles, generate-thumbnails, upload-thumbnail, skip-thumbnail, select-thumbnail, generate-extra-assets, generate-chapters, mark-editing, mark-uploaded, generate-cues, regenerate-audio

    let topic: any;

    switch (action) {
      case 'regenerate': {
        const body = await request.json();
        const { comments } = body;
        topic = await Topic.findById(id);
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        topic.status = 'pending';
        topic.narrationScript = null;
        topic.errorMessage = null;
        topic.regenerationComments = comments || null;
        await topic.save();
        await topic.populate('groupingIds');
        await processTopicsNow();
        return NextResponse.json({ success: true, message: 'Narration script regeneration triggered', data: topic });
      }
      case 'generate-titles': {
        topic = await Topic.findById(id);
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        let titleStr = '';
        const keywords = await topic.getKeywordsString();
        if (keywords.trim()) {
          const items = keywords.split(/[,\n]/);
          const kwList = [];
          for (const item of items) {
            if (!item.trim()) continue;
            const parts = item.split('|');
            const kwName = parts[0]?.trim();
            const kwVolume = parseInt(parts[1]?.trim()) || 0;
            if (kwName) kwList.push({ name: kwName, volume: kwVolume });
          }
          kwList.sort((a, b) => b.volume - a.volume);
          const titleParts: string[] = [];
          let currentLen = 0;
          for (const kw of kwList) {
            const capitalized = kw.name.split(/\s+/).map((w: string) => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
            const partLen = capitalized.length;
            if (currentLen === 0) {
              if (partLen > 100) { titleParts.push(capitalized.substring(0, 100)); break; }
              titleParts.push(capitalized);
              currentLen += partLen;
            } else {
              if (currentLen + 3 + partLen <= 100) { titleParts.push(capitalized); currentLen += 3 + partLen; } else break;
            }
          }
          titleStr = titleParts.join(' | ');
        }
        if (!titleStr) {
          titleStr = topic.topicName.split(/\s+/).map((w: string) => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
          if (titleStr.length > 100) titleStr = titleStr.substring(0, 100);
        }
        topic.selectedTitle = titleStr;
        topic.level = 'thumbnail';
        await topic.save();
        return NextResponse.json({ success: true, message: 'YouTube title generated successfully', data: { _id: topic._id, topicName: topic.topicName, selectedTitle: titleStr } });
      }
      case 'generate-thumbnails': {
        topic = await Topic.findById(id);
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        if (!topic.selectedTitle) return NextResponse.json({ success: false, message: 'Topic must have a selected title' }, { status: 400 });
        const thumbnails = await generateYouTubeThumbnails(topic.topicName, topic.selectedTitle, topic.narrationScript, await topic.getKeywordsString());
        if (topic.generatedThumbnails?.length && !Array.isArray(topic.generatedThumbnails[0])) {
          topic.generatedThumbnails = [topic.generatedThumbnails];
        }
        topic.generatedThumbnails.push(thumbnails);
        topic.level = 'thumbnail';
        await topic.save();
        const topicObj = await resolveTopicMediaUrls(topic.toObject());
        return NextResponse.json({ success: true, message: 'YouTube thumbnails generated successfully', data: topicObj });
      }
      case 'upload-thumbnail': {
        const formData = await request.formData();
        const file = formData.get('thumbnail') as File;
        if (!file) return NextResponse.json({ success: false, message: 'No thumbnail file uploaded' }, { status: 400 });
        topic = await Topic.findById(id);
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        const buffer = Buffer.from(await file.arrayBuffer());
        const s3Url = await uploadImageToS3(buffer, file.name, file.type);
        topic.selectedThumbnail = s3Url;
        topic.level = 'finished';
        await topic.save();
        await topic.populate('groupingIds');
        const topicObj = await resolveTopicMediaUrls(topic.toObject());
        return NextResponse.json({ success: true, message: 'Thumbnail uploaded and selected successfully', data: topicObj });
      }
      case 'skip-thumbnail': {
        topic = await Topic.findByIdAndUpdate(id, { selectedThumbnail: 'skipped', level: 'finished' }, { new: true }).populate('groupingIds');
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        return NextResponse.json({ success: true, message: 'Thumbnail skipped successfully', data: topic });
      }
      case 'select-thumbnail': {
        const body = await request.json();
        const { thumbnail } = body;
        if (!thumbnail) return NextResponse.json({ success: false, message: 'Thumbnail is required' }, { status: 400 });
        topic = await Topic.findByIdAndUpdate(id, { selectedThumbnail: thumbnail, level: 'finished' }, { new: true }).populate('groupingIds');
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        const topicObj = await resolveTopicMediaUrls(topic.toObject());
        return NextResponse.json({ success: true, message: 'Thumbnail selected successfully', data: topicObj });
      }
      case 'generate-extra-assets': {
        topic = await Topic.findById(id);
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        if (!topic.narrationScript) return NextResponse.json({ success: false, message: 'Narration script not generated yet' }, { status: 400 });
        if (!topic.selectedTitle) return NextResponse.json({ success: false, message: 'Title not selected yet' }, { status: 400 });
        const [seoDescription, tags] = await Promise.all([
          generateSEODescription(topic.topicName, topic.narrationScript, topic.selectedTitle, await topic.getKeywordsString()),
          generateTags(topic.topicName, topic.narrationScript, topic.selectedTitle, await topic.getKeywordsString()),
        ]);
        topic.seoDescription = seoDescription;
        topic.tags = tags;
        await topic.save();
        return NextResponse.json({ success: true, message: 'Extra assets generated successfully', data: { seoDescription, tags } });
      }
      case 'generate-chapters': {
        const body = await request.json();
        const { transcript } = body;
        if (!transcript || transcript.trim() === '') return NextResponse.json({ success: false, message: 'A timestamped video transcript is required' }, { status: 400 });
        topic = await Topic.findById(id);
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        const chapters = await generateVideoChapters(transcript.trim(), topic.topicName, topic.selectedTitle || '');
        topic.videoTranscript = transcript.trim();
        topic.timestamps = chapters;
        await topic.save();
        return NextResponse.json({ success: true, message: 'Video chapters generated successfully', data: { videoTranscript: topic.videoTranscript, timestamps: topic.timestamps } });
      }
      case 'mark-editing': {
        topic = await Topic.findById(id);
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        if (!topic.seoDescription || !topic.audioUrl) return NextResponse.json({ success: false, message: 'Extra assets must be generated before marking as editing' }, { status: 400 });
        topic.level = 'editing';
        await topic.save();
        await topic.populate('groupingIds');
        return NextResponse.json({ success: true, message: 'Topic marked as editing successfully', data: topic });
      }
      case 'mark-uploaded': {
        topic = await Topic.findById(id);
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        if (!topic.seoDescription || !topic.audioUrl) return NextResponse.json({ success: false, message: 'Extra assets must be generated before marking as uploaded' }, { status: 400 });
        topic.level = 'uploaded';
        await topic.save();
        await topic.populate('groupingIds');
        return NextResponse.json({ success: true, message: 'Topic marked as uploaded successfully', data: topic });
      }
      case 'generate-cues': {
        topic = await Topic.findById(id);
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        if (!topic.narrationScript) return NextResponse.json({ success: false, message: 'Narration script not generated yet' }, { status: 400 });
        const recordingCues = await generateRecordingCues(topic.narrationScript);
        topic.recordingCues = recordingCues;
        await topic.save();
        return NextResponse.json({ success: true, message: 'Recording cues generated successfully', data: topic });
      }
      case 'regenerate-audio': {
        const body = await request.json();
        const { script } = body;
        topic = await Topic.findById(id);
        if (!topic) return NextResponse.json({ success: false, message: 'Topic not found' }, { status: 404 });
        const scriptToUse = script || topic.narrationScript;
        if (!scriptToUse) return NextResponse.json({ success: false, message: 'Narration script not generated yet' }, { status: 400 });
        const scriptChunks = await annotateScriptChunks(scriptToUse);
        const audioUrl = await generateWAVAudio(scriptChunks, topic._id.toString());
        topic.audioUrls = [];
        topic.audioUrl = audioUrl;
        topic.audioVersions.push({ audioUrls: [], audioUrl: audioUrl, generatedAt: new Date() });
        await topic.save();
        const topicObj = await resolveTopicMediaUrls(topic.toObject());
        return NextResponse.json({ success: true, message: 'Audio regenerated successfully', data: topicObj });
      }
      default:
        return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing topic action:', error);
    return NextResponse.json({ success: false, message: 'Error processing request' }, { status: 500 });
  }
}
