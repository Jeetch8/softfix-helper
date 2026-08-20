import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTopic,
  updateScript,
  updateDescription,
  updateKeywords,
  updateTopicName,
  updateInstructions,
  regenerateScript,
  markAsEditing,
  markAsUploaded,
  generateRecordingCues,
  regenerateAudio,
  updateAudioUrl,
  fetchMediaAsBlobUrl,
  updateUploadInfo,
} from '../api/client';
import StatusBadge from './StatusBadge';
import TitleSelector from './TitleSelector';
import ThumbnailSelector from './ThumbnailSelector';
import ExtraAssetsSelector from './ExtraAssetsSelector';
import YouTubePreview from './YouTubePreview';
import Paginator from './Paginator';

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

const parseInlineStyles = (text) => {
  if (!text) return '';
  const inlineRegex = /(\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_)/g;
  const parts = text.split(inlineRegex);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono text-sm font-semibold border border-amber-200/50">
          {part.slice(1, -1)}
        </code>
      );
    }
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={idx} className="font-extrabold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={idx} className="italic text-gray-800">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const renderMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  
  let inList = false;
  let listItems = [];
  let listType = null; // 'ul' or 'ol'

  const flushList = (key) => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${key}`} className="list-decimal pl-6 my-3 space-y-1.5 text-gray-800">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${key}`} className="list-disc pl-6 my-3 space-y-1.5 text-gray-800">
            {listItems}
          </ul>
        );
      }
      listItems = [];
      inList = false;
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for empty line
    if (!trimmed) {
      flushList(index);
      elements.push(<div key={`empty-${index}`} className="h-3"></div>);
      return;
    }

    // Check for Headings
    if (trimmed.startsWith('#')) {
      flushList(index);
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const content = match[2];
        const parsedContent = parseInlineStyles(content);
        
        switch (level) {
          case 1:
            elements.push(
              <h1 key={index} className="text-2xl font-extrabold text-gray-900 mt-6 mb-3 border-b pb-1.5">
                {parsedContent}
              </h1>
            );
            break;
          case 2:
            elements.push(
              <h2 key={index} className="text-xl font-bold text-gray-800 mt-5 mb-2.5 border-b pb-1">
                {parsedContent}
              </h2>
            );
            break;
          case 3:
            elements.push(
              <h3 key={index} className="text-lg font-bold text-gray-800 mt-4 mb-2">
                {parsedContent}
              </h3>
            );
            break;
          default:
            elements.push(
              <h4 key={index} className="text-base font-semibold text-gray-700 mt-3 mb-1.5">
                {parsedContent}
              </h4>
            );
            break;
        }
        return;
      }
    }

    // Check for Unordered List items
    const ulMatch = line.match(/^(\s*)[-*•]\s+(.*)$/);
    if (ulMatch) {
      if (inList && listType !== 'ul') {
        flushList(index);
      }
      inList = true;
      listType = 'ul';
      listItems.push(
        <li key={`li-${index}`} className="pl-1">
          {parseInlineStyles(ulMatch[2])}
        </li>
      );
      return;
    }

    // Check for Ordered List items
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inList && listType !== 'ol') {
        flushList(index);
      }
      inList = true;
      listType = 'ol';
      listItems.push(
        <li key={`li-${index}`} className="pl-1">
          {parseInlineStyles(olMatch[2])}
        </li>
      );
      return;
    }

    // If not a list item, flush any accumulated list items
    flushList(index);

    // Render as a paragraph
    elements.push(
      <p key={index} className="my-2 text-gray-800">
        {parseInlineStyles(line)}
      </p>
    );
  });

  // Flush any remaining list items at the end
  flushList(lines.length);

  return <div className="markdown-preview font-sans">{elements}</div>;
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
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);
  
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [regenComments, setRegenComments] = useState('');
  
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  const [isEditingTopicName, setIsEditingTopicName] = useState(false);
  const [editedTopicName, setEditedTopicName] = useState('');
  const [isSavingTopicName, setIsSavingTopicName] = useState(false);

  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [editedKeywords, setEditedKeywords] = useState('');
  const [isSavingKeywords, setIsSavingKeywords] = useState(false);

  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);

  const [localVideoPath, setLocalVideoPath] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState('private');
  const [isSavingUploadInfo, setIsSavingUploadInfo] = useState(false);

  const [keywordSortKey, setKeywordSortKey] = useState('volume');
  const [keywordSortDir, setKeywordSortDir] = useState('desc');
  const [keywordSearch, setKeywordSearch] = useState('');

  const [scriptVersionPage, setScriptVersionPage] = useState(1);
  const [audioVersionPage, setAudioVersionPage] = useState(1);

  useEffect(() => {
    if (topic?.scriptVersions?.length) {
      setScriptVersionPage(topic.scriptVersions.length);
    }
  }, [topic?.scriptVersions?.length]);

  useEffect(() => {
    if (topic?.audioVersions?.length) {
      setAudioVersionPage(topic.audioVersions.length);
    }
  }, [topic?.audioVersions?.length]);

  useEffect(() => {
    if (topicId) {
      fetchTopic();
    }
  }, [topicId]);

  useEffect(() => {
    if (topic && topic.audioUrl) {
      fetchMediaAsBlobUrl(topic.audioUrl).then(url => setAudioBlobUrl(url));
    }
  }, [topic?.audioUrl]);

  const fetchTopic = async () => {
    setLoading(true);
    setError(null);
    setIsEditing(false);
    setIsEditingTopicName(false);
    setIsEditingDescription(false);
    setIsEditingKeywords(false);
    setIsEditingInstructions(false);
    try {
      const response = await getTopic(topicId);
      setTopic(response.data.data);
      setEditedTopicName(response.data.data.topicName || '');
      setEditedScript(response.data.data.narrationScript || '');
      setEditedDescription(response.data.data.description || '');
      setEditedKeywords(response.data.data.keywords || '');
      setEditedInstructions(response.data.data.stepByStepInstructions || '');
      setLocalVideoPath(response.data.data.localVideoPath || '');
      setPrivacyStatus(response.data.data.privacyStatus || 'private');
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

  const handleRegenerateAudio = async () => {
    setIsRegeneratingAudio(true);
    setError(null);
    try {
      const response = await regenerateAudio(topicId);
      setTopic((prev) => ({
        ...prev,
        audioUrl: response.data.data.audioUrl,
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to regenerate audio');
    } finally {
      setIsRegeneratingAudio(false);
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

  const handleSaveTopicName = async () => {
    if (!editedTopicName.trim()) {
      setError('Topic name cannot be empty');
      return;
    }

    setIsSavingTopicName(true);
    try {
      const response = await updateTopicName(topicId, editedTopicName);
      setTopic(response.data.data);
      setIsEditingTopicName(false);
      setError(null);
    } catch (err) {
      setError('Failed to save topic name');
    } finally {
      setIsSavingTopicName(false);
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

  const handleSaveUploadInfo = async () => {
    setIsSavingUploadInfo(true);
    try {
      const response = await updateUploadInfo(topicId, localVideoPath, privacyStatus);
      setTopic(response.data.data);
      setError(null);
      alert('Upload settings saved successfully!');
    } catch (err) {
      setError('Failed to save upload settings');
    } finally {
      setIsSavingUploadInfo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-8 px-2 sm:px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <p className="text-gray-600 text-base sm:text-lg">⏳ Loading topic...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-8 px-2 sm:px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <p className="text-gray-600 text-base sm:text-lg">Topic not found</p>
            <button
              onClick={() => navigate('/topics')}
              className="mt-3 sm:mt-4 px-4 sm:px-6 py-1.5 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-8 px-2 sm:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <button
                onClick={() => navigate('/topics')}
                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 inline-flex items-center"
              >
                ← Back to Topics
              </button>
              {isEditingTopicName ? (
                <div className="mb-2 sm:mb-3 space-y-1.5 sm:space-y-2 max-w-2xl">
                  <input
                    type="text"
                    value={editedTopicName}
                    onChange={(e) => setEditedTopicName(e.target.value)}
                    className="w-full p-1.5 sm:p-2 text-lg sm:text-2xl font-bold text-gray-800 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter topic name..."
                  />
                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      onClick={handleSaveTopicName}
                      disabled={isSavingTopicName}
                      className="px-2.5 py-1 sm:px-3 sm:py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                    >
                      {isSavingTopicName ? '💾 Saving...' : '💾 Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingTopicName(false);
                        setEditedTopicName(topic.topicName || '');
                      }}
                      className="px-2.5 py-1 sm:px-3 sm:py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                  <h1 className="text-xl sm:text-3xl font-bold text-gray-800 break-words">
                    {topic.topicName}
                  </h1>
                  <button
                    onClick={() => {
                      setEditedTopicName(topic.topicName || '');
                      setIsEditingTopicName(true);
                    }}
                    className="px-2 py-0.5 sm:py-1 bg-blue-500 hover:bg-blue-600 text-white text-[11px] sm:text-xs font-medium rounded transition-colors flex-shrink-0"
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
              <div className="mb-2.5 sm:mb-4">
                <StatusBadge status={topic.status} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 mb-2">
                {/* Description Section */}
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-2">Description</h3>
                  {isEditingDescription ? (
                    <div className="space-y-1.5 sm:space-y-2">
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded text-gray-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter topic description..."
                        rows="3"
                      />
                      <div className="flex gap-1.5 sm:gap-2">
                        <button
                          onClick={handleSaveDescription}
                          disabled={isSavingDescription}
                          className="px-2.5 py-1 sm:px-3 sm:py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                        >
                          {isSavingDescription ? '💾 Saving...' : '💾 Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingDescription(false);
                            setEditedDescription(topic.description || '');
                          }}
                          className="px-2.5 py-1 sm:px-3 sm:py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      {topic.description ? (
                        <p className="text-gray-600 flex-1 text-xs sm:text-sm">{topic.description}</p>
                      ) : (
                        <p className="text-gray-400 italic flex-1 text-xs sm:text-sm">
                          No description
                        </p>
                      )}
                      <button
                        onClick={() => setIsEditingDescription(true)}
                        className="px-2 py-0.5 sm:py-1 bg-blue-500 hover:bg-blue-600 text-white text-[11px] sm:text-xs font-medium rounded transition-colors flex-shrink-0"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Keywords Section */}
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-2">Keywords</h3>
                  {isEditingKeywords ? (
                    <div className="space-y-1.5 sm:space-y-2">
                      <textarea
                        value={editedKeywords}
                        onChange={(e) => setEditedKeywords(e.target.value)}
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded text-gray-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter topic keywords..."
                        rows="3"
                      />
                      <div className="flex gap-1.5 sm:gap-2">
                        <button
                          onClick={handleSaveKeywords}
                          disabled={isSavingKeywords}
                          className="px-2.5 py-1 sm:px-3 sm:py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                        >
                          {isSavingKeywords ? '💾 Saving...' : '💾 Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingKeywords(false);
                            setEditedKeywords(topic.keywords || '');
                          }}
                          className="px-2.5 py-1 sm:px-3 sm:py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={keywordSearch}
                            onChange={(e) => setKeywordSearch(e.target.value)}
                            placeholder="🔍 Filter by keyword or topic group..."
                            className="w-full pl-7 sm:pl-8 pr-2.5 sm:pr-3 py-1 sm:py-1.5 text-[11px] sm:text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
                          className="px-2 py-0.5 sm:py-1 bg-blue-500 hover:bg-blue-600 text-white text-[11px] sm:text-xs font-medium rounded transition-colors flex-shrink-0"
                        >
                          ✏️ Edit
                        </button>
                      </div>

                      {sortedKeywords.length > 0 ? (
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 shadow-sm max-h-64 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
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
                                  className="px-2 py-1.5 sm:px-3 sm:py-2 cursor-pointer hover:bg-gray-200 select-none font-semibold text-gray-700 transition-colors"
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
                                  className="px-2 py-1.5 sm:px-3 sm:py-2 cursor-pointer hover:bg-gray-200 select-none font-semibold text-gray-700 transition-colors"
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
                                  className="px-2 py-1.5 sm:px-3 sm:py-2 cursor-pointer hover:bg-gray-200 select-none font-semibold text-gray-700 text-right transition-colors"
                                  style={{ width: '80px' }}
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
                                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-gray-800 break-words font-medium">
                                    {item.keyword}
                                  </td>
                                  <td className="px-2 py-1.5 sm:px-3 sm:py-2 text-gray-600 font-medium">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold ${
                                      item.topicName === 'Manual'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    }`}>
                                      {item.topicName}
                                    </span>
                                  </td>
                                  <td
                                    className="px-2 py-1.5 sm:px-3 sm:py-2 text-gray-600 text-right font-mono"
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
                        <p className="text-gray-500 italic text-[11px] sm:text-xs py-1.5">
                          {keywordSearch ? 'No keywords match the filter' : 'No valid keywords parsed'}
                        </p>
                      )}

                      {parsedKeywords.length > 0 && (
                        <div className="flex justify-between items-center text-[9px] sm:text-[10px] text-gray-500 px-1">
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
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-1 sm:mb-2">Step-by-Step Instructions</h3>
                {isEditingInstructions ? (
                  <div className="space-y-1.5 sm:space-y-2">
                    <textarea
                      value={editedInstructions}
                      onChange={(e) => setEditedInstructions(e.target.value)}
                      className="w-full p-2 sm:p-3 border border-gray-300 rounded text-gray-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter step-by-step instructions..."
                      rows="6"
                    />
                    <div className="flex gap-1.5 sm:gap-2">
                      <button
                        onClick={handleSaveInstructions}
                        disabled={isSavingInstructions}
                        className="px-2.5 py-1 sm:px-3 sm:py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                      >
                        {isSavingInstructions ? '💾 Saving...' : '💾 Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingInstructions(false);
                          setEditedInstructions(topic.stepByStepInstructions || '');
                        }}
                        className="px-2.5 py-1 sm:px-3 sm:py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    {topic.stepByStepInstructions ? (
                      <div className="text-gray-600 flex-1 text-xs sm:text-sm whitespace-pre-wrap">
                        {topic.stepByStepInstructions}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic flex-1 text-xs sm:text-sm">
                        No instructions provided
                      </p>
                    )}
                    <button
                      onClick={() => setIsEditingInstructions(true)}
                      className="px-2 py-0.5 sm:py-1 bg-blue-500 hover:bg-blue-600 text-white text-[11px] sm:text-xs font-medium rounded transition-colors flex-shrink-0"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded p-2 sm:p-3">
              <p className="text-gray-600 text-[10px] sm:text-xs">User ID</p>
              <p className="text-gray-800 font-medium truncate">{topic.userId}</p>
            </div>
            <div className="bg-gray-50 rounded p-2 sm:p-3">
              <p className="text-gray-600 text-[10px] sm:text-xs">Created</p>
              <p className="text-gray-800 font-medium">
                {new Date(topic.createdAt).toLocaleDateString()}
              </p>
            </div>
            {topic.processedAt && (
              <div className="bg-gray-50 rounded p-2 sm:p-3 col-span-2 sm:col-span-1">
                <p className="text-gray-600 text-[10px] sm:text-xs">Processed</p>
                <p className="text-gray-800 font-medium">
                  {new Date(topic.processedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 sm:p-4 mb-3 sm:mb-6 text-red-700 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* YouTube Titles Section (always visible or if topic exists) */}
        {topic && (
          <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-2 sm:mb-4">
              🎬 Titles
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
          <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-2 sm:mb-4">
              🎨 Thumbnail
            </h2>
            <ThumbnailSelector
              topicId={topicId}
              selectedThumbnail={topic.selectedThumbnail}
              generatedThumbnails={topic.generatedThumbnails}
              onThumbnailSelected={fetchTopic}
              audioUrl={audioBlobUrl || topic.audioUrl}
              timestamps={topic.timestamps}
            />
          </div>
        )}

        {/* YouTube Feed Preview Section */}
        {topic.selectedThumbnail && (
          <YouTubePreview
            thumbnail={topic.selectedThumbnail}
            title={topic.selectedTitle}
            channelName="Softfix Central"
            audioUrl={audioBlobUrl || topic.audioUrl}
            timestamps={topic.timestamps}
          />
        )}

        {/* Narration Script Section */}
        {topic.selectedThumbnail && (
          <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">
                📖 Narration Script
              </h2>
              {!isEditing && (
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  {topic.narrationScript && (
                    <button
                      onClick={handleCopyToClipboard}
                      className={`px-2.5 py-1 sm:px-3 sm:py-1 ${
                        copySuccess
                          ? 'bg-green-500'
                          : 'bg-gray-500 hover:bg-gray-600'
                      } text-white text-xs sm:text-sm font-medium rounded transition-colors`}
                    >
                      {copySuccess ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  )}
                  {topic.narrationScript && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-2.5 py-1 sm:px-3 sm:py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                    >
                      ✏️ Edit
                    </button>
                  )}
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating || topic.status === 'processing'}
                    className={`px-2.5 py-1 sm:px-3 sm:py-1 ${showRegenInput ? 'bg-green-500 hover:bg-green-600' : 'bg-purple-500 hover:bg-purple-600'} disabled:bg-gray-400 text-white text-xs sm:text-sm font-medium rounded transition-colors`}
                  >
                    {isRegenerating || topic.status === 'processing' ? '⏳ Generating...' : showRegenInput ? '🚀 Confirm' : topic.narrationScript ? '🔄 Regenerate' : '🚀 Generate Script'}
                  </button>
                  {showRegenInput && (
                    <button
                      onClick={() => {
                        setShowRegenInput(false);
                        setRegenComments('');
                      }}
                      className="px-2.5 py-1 sm:px-3 sm:py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                    >
                      ✕ Cancel
                    </button>
                  )}
                </div>
              )}
            </div>

            {showRegenInput && (
              <div className="mb-3 sm:mb-6 p-2.5 sm:p-4 bg-purple-50 border border-purple-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-xs sm:text-sm font-semibold text-purple-800 mb-1 sm:mb-2">
                  Regeneration Comments (Optional)
                </label>
                <p className="text-[11px] sm:text-xs text-purple-600 mb-2 sm:mb-3">
                  Provide feedback to the AI to adjust the tone, fix specific parts, or change the length of the script.
                </p>
                <textarea
                  value={regenComments}
                  onChange={(e) => setRegenComments(e.target.value)}
                  className="w-full p-2 sm:p-3 border border-purple-300 rounded-lg text-gray-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="e.g., Make it more enthusiastic, shorten the intro, focus more on the second step..."
                  rows="3"
                />
                <div className="mt-2.5 sm:mt-3 flex justify-end">
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="px-4 sm:px-6 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                  >
                    {isRegenerating ? '⏳ Processing...' : '🚀 Regenerate Now'}
                  </button>
                </div>
              </div>
            )}

            {/* Script Versions */}
            {topic.scriptVersions &&
              topic.scriptVersions.length > 0 &&
              !isEditing &&
              (() => {
                const activeScriptIdx = topic.scriptVersions.findIndex(
                  (v) => v.script === topic.narrationScript,
                );
                const activeScriptVersionNumber =
                  activeScriptIdx !== -1
                    ? activeScriptIdx + 1
                    : topic.scriptVersions.length;

                const selectedVersionIndex = Math.min(
                  Math.max(0, scriptVersionPage - 1),
                  topic.scriptVersions.length - 1,
                );
                const selectedVersion = topic.scriptVersions[selectedVersionIndex];
                const isActiveScript =
                  selectedVersion && topic.narrationScript === selectedVersion.script;

                return (
                  <div className="mb-3 sm:mb-6 bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                      <h3 className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1.5 sm:gap-2">
                        <span>📜</span> Script Version History ({topic.scriptVersions.length} version{topic.scriptVersions.length > 1 ? 's' : ''})
                      </h3>
                    </div>

                    <Paginator
                      currentPage={scriptVersionPage}
                      totalPages={topic.scriptVersions.length}
                      onPageChange={setScriptVersionPage}
                      itemLabel="Version"
                      colorScheme="blue"
                      activeBadgeIndex={activeScriptVersionNumber}
                      className="mb-2 sm:mb-3"
                    />

                    {selectedVersion && (
                      <div
                        className={`border rounded-lg p-2.5 sm:p-4 transition-all ${
                          isActiveScript
                            ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-500'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex flex-wrap justify-between items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b border-gray-200">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-[10px] sm:text-xs font-bold">
                                Version {scriptVersionPage}
                              </span>
                              <span className="text-[10px] sm:text-xs font-medium text-gray-500">
                                {new Date(selectedVersion.generatedAt).toLocaleString()}
                              </span>
                            </div>
                            {selectedVersion.comments && (
                              <span className="text-[10px] sm:text-xs text-gray-600 italic mt-0.5 sm:mt-1">
                                💬 Feedback: "{selectedVersion.comments}"
                              </span>
                            )}
                          </div>

                          <div>
                            {isActiveScript ? (
                              <span className="text-[10px] sm:text-xs font-bold text-blue-700 bg-blue-100 border border-blue-300 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex items-center gap-1">
                                ✓ Active Version
                              </span>
                            ) : (
                              <button
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      `Restore and use Version ${scriptVersionPage} as the main script?`,
                                    )
                                  ) {
                                    try {
                                      const response = await updateScript(
                                        topicId,
                                        selectedVersion.script,
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
                                className="text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors shadow-2xs flex items-center gap-1"
                              >
                                🔄 Restore Version {scriptVersionPage}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] sm:text-xs text-gray-800 whitespace-pre-wrap max-h-48 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3 font-mono leading-relaxed">
                          {selectedVersion.script}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            {isEditing ? (
              <div className="space-y-2 sm:space-y-3">
                <textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  className="w-full h-64 sm:h-96 p-2.5 sm:p-4 border border-gray-300 rounded text-gray-700 text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter narration script..."
                  style={{ fontFamily: 'monospace' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveScript}
                    disabled={isSaving}
                    className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                  >
                    {isSaving ? '💾 Saving...' : '💾 Save Script'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedScript(topic.narrationScript || '');
                    }}
                    className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-500 hover:bg-gray-600 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            ) : (
              topic.narrationScript && (
                <>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6 shadow-sm">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 sm:mb-3 border-b pb-1.5 sm:pb-2">
                      Active Script (Source of Truth)
                    </h3>
                    <div className="text-gray-800 whitespace-pre-wrap text-xs sm:text-base leading-relaxed font-serif max-h-72 sm:max-h-none overflow-y-auto">
                      {topic.narrationScript}
                    </div>
                  </div>
                </>
              )
            )}
          </div>
        )}


        {/* Script Audio Generation Section */}
        {topic.narrationScript && (
          <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
                  <div className="mt-0">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-1.5 sm:gap-2">
                        🎙️ Script Audio Generation
                      </h3>
                      <button
                        onClick={handleRegenerateAudio}
                        disabled={isRegeneratingAudio || isSaving}
                        className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center gap-1.5"
                      >
                        {isRegeneratingAudio ? (
                          <>
                            <span className="animate-spin text-xs">⏳</span> Regenerating...
                          </>
                        ) : (
                          <>
                            <span>🔄</span> Regenerate Audio
                          </>
                        )}
                      </button>
                    </div>

                    {topic.audioUrl ? (
                      <>
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-2.5 sm:p-4 shadow-inner flex flex-col md:flex-row items-center gap-2.5 sm:gap-4">
                        <div className="flex-1 w-full">
                          <audio key={audioBlobUrl || topic.audioUrl} controls className="w-full h-9 sm:h-10">
                            <source
                              src={audioBlobUrl || topic.audioUrl}
                              type={
                                topic.audioUrl.toLowerCase().endsWith('.wav')
                                  ? 'audio/wav'
                                  : 'audio/mpeg'
                              }
                            />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <a
                            href={audioBlobUrl || topic.audioUrl}
                            download={audioBlobUrl ? 'audio.wav' : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <span>🔗</span> Open Link
                          </a>
                        </div>
                      </div>

                      {/* Audio Versions */}
                      {topic.audioVersions &&
                        topic.audioVersions.length > 0 &&
                        (() => {
                          const activeAudioVersionIndex = topic.audioVersions.findIndex(
                            (v) => {
                              if (!topic.audioUrl) return false;
                              const vFile = v.audioUrl.split('?')[0].split('/').pop();
                              const cFile = topic.audioUrl.split('?')[0].split('/').pop();
                              return vFile === cFile;
                            },
                          );
                          const activeAudioVersionNumber =
                            activeAudioVersionIndex !== -1
                              ? activeAudioVersionIndex + 1
                              : topic.audioVersions.length;

                          const selectedAudioIndex = Math.min(
                            Math.max(0, audioVersionPage - 1),
                            topic.audioVersions.length - 1,
                          );
                          const selectedAudioVersion =
                            topic.audioVersions[selectedAudioIndex];

                          const selectedFileName = selectedAudioVersion?.audioUrl
                            ?.split('?')[0]
                            .split('/')
                            .pop();
                          const currentFileName = topic.audioUrl
                            ?.split('?')[0]
                            .split('/')
                            .pop();
                          const isCurrentAudioVersion = Boolean(
                            selectedFileName &&
                              currentFileName &&
                              selectedFileName === currentFileName,
                          );

                          return (
                            <div className="mt-3 sm:mt-6 bg-purple-50/50 border border-purple-200/80 rounded-xl p-2.5 sm:p-4 shadow-2xs">
                              <div className="flex justify-between items-center mb-2 sm:mb-3">
                                <h4 className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1.5 sm:gap-2">
                                  <span>🎙️</span> Audio Version History ({topic.audioVersions.length} version{topic.audioVersions.length > 1 ? 's' : ''})
                                </h4>
                              </div>

                              <Paginator
                                currentPage={audioVersionPage}
                                totalPages={topic.audioVersions.length}
                                onPageChange={setAudioVersionPage}
                                itemLabel="Audio Version"
                                colorScheme="purple"
                                activeBadgeIndex={activeAudioVersionNumber}
                                className="mb-2 sm:mb-3"
                              />

                              {selectedAudioVersion && (
                                <div
                                  className={`border rounded-xl p-2.5 sm:p-4 flex flex-col md:flex-row justify-between items-center gap-2.5 sm:gap-4 transition-all ${
                                    isCurrentAudioVersion
                                      ? 'border-purple-500 bg-purple-100/60 ring-1 ring-purple-500'
                                      : 'border-gray-200 bg-white'
                                  }`}
                                >
                                  <div className="flex flex-col gap-1.5 sm:gap-2 w-full flex-1">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-mono text-[10px] sm:text-xs font-bold">
                                        Audio Version {audioVersionPage}
                                      </span>
                                      <span className="text-[10px] sm:text-xs font-medium text-gray-500">
                                        {new Date(selectedAudioVersion.generatedAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <audio controls className="w-full h-8 sm:h-10" preload="none">
                                      <source
                                        src={selectedAudioVersion.audioUrl}
                                        type={
                                          selectedAudioVersion.audioUrl
                                            .toLowerCase()
                                            .endsWith('.wav')
                                            ? 'audio/wav'
                                            : 'audio/mpeg'
                                        }
                                      />
                                      Your browser does not support audio element.
                                    </audio>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {isCurrentAudioVersion ? (
                                      <span className="text-[10px] sm:text-xs font-bold text-purple-700 bg-purple-200/80 border border-purple-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1">
                                        ✓ Currently Active
                                      </span>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          if (
                                            window.confirm(
                                              `Restore Audio Version ${audioVersionPage} as active?`,
                                            )
                                          ) {
                                            try {
                                              const response = await updateAudioUrl(
                                                topicId,
                                                selectedAudioVersion.audioUrl,
                                              );
                                              setTopic((prev) => ({
                                                ...prev,
                                                ...response.data.data,
                                              }));
                                            } catch (err) {
                                              console.error(err);
                                              setError('Failed to restore audio version');
                                            }
                                          }
                                        }}
                                        className="text-[10px] sm:text-xs bg-purple-600 hover:bg-purple-700 text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors font-semibold whitespace-nowrap shadow-2xs flex items-center gap-1"
                                      >
                                        🔄 Restore Audio Version {audioVersionPage}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 sm:p-4 text-center">
                        <p className="text-amber-800 text-xs sm:text-sm font-medium">
                          ⚠️ No audio generated for this script yet.
                        </p>
                        <p className="text-[11px] sm:text-xs text-amber-600 mt-0.5 sm:mt-1">
                          Click the "Regenerate Audio" button to generate the narration voiceover.
                        </p>
                      </div>
                    )}
                  </div>
          </div>
        )}

        {/* Recording Cues Section */}
        {topic.narrationScript && (
          <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">
                🎥 Recording Cues
              </h2>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {topic.recordingCues && (
                  <button
                    onClick={handleGenerateCues}
                    disabled={isGeneratingCues}
                    className="px-2.5 py-1 sm:px-4 sm:py-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 text-xs sm:text-sm font-medium rounded transition-colors"
                  >
                    {isGeneratingCues ? '⏳ Regenerating...' : '🔄 Regenerate'}
                  </button>
                )}
                <button
                  onClick={topic.recordingCues ? () => setShowCuesDialog(true) : handleGenerateCues}
                  disabled={isGeneratingCues}
                  className="px-2.5 py-1 sm:px-4 sm:py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white text-xs sm:text-sm font-medium rounded transition-colors"
                >
                  {isGeneratingCues && !topic.recordingCues ? '⏳ Generating...' : topic.recordingCues ? '👁️ View Cues' : '🚀 Generate Cues'}
                </button>
              </div>
            </div>
            
            {topic.recordingCues && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 sm:p-4 mt-2">
                <p className="text-xs sm:text-sm text-gray-500 mb-1.5 sm:mb-2 italic">Cues ready. Click "View Cues" to open the recording dialog.</p>
                <div className="text-gray-800 text-xs sm:text-sm max-h-36 sm:max-h-40 overflow-hidden relative">
                  {renderMarkdown(topic.recordingCues)}
                  <div className="absolute bottom-0 left-0 right-0 h-8 sm:h-12 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recording Cues Dialog (Modal) */}
        {showCuesDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-3.5 sm:p-5 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <h3 className="text-base sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span>🎥</span> Screen Recording Cues
                </h3>
                <button
                  onClick={() => setShowCuesDialog(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 text-gray-700 text-xs sm:text-base leading-relaxed">
                {topic.recordingCues ? (
                  <div className="bg-gray-50/50 rounded-xl p-3 sm:p-5 border border-gray-100 shadow-inner">
                    {renderMarkdown(topic.recordingCues)}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-6 sm:py-8">No cues generated yet.</p>
                )}
              </div>
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setShowCuesDialog(false)}
                  className="px-4 sm:px-5 py-1.5 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extra Assets Section */}
        {topic.narrationScript && (
          <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-2 sm:mb-4">
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

        {/* Upload Settings Section */}
        {topic.seoDescription && topic.audioUrl && (
          <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-2 sm:mb-4">
              📤 Upload Settings
            </h2>
            <div className="space-y-2.5 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Local Video Path</label>
                <input
                  type="text"
                  value={localVideoPath}
                  onChange={(e) => setLocalVideoPath(e.target.value)}
                  placeholder="e.g. C:\Users\Jeet\Videos\final_render.mp4"
                  className="w-full p-1.5 sm:p-2 border border-gray-300 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Provide the absolute path to the video file on your local machine.</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Privacy Status</label>
                <select
                  value={privacyStatus}
                  onChange={(e) => setPrivacyStatus(e.target.value)}
                  className="w-full p-1.5 sm:p-2 border border-gray-300 rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <button
                onClick={handleSaveUploadInfo}
                disabled={isSavingUploadInfo}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-xs sm:text-sm font-medium rounded transition-colors"
              >
                {isSavingUploadInfo ? '⏳ Saving...' : '💾 Save Upload Settings'}
              </button>
            </div>
            
            {topic.youtubeUrl && (
              <div className="mt-2.5 sm:mt-4 p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded text-green-800 text-xs sm:text-sm">
                <strong>URL: </strong> 
                <a href={topic.youtubeUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 break-all">
                  {topic.youtubeUrl}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {topic.seoDescription &&
          topic.audioUrl &&
          topic.level !== 'editing' &&
          topic.level !== 'uploaded' && (
            <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
              <button
                onClick={handleMarkAsEditing}
                disabled={isMarkingEditing}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-xs sm:text-base font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.01]"
              >
                {isMarkingEditing
                  ? '⏳ Marking as Editing...'
                  : '✏️ Mark as Editing'}
              </button>
              <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-1.5 sm:mt-2">
                Click this when you are ready to review and edit the content
              </p>
            </div>
          )}

        {topic.seoDescription &&
          topic.audioUrl &&
          topic.level === 'editing' && (
            <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
              <button
                onClick={handleMarkAsUploaded}
                disabled={isMarkingUploaded}
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-xs sm:text-base font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.01]"
              >
                {isMarkingUploaded
                  ? '⏳ Marking as Uploaded...'
                  : '📤 Mark as Uploaded'}
              </button>
              <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-1.5 sm:mt-2">
                Click this after you have uploaded all assets to YouTube
              </p>
            </div>
          )}

        {topic.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 sm:p-4 mb-3 sm:mb-6">
            <p className="text-red-700 text-xs sm:text-sm">
              <strong>Error:</strong> {topic.errorMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicPage;
