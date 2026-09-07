import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import Grouping from '@/models/Grouping';

// PUT /api/segregator/groups/keyword
export async function PUT(request: NextRequest) {
  await connectDB();
  const { keyword, targetGroupIds, groupingsGroupId, userId = 'default-user' } = await request.json();
  if (!keyword || !keyword.id || !Array.isArray(targetGroupIds)) {
    return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
  }
  const query: Record<string, any> = userId ? { userId } : {};
  if (groupingsGroupId) query.groupingsGroupId = groupingsGroupId;
  const allGroups = await Grouping.find(query);
  for (const group of allGroups) {
    const flatKeywords = group.keywords ? group.keywords.flat() : [];
    const hasKeyword = flatKeywords.some((kw: any) => kw.id === keyword.id || kw._id?.toString() === keyword.id);
    const shouldHaveKeyword = targetGroupIds.includes(group._id.toString());
    let changed = false;
    let newKeywords = [...flatKeywords];
    if (shouldHaveKeyword && !hasKeyword) { newKeywords.push(keyword); changed = true; }
    else if (!shouldHaveKeyword && hasKeyword) { newKeywords = newKeywords.filter((kw: any) => kw.id !== keyword.id && kw._id?.toString() !== keyword.id); changed = true; }
    if (changed) { group.keywords = [newKeywords] as any; group.total_average_volume = newKeywords.reduce((sum: number, kw: any) => sum + (Number(kw.search_volume) || 0), 0); await group.save(); }
  }
  return NextResponse.json({ success: true, message: 'Keyword groups updated successfully' });
}
