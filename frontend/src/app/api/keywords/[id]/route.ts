import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import QuestionKeyword from '@/models/QuestionKeyword';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const keyword = await QuestionKeyword.findById(id);
    if (!keyword) {
      return NextResponse.json({ success: false, message: 'Keyword not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: keyword });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error fetching keyword', error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const updates = await request.json();
    const keyword = await QuestionKeyword.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!keyword) {
      return NextResponse.json({ success: false, message: 'Keyword not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Keyword updated successfully', data: keyword });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error updating keyword', error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const keyword = await QuestionKeyword.findByIdAndDelete(id);
    if (!keyword) {
      return NextResponse.json({ success: false, message: 'Keyword not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Keyword deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error deleting keyword', error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
