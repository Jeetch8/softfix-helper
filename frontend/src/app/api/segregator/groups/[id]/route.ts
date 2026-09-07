import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Grouping from '@/models/Grouping';
import GroupingsGroup from '@/models/GroupingsGroup';

// GET /api/segregator/groups/:id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const group = await Grouping.findById(id);
  if (!group) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: group });
}

// PUT /api/segregator/groups/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const { title } = await request.json();
  if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
  const updatedGroup = await Grouping.findByIdAndUpdate(id, { title }, { new: true });
  if (!updatedGroup) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });
  return NextResponse.json({ success: true, message: 'Group title updated successfully', data: updatedGroup });
}

// DELETE /api/segregator/groups/:id
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const groupToDelete = await Grouping.findById(id);
  if (!groupToDelete) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });
  const flatKeywords = groupToDelete.keywords ? groupToDelete.keywords.flat() : [];
  if (flatKeywords.length > 0) {
    const query: Record<string, any> = { _id: { $ne: id } };
    if (groupToDelete.groupingsGroupId) query.groupingsGroupId = groupToDelete.groupingsGroupId;
    const otherGroups = await Grouping.find(query);
    if (otherGroups.length === 0) return NextResponse.json({ success: false, message: 'Cannot delete the last group if it contains keywords.' }, { status: 400 });
    const randomGroup = otherGroups[Math.floor(Math.random() * otherGroups.length)];
    randomGroup.keywords.push(flatKeywords);
    await randomGroup.save();
  }
  if (groupToDelete.groupingsGroupId) await GroupingsGroup.findByIdAndUpdate(groupToDelete.groupingsGroupId, { $inc: { numberOfGroups: -1 } });
  await Grouping.findByIdAndDelete(id);
  return NextResponse.json({ success: true, message: 'Group deleted successfully' });
}
