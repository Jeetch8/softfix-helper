import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTopic,
  updateScript,
  updateDescription,
  updateKeywords,
  updateInstructions,
  regenerateScript,
  markAsEditing,
  markAsUploaded,
  generateRecordingCues,
} from '../api/client';
import StatusBadge from './StatusBadge';
import TitleSelector from './TitleSelector';
import ThumbnailSelector from './ThumbnailSelector';
import ExtraAssetsSelector from './ExtraAssetsSelector';
import YouTubePreview from './YouTubePreview';

const parseKeywords = (keywordsStr) => {
  if (!keywordsStr) return [];
  return keywordsStr
    .split(',')
    .map((item) => {
      const parts = item.split('|');
      const keyword = parts[0]?.trim() || '';
      const rawVolumeStr = parts[1]?.trim() || '';
      const volume = parseInt(rawVolumeStr, 10);
      return {
        keyword,
        volume: isNaN(volume) ? 0 : volume,
        rawVolume: rawVolumeStr,
      };
    })
    .filter((k) => k.keyword);
};

const formatSearchVolume = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  if (num >= 1000000) {
    const formatted = (num / 1000000).toFixed(1);
    return formatted.endsWith('.0') ? `${Math.round(num / 1000000)}M` : `${formatted}M`;
  }
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1);
    return formatted.endsWith('.0') ? `${Math.round(num / 1000)}K` : `${formatted}K`;
  }
  return num.toString();
};

