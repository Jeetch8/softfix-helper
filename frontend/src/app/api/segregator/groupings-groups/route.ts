import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import GroupingsGroup from '@/models/GroupingsGroup';
import Grouping from '@/models/Grouping';

// GET /api/segregator/groupings-groups
export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const query = userId ? { userId } : {};
  const groups = await GroupingsGroup.find(query).sort({ createdAt: -1 });
  return NextResponse.json({ success: true, data: groups });
}

// POST /api/segregator/groupings-groups
export async function POST(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { title, description, userId = 'default-user' } = body;
  if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
  const newGroup = await GroupingsGroup.create({ title, description: description || '', userId });
  return NextResponse.json({ success: true, message: 'Groupings group created successfully', data: newGroup });
}

// DELETE /api/segregator/groupings-groups
export async function DELETE() {
  await connectDB();
  await Grouping.deleteMany({});
  await GroupingsGroup.deleteMany({});
  return NextResponse.json({ success: true, message: 'All groupings groups and groupings deleted successfully' });
}
