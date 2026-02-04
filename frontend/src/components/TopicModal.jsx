import React, { useEffect, useState } from 'react';
import { getTopic, updateScript, regenerateScript } from '../api/client';
import StatusBadge from './StatusBadge';
import TitleSelector from './TitleSelector';
import ThumbnailSelector from './ThumbnailSelector';
import ExtraAssetsSelector from './ExtraAssetsSelector';

const TopicModal = ({ topicId, isOpen, onClose, onUpdate }) => {
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (isOpen && topicId) {
      fetchTopic();
    }
  }, [isOpen, topicId]);

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
      if (onUpdate) onUpdate();
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
      if (onUpdate) onUpdate();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Topic Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-600">⏳ Loading...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 mb-4">
              {error}
            </div>
          )}

          {topic && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {topic.topicName}
                </h3>
                <div className="mb-2">
                  <StatusBadge status={topic.status} />
                </div>
                {topic.description && (
                  <p className="text-gray-600">{topic.description}</p>
                )}
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

              {topic.narrationScript && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-semibold text-gray-800">
                      📖 Narration Script
                    </h4>
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
                          {isRegenerating
                            ? '⏳ Regenerating...'
                            : '🔄 Regenerate'}
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedScript}
                        onChange={(e) => setEditedScript(e.target.value)}
                        className="w-full h-64 p-4 border border-gray-300 rounded text-gray-700 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter narration script..."
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
                    <div className="bg-gray-50 border border-gray-200 rounded p-4 text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {topic.narrationScript}
                    </div>
                  )}
                </div>
              )}

              {topic.narrationScript && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    🎬 YouTube Titles
                  </h4>
                  <TitleSelector
                    topicId={topicId}
                    selectedTitle={topic.selectedTitle}
                    generatedTitles={topic.generatedTitles || []}
                    onTitleSelected={() => {
                      fetchTopic();
                      if (onUpdate) onUpdate();
                    }}
                    onGenerateComplete={() => {
                      fetchTopic();
                    }}
                  />
                </div>
              )}

              {topic.selectedTitle && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    🎨 YouTube Thumbnails
                  </h4>
                  <ThumbnailSelector
                    topicId={topicId}
                    selectedThumbnail={topic.selectedThumbnail}
                    generatedThumbnails={topic.generatedThumbnails || []}
                    onThumbnailSelected={() => {
                      fetchTopic();
                      if (onUpdate) onUpdate();
                    }}
                    onGenerateComplete={() => {
                      fetchTopic();
                    }}
                  />
                </div>
              )}

              {topic.selectedThumbnail && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    ⭐ Extra Assets
                  </h4>
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
                    onAssetsGenerated={() => {
                      fetchTopic();
                      if (onUpdate) onUpdate();
                    }}
                  />
                </div>
              )}

              {topic.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-red-700 text-sm">
                    <strong>Error:</strong> {topic.errorMessage}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicModal;
