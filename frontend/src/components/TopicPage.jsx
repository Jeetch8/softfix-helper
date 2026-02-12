import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getTopic,
  updateScript,
  regenerateScript,
  markAsEditing,
  markAsUploaded,
} from '../api/client';
import StatusBadge from './StatusBadge';
import TitleSelector from './TitleSelector';
import ThumbnailSelector from './ThumbnailSelector';
import ExtraAssetsSelector from './ExtraAssetsSelector';

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

  useEffect(() => {
    if (topicId) {
      fetchTopic();
    }
  }, [topicId]);

  const fetchTopic = async () => {
    setLoading(true);
    setError(null);
    setIsEditing(false);
    try {
      const response = await getTopic(topicId);
      setTopic(response.data.data);
      setEditedScript(response.data.data.narrationScript || '');
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
    if (!window.confirm('Regenerate the narration script for this topic?')) {
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await regenerateScript(topicId);
      setTopic(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to regenerate script');
    } finally {
      setIsRegenerating(false);
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
              <div className="mb-2">
                <StatusBadge status={topic.status} />
              </div>
              {topic.description && (
                <p className="text-gray-600">{topic.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
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

        {/* Narration Script Section */}
        {topic.narrationScript && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                📖 Narration Script
              </h2>
              {!isEditing && (
                <div className="flex gap-2">
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
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="px-3 py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
                  >
                    {isRegenerating ? '⏳ Regenerating...' : '🔄 Regenerate'}
                  </button>
                </div>
              )}
            </div>

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
                      setEditedScript(topic.narrationScript);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded transition-colors"
                  >
                    ✕ Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-600 mb-3 border-b pb-2">
                  Active Script (Source of Truth)
                </h3>
                <div className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed font-serif">
                  {topic.narrationScript}
                </div>
              </div>
            )}
          </div>
        )}

        {/* YouTube Titles Section (standard) */}
        {topic.narrationScript && (
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

        {/* Standard YouTube Thumbnails Section */}
        {topic.selectedTitle && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🎨 YouTube Thumbnails (Standard)
            </h2>
            <ThumbnailSelector
              topicId={topicId}
              selectedThumbnail={topic.selectedThumbnail}
              generatedThumbnails={topic.generatedThumbnails || []}
              onThumbnailSelected={fetchTopic}
              onGenerateComplete={fetchTopic}
            />
          </div>
        )}

        {/* Extra Assets Section */}
        {topic.selectedThumbnail && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              ⭐ Extra Assets
            </h2>
            <ExtraAssetsSelector
              topicId={topicId}
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
