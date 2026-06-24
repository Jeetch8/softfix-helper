import Grouping from '../models/Grouping.js';

/**
 * Helper to fetch keywords for given group IDs, returning unique keywords.
 * Accepts multiple group IDs (as a single ID or an array of IDs).
 * Returns unique keyword objects.
 */
export async function fetchKeywordsForGroups(groupIds) {
  if (!groupIds) return [];
  const ids = Array.isArray(groupIds) ? groupIds : [groupIds];
  if (ids.length === 0) return [];

  const groupings = await Grouping.find({ _id: { $in: ids } });
  
  const uniqueKeywordsMap = new Map();
  for (const group of groupings) {
    const flatKeywords = group.keywords ? group.keywords.flat() : [];
    for (const kw of flatKeywords) {
      if (!kw || !kw.keyword) continue;
      const key = kw.keyword.toLowerCase();
      if (!uniqueKeywordsMap.has(key)) {
        uniqueKeywordsMap.set(key, {
          id: kw.id || kw._id?.toString(),
          keyword: kw.keyword,
          search_volume: kw.search_volume || 0,
          overall: kw.overall || 0,
          competition: kw.competition || 0
        });
      }
    }
  }

  return Array.from(uniqueKeywordsMap.values());
}
