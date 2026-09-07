import Grouping from '@/models/Grouping';

export interface KeywordInfo {
  id: string;
  keyword: string;
  search_volume: number;
  overall: number;
  competition: number;
}

export async function fetchKeywordsForGroups(groupIds: (string | import('mongoose').Types.ObjectId)[]): Promise<KeywordInfo[]> {
  if (!groupIds || groupIds.length === 0) return [];

  const groupings = await Grouping.find({ _id: { $in: groupIds } });

  const uniqueKeywordsMap = new Map<string, KeywordInfo>();
  for (const group of groupings) {
    const flatKeywords = group.keywords ? group.keywords.flat() : [];
    for (const kw of flatKeywords as any[]) {
      if (!kw || !kw.keyword) continue;
      const key = kw.keyword.toLowerCase();
      if (!uniqueKeywordsMap.has(key)) {
        uniqueKeywordsMap.set(key, {
          id: kw.id || String(group._id),
          keyword: kw.keyword,
          search_volume: kw.search_volume || 0,
          overall: kw.overall || 0,
          competition: kw.competition || 0,
        });
      }
    }
  }

  return Array.from(uniqueKeywordsMap.values());
}
