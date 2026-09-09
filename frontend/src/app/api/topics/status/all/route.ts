import { NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Topic from '@/models/Topic';

export async function GET() {
  await connectDB();
  try {
    const stats = await Topic.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCount = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    stats.forEach((stat: any) => {
      (statusCount as any)[stat._id] = stat.count;
    });

    return NextResponse.json({
      success: true,
      message: 'Topic status statistics',
      data: statusCount,
    });
  } catch (error) {
    console.error('❌ Error retrieving status stats:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        success: false,
        message: 'Error retrieving status statistics',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
