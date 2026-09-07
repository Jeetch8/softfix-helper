import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Grouping from '@/models/Grouping';

// PUT /api/segregator/groups/:id/priority
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const { priority } = await request.json();
  if (priority === undefined) return NextResponse.json({ success: false, message: 'Priority boolean is required' }, { status: 400 });
  const updatedGroup = await Grouping.findByIdAndUpdate(id, { priority: !!priority }, { new: true });
  if (!updatedGroup) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });
  return NextResponse.json({ success: true, message: 'Group priority updated successfully', data: updatedGroup });
}
