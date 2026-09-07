import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    return NextResponse.json({ success: true, message: 'Server is running' });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}