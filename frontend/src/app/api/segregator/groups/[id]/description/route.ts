import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Grouping from '@/models/Grouping';

// PUT /api/segregator/groups/:id/description
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const { description } = await request.json();
  const updatedGroup = await Grouping.findByIdAndUpdate(id, { description: description ?? '' }, { new: true });
  if (!updatedGroup) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });
  return NextResponse.json({ success: true, message: 'Group description updated successfully', data: updatedGroup });
}
