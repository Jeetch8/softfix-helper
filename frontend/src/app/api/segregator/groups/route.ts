import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Grouping from '@/models/Grouping';
import GroupingsGroup from '@/models/GroupingsGroup';

// GET /api/segregator/groups
export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const groupingsGroupId = searchParams.get('groupingsGroupId');
  const query: Record<string, any> = userId ? { userId } : {};
  if (groupingsGroupId) query.groupingsGroupId = groupingsGroupId;
  const groups = await Grouping.find(query).sort({ createdAt: -1 });
  for (const group of groups) {
    const obj = (group as any).toObject({ defaults: false });
    if (obj.priority === undefined) {
      await Grouping.findByIdAndUpdate(group._id, { priority: false });
      (group as any).priority = false;
      // @ts-ignore
      if (group._doc) group._doc.priority = false;
    }
  }
  return NextResponse.json({ success: true, message: 'Groupings retrieved successfully', count: groups.length, data: groups });
}

// POST /api/segregator/groups
export async function POST(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { title, groupingsGroupId, userId = 'default-user' } = body;
  if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
  const newGroup = await Grouping.create({ title, keywords: [], total_average_volume: 0, userId, groupingsGroupId });
  if (groupingsGroupId) {
    await GroupingsGroup.findByIdAndUpdate(groupingsGroupId, { $inc: { numberOfGroups: 1 } });
  }
  return NextResponse.json({ success: true, message: 'Group created successfully', data: newGroup });
}

// DELETE /api/segregator/groups
export async function DELETE() {
  await connectDB();
  await Grouping.deleteMany({});
  return NextResponse.json({ success: true, message: 'All groupings deleted successfully' });
}
