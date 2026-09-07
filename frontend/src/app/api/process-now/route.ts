import { NextRequest, NextResponse } from 'next/server';
import { processTopicsNow } from '@/services/topicProcessor';

export async function POST(request: NextRequest) {
  try {
    await processTopicsNow();
    return NextResponse.json({
      success: true,
      message: 'Topic processing triggered successfully',
    });
  } catch (error) {
    console.error('Error triggering processing:', error);
    return NextResponse.json(
      { success: false, message: 'Error triggering processing' },
      { status: 500 }
    );
  }
}