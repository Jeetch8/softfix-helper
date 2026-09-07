import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import GroupingsGroup from '@/models/GroupingsGroup';

// GET /api/segregator/groupings-groups/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const group = await GroupingsGroup.findById(id);
  if (!group) return NextResponse.json({ success: false, message: 'Groupings group not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: group });
}

// PUT /api/segregator/groupings-groups/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const { title, description } = await request.json();
  const updateFields: Record<string, any> = {};
  if (title !== undefined) { if (!title) return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 }); updateFields.title = title; }
  if (description !== undefined) updateFields.description = description;
  const group = await GroupingsGroup.findByIdAndUpdate(id, updateFields, { new: true });
  if (!group) return NextResponse.json({ success: false, message: 'Groupings group not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: group });
}

// DELETE /api/segregator/groupings-groups/:id
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  await GroupingsGroup.findByIdAndDelete(id);
  return NextResponse.json({ success: true, message: 'Groupings group deleted successfully' });
}
