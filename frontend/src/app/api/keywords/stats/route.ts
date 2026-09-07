import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import QuestionKeyword from '@/models/QuestionKeyword';

export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    const query = userId ? { userId } : {};

    const stats = await QuestionKeyword.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalKeywords: { $sum: 1 },
          avgOverall: { $avg: '$overall' },
          avgCompetition: { $avg: '$competition' },
          avgSearchVolume: { $avg: '$searchVolume' },
          highScoreCount: {
            $sum: { $cond: [{ $gte: ['$overall', 70] }, 1, 0] },
          },
          lowCompetitionCount: {
            $sum: { $cond: [{ $lte: ['$competition', 30] }, 1, 0] },
          },
        },
      },
    ]);

    const data = stats[0] || {
      totalKeywords: 0,
      avgOverall: 0,
      avgCompetition: 0,
      avgSearchVolume: 0,
      highScoreCount: 0,
      lowCompetitionCount: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        avgOverall: Math.round(data.avgOverall * 100) / 100,
        avgCompetition: Math.round(data.avgCompetition * 100) / 100,
        avgSearchVolume: Math.round(data.avgSearchVolume),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching keyword stats',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