const TopicPage = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMarkingEditing, setIsMarkingEditing] = useState(false);
  const [isMarkingUploaded, setIsMarkingUploaded] = useState(false);
  
  const [isGeneratingCues, setIsGeneratingCues] = useState(false);
  const [showCuesDialog, setShowCuesDialog] = useState(false);
  
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [regenComments, setRegenComments] = useState('');
  
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [editedKeywords, setEditedKeywords] = useState('');
  const [isSavingKeywords, setIsSavingKeywords] = useState(false);

  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);

  const [keywordSortKey, setKeywordSortKey] = useState('volume');
  const [keywordSortDir, setKeywordSortDir] = useState('desc');
  const [keywordSearch, setKeywordSearch] = useState('');

  useEffect(() => {
    if (topicId) {
      fetchTopic();
    }
  }, [topicId]);

  const fetchTopic = async () => {
    setLoading(true);
    setError(null);
    setIsEditing(false);
    setIsEditingDescription(false);
    setIsEditingKeywords(false);
    setIsEditingInstructions(false);
    try {
      const response = await getTopic(topicId);
      setTopic(response.data.data);
      setEditedScript(response.data.data.narrationScript || '');
      setEditedDescription(response.data.data.description || '');
      setEditedKeywords(response.data.data.keywords || '');
      setEditedInstructions(response.data.data.stepByStepInstructions || '');
    } catch (err) {
      setError('Failed to fetch topic details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScript = async () => {
    if (!editedScript.trim()) {
      setError('Script cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateScript(topicId, editedScript);
      setTopic(response.data.data);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError('Failed to save script');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    // If not showing input yet, show it
    if (!showRegenInput && topic.narrationScript) {
      setShowRegenInput(true);
      return;
    }

    if (!window.confirm('Regenerate the narration script for this topic?')) {
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await regenerateScript(topicId, regenComments);
      setTopic(response.data.data);
      setShowRegenInput(false);
      setRegenComments('');
      setError(null);
    } catch (err) {
      setError('Failed to regenerate script');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleGenerateCues = async () => {
    setIsGeneratingCues(true);
    try {
      const response = await generateRecordingCues(topicId);
      setTopic(response.data.data);
      setShowCuesDialog(true);
      setError(null);
    } catch (err) {
      setError('Failed to generate recording cues');
    } finally {
      setIsGeneratingCues(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!topic.narrationScript) {
      setError('No script to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(topic.narrationScript);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleMarkAsEditing = async () => {
    if (!window.confirm('Mark this topic as editing?')) {
      return;
    }

    setIsMarkingEditing(true);
    try {
      const response = await markAsEditing(topicId);
      setTopic(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as editing');
    } finally {
      setIsMarkingEditing(false);
    }
  };

  const handleMarkAsUploaded = async () => {
    if (!window.confirm('Mark this topic as uploaded?')) {
      return;
    }

    setIsMarkingUploaded(true);
    try {
      const response = await markAsUploaded(topicId);
      setTopic(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as uploaded');
    } finally {
      setIsMarkingUploaded(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsSavingDescription(true);
    try {
      const response = await updateDescription(topicId, editedDescription);
      setTopic(response.data.data);
      setIsEditingDescription(false);
      setError(null);
    } catch (err) {
      setError('Failed to save description');
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleSaveKeywords = async () => {
    setIsSavingKeywords(true);
    try {
      const response = await updateKeywords(topicId, editedKeywords);
      setTopic(response.data.data);
      setIsEditingKeywords(false);
      setError(null);
    } catch (err) {
      setError('Failed to save keywords');
    } finally {
      setIsSavingKeywords(false);
    }
  };

  const handleSaveInstructions = async () => {
    setIsSavingInstructions(true);
    try {
      const response = await updateInstructions(topicId, editedInstructions);
      setTopic(response.data.data);
      setIsEditingInstructions(false);
      setError(null);
    } catch (err) {
      setError('Failed to save instructions');
    } finally {
      setIsSavingInstructions(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">⏳ Loading topic...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Topic not found</p>
            <button
              onClick={() => navigate('/topics')}
              className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg"
            >
              ← Back to Topics
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Parse keywords from groupingIds if populated, else fallback to topic.keywords
  const parsedKeywords = (() => {
    if (
      topic.groupingIds &&
      Array.isArray(topic.groupingIds) &&
      topic.groupingIds.length > 0 &&
      typeof topic.groupingIds[0] === 'object'
    ) {
      const list = [];
      for (const group of topic.groupingIds) {
        if (group && group.title) {
          const flatKeywords = group.keywords ? group.keywords.flat() : [];
          for (const kw of flatKeywords) {
            list.push({
              keyword: kw.keyword,
              volume: Number(kw.search_volume) || 0,
              rawVolume: String(kw.search_volume || 0),
              topicName: group.title,
              overall: kw.overall,
              competition: kw.competition,
            });
          }
        }
      }
      return list;
    }
    return parseKeywords(topic.keywords || '').map((kw) => ({
      ...kw,
      topicName: 'Manual',
    }));
  })();
  
  // Filter by keyword or topic group name
  const filteredKeywords = parsedKeywords.filter((k) =>
    k.keyword.toLowerCase().includes(keywordSearch.toLowerCase()) ||
    (k.topicName && k.topicName.toLowerCase().includes(keywordSearch.toLowerCase()))
  );

  // Sort
  const sortedKeywords = [...filteredKeywords].sort((a, b) => {
    if (!keywordSortKey) return 0;
    
    let aVal = a[keywordSortKey];
    let bVal = b[keywordSortKey];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return keywordSortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return keywordSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <button
                onClick={() => navigate('/topics')}
                className="text-blue-600 hover:text-blue-800 font-medium mb-2 inline-flex items-center"
              >
                ← Back to Topics
              </button>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {topic.topicName}
              </h1>
              <div className="mb-4">
                <StatusBadge status={topic.status} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                {/* Description Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Description</h3>
                  {isEditingDescription ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter topic description..."
                        rows="3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveDescription}
                          disabled={isSavingDescription}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
                        >
                          {isSavingDescription ? '💾 Saving...' : '💾 Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingDescription(false);
                            setEditedDescription(topic.description || '');
                          }}
                          className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      {topic.description ? (
                        <p className="text-gray-600 flex-1 text-sm">{topic.description}</p>
                      ) : (
                        <p className="text-gray-400 italic flex-1 text-sm">
                          No description
                        </p>
                      )}
                      <button
                        onClick={() => setIsEditingDescription(true)}
                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors flex-shrink-0"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Keywords Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Keywords</h3>
                  {isEditingKeywords ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedKeywords}
                        onChange={(e) => setEditedKeywords(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter topic keywords..."
                        rows="3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveKeywords}
                          disabled={isSavingKeywords}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
                        >
                          {isSavingKeywords ? '💾 Saving...' : '💾 Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingKeywords(false);
                            setEditedKeywords(topic.keywords || '');
                          }}
                          className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={keywordSearch}
                            onChange={(e) => setKeywordSearch(e.target.value)}
                            placeholder="🔍 Filter by keyword or topic group..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                          {keywordSearch && (
                            <button
                              onClick={() => setKeywordSearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => setIsEditingKeywords(true)}
                          className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors flex-shrink-0"
                        >
                          ✏️ Edit
                        </button>
                      </div>

                      {sortedKeywords.length > 0 ? (
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 shadow-sm max-h-64 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-gray-100 sticky top-0 border-b border-gray-200 z-10">
                              <tr>
                                <th
                                  onClick={() => {
                                    if (keywordSortKey === 'keyword') {
                                      setKeywordSortDir(keywordSortDir === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setKeywordSortKey('keyword');
                                      setKeywordSortDir('asc');
                                    }
                                  }}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-200 select-none font-semibold text-gray-700 transition-colors"
                                >
                                  <div className="flex items-center gap-1">
                                    Keyword
                                    {keywordSortKey === 'keyword' && (
                                      <span>{keywordSortDir === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                  </div>
                                </th>
                                <th
                                  onClick={() => {
                                    if (keywordSortKey === 'topicName') {
                                      setKeywordSortDir(keywordSortDir === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setKeywordSortKey('topicName');
                                      setKeywordSortDir('asc');
                                    }
                                  }}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-200 select-none font-semibold text-gray-700 transition-colors"
                                >
                                  <div className="flex items-center gap-1">
                                    Topic Group
                                    {keywordSortKey === 'topicName' && (
                                      <span>{keywordSortDir === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                  </div>
                                </th>
                                <th
                                  onClick={() => {
                                    if (keywordSortKey === 'volume') {
                                      setKeywordSortDir(keywordSortDir === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setKeywordSortKey('volume');
                                      setKeywordSortDir('desc');
                                    }
                                  }}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-200 select-none font-semibold text-gray-700 text-right transition-colors"
                                  style={{ width: '100px' }}
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    Volume
                                    {keywordSortKey === 'volume' && (
                                      <span>{keywordSortDir === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {sortedKeywords.map((item, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                                  <td className="px-3 py-2 text-gray-800 break-words font-medium">
                                    {item.keyword}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600 font-medium">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      item.topicName === 'Manual'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    }`}>
                                      {item.topicName}
                                    </span>
                                  </td>
                                  <td
                                    className="px-3 py-2 text-gray-600 text-right font-mono"
                                    title={`Exact Volume: ${item.volume.toLocaleString()}`}
                                  >
                                    {formatSearchVolume(item.volume)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic text-xs py-2">
                          {keywordSearch ? 'No keywords match the filter' : 'No valid keywords parsed'}
                        </p>
                      )}

                      {parsedKeywords.length > 0 && (
                        <div className="flex justify-between items-center text-[10px] text-gray-500 px-1">
                          <span>
                            Showing {sortedKeywords.length} of {parsedKeywords.length} keywords
                          </span>
                          <span>
                            Total Volume:{' '}
                            <span className="font-semibold text-gray-700">
                              {formatSearchVolume(
                                parsedKeywords.reduce((acc, k) => acc + k.volume, 0)
                              )}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Step-by-Step Instructions Section */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Step-by-Step Instructions</h3>
                {isEditingInstructions ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedInstructions}
                      onChange={(e) => setEditedInstructions(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter step-by-step instructions..."
                      rows="6"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveInstructions}
                        disabled={isSavingInstructions}
                        className="px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
                      >
                        {isSavingInstructions ? '💾 Saving...' : '💾 Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingInstructions(false);
                          setEditedInstructions(topic.stepByStepInstructions || '');
                        }}
                        className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors"
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    {topic.stepByStepInstructions ? (
                      <div className="text-gray-600 flex-1 text-sm whitespace-pre-wrap">
                        {topic.stepByStepInstructions}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic flex-1 text-sm">
                        No instructions provided
                      </p>
                    )}
                    <button
                      onClick={() => setIsEditingInstructions(true)}
                      className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors flex-shrink-0"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-600 text-xs">User ID</p>
              <p className="text-gray-800 font-medium">{topic.userId}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-gray-600 text-xs">Created</p>
              <p className="text-gray-800 font-medium">
                {new Date(topic.createdAt).toLocaleDateString()}
              </p>
            </div>
            {topic.processedAt && (
              <div className="bg-gray-50 rounded p-3">
                <p className="text-gray-600 text-xs">Processed</p>
                <p className="text-gray-800 font-medium">
                  {new Date(topic.processedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* YouTube Titles Section (always visible or if topic exists) */}
        {topic && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🎬 YouTube Titles
            </h2>
            <TitleSelector
              topicId={topicId}
              selectedTitle={topic.selectedTitle}
              generatedTitles={topic.generatedTitles || []}
              onTitleSelected={fetchTopic}
              onGenerateComplete={fetchTopic}
            />
          </div>
        )}

        {/* YouTube Thumbnail Section */}
        {topic.selectedTitle && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🎨 YouTube Thumbnail
            </h2>
            <ThumbnailSelector
              topicId={topicId}
              selectedThumbnail={topic.selectedThumbnail}
              onThumbnailSelected={fetchTopic}
            />
          </div>
        )}

        {/* YouTube Feed Preview Section */}
        {topic.selectedThumbnail && (
          <YouTubePreview
            thumbnail={topic.selectedThumbnail}
            title={topic.selectedTitle}
            channelName="Softfix Central"
          />
        )}

        {/* Narration Script Section */}
        {topic.selectedThumbnail && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                📖 Narration Script
              </h2>
              {!isEditing && (
                <div className="flex gap-2">
                  {topic.narrationScript && (
                    <button
                      onClick={handleCopyToClipboard}
                      className={`px-3 py-1 ${
                        copySuccess
                          ? 'bg-green-500'
                          : 'bg-gray-500 hover:bg-gray-600'
                      } text-white text-sm font-medium rounded transition-colors`}
                    >
                      {copySuccess ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  )}
                  {topic.narrationScript && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors"
                    >
                      ✏️ Edit
                    </button>
                  )}
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating || topic.status === 'processing'}
                    className={`px-3 py-1 ${showRegenInput ? 'bg-green-500 hover:bg-green-600' : 'bg-purple-500 hover:bg-purple-600'} disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors`}
                  >
                    {isRegenerating || topic.status === 'processing' ? '⏳ Generating...' : showRegenInput ? '🚀 Confirm Regeneration' : topic.narrationScript ? '🔄 Regenerate' : '🚀 Generate Script'}
                  </button>
                  {showRegenInput && (
                    <button
                      onClick={() => {
                        setShowRegenInput(false);
                        setRegenComments('');
                      }}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors"
                    >
                      ✕ Cancel
                    </button>
                  )}
                </div>
              )}
            </div>

            {showRegenInput && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Regeneration Comments (Optional)
                </label>
                <p className="text-xs text-purple-600 mb-3">
                  Provide feedback to the AI to adjust the tone, fix specific parts, or change the length of the script.
                </p>
                <textarea
                  value={regenComments}
                  onChange={(e) => setRegenComments(e.target.value)}
                  className="w-full p-3 border border-purple-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="e.g., Make it more enthusiastic, shorten the intro, focus more on the second step..."
                  rows="3"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                  >
                    {isRegenerating ? '⏳ Processing...' : '🚀 Regenerate Now'}
                  </button>
                </div>
              </div>
            )}

            {/* Script Variations */}
            {topic.narrationScriptVariations &&
              topic.narrationScriptVariations.length > 0 &&
              !isEditing && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">
                    Generated Variations (Select one to use)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {topic.narrationScriptVariations.map((variation, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-lg p-3 ${
                          topic.narrationScript === variation.result
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-500">
                            {variation.prompt}
                          </span>
                          {topic.narrationScript === variation.result ? (
                            <span className="text-xs font-bold text-blue-600">
                              ✓ Active
                            </span>
                          ) : (
                            <button
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    'Use this variation as the main script?',
                                  )
                                ) {
                                  try {
                                    const response = await updateScript(
                                      topicId,
                                      variation.result,
                                    );
                                    setTopic(response.data.data);
                                    setEditedScript(
                                      response.data.data.narrationScript,
                                    );
                                  } catch (err) {
                                    setError('Failed to update script');
                                  }
                                }
                              }}
                              className="text-xs bg-white border border-gray-300 hover:bg-gray-100 px-2 py-1 rounded"
                            >
                              Use This
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-700 whitespace-pre-wrap h-64 overflow-y-auto bg-white border border-gray-100 rounded p-2">
                          {variation.result}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  className="w-full h-96 p-4 border border-gray-300 rounded text-gray-700 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter narration script..."
                  style={{ fontFamily: 'monospace' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveScript}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium rounded transition-colors"
                  >
                    {isSaving ? '💾 Saving...' : '💾 Save Script'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedScript(topic.narrationScript || '');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded transition-colors"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            ) : (
              topic.narrationScript && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-600 mb-3 border-b pb-2">
                    Active Script (Source of Truth)
                  </h3>
                  <div className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed font-serif">
                    {topic.narrationScript}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Recording Cues Section */}
        {topic.narrationScript && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                🎥 Recording Cues
              </h2>
              <button
                onClick={topic.recordingCues ? () => setShowCuesDialog(true) : handleGenerateCues}
                disabled={isGeneratingCues}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
              >
                {isGeneratingCues ? '⏳ Generating...' : topic.recordingCues ? '👁️ View Cues' : '🚀 Generate Cues'}
              </button>
            </div>
            
            {topic.recordingCues && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
                <p className="text-sm text-gray-500 mb-2 italic">Cues ready. Click "View Cues" to open the recording dialog.</p>
                <div className="text-gray-800 text-sm whitespace-pre-wrap font-sans max-h-32 overflow-hidden relative">
                  {topic.recordingCues}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 to-transparent"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recording Cues Dialog (Modal) */}
        {showCuesDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span>🎥</span> Screen Recording Cues
                </h3>
                <button
                  onClick={() => setShowCuesDialog(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 text-gray-700 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                {topic.recordingCues ? (
                  <div className="space-y-2">
                    {topic.recordingCues.split('\n').map((line, i) => (
                      line.trim() ? (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-1">•</span>
                          <span>{line.replace(/^[-*•]\s*/, '')}</span>
                        </div>
                      ) : <div key={i} className="h-2"></div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-8">No cues generated yet.</p>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                <button
                  onClick={() => setShowCuesDialog(false)}
                  className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extra Assets Section */}
        {topic.narrationScript && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              ⭐ Extra Assets
            </h2>
            <ExtraAssetsSelector
              topicId={topicId}
              topicTitle={topic.selectedTitle || topic.topicName}
              extraAssets={
                topic.seoDescription
                  ? {
                      seoDescription: topic.seoDescription,
                      tags: topic.tags,
                      timestamps: topic.timestamps,
                      audioUrl: topic.audioUrl,
                    }
                  : null
              }
              onAssetsGenerated={fetchTopic}
            />
          </div>
        )}

        {/* Action Buttons */}
        {topic.seoDescription &&
          topic.audioUrl &&
          topic.level !== 'editing' &&
          topic.level !== 'uploaded' && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <button
                onClick={handleMarkAsEditing}
                disabled={isMarkingEditing}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isMarkingEditing
                  ? '⏳ Marking as Editing...'
                  : '✏️ Mark as Editing'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Click this when you are ready to review and edit the content
              </p>
            </div>
          )}

        {topic.seoDescription &&
          topic.audioUrl &&
          topic.level === 'editing' && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <button
                onClick={handleMarkAsUploaded}
                disabled={isMarkingUploaded}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isMarkingUploaded
                  ? '⏳ Marking as Uploaded...'
                  : '📤 Mark as Uploaded'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Click this after you have uploaded all assets to YouTube
              </p>
            </div>
          )}

        {topic.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">
              <strong>Error:</strong> {topic.errorMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicPage;
