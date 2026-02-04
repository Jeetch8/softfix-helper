import React, { useState, useEffect } from 'react';
import { generateTitles, selectTitle, updateTitle } from '../api/client';

const TitleSelector = ({
  topicId,
  selectedTitle,
  generatedTitles = [],
  onTitleSelected,
  onGenerateComplete,
}) => {
  const [titles, setTitles] = useState(generatedTitles || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showTitles, setShowTitles] = useState(
    generatedTitles && generatedTitles.length > 0,
  );
  const [localSelectedTitle, setLocalSelectedTitle] = useState(
    selectedTitle || null,
  );
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (generatedTitles && generatedTitles.length > 0) {
      setTitles(generatedTitles);
      setShowTitles(true);
    }
  }, [generatedTitles]);

  const handleGenerateTitles = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateTitles(topicId);
      setTitles(response.data.data.generatedTitles);
      setShowTitles(true);
      if (onGenerateComplete) onGenerateComplete();
    } catch (err) {
      setError('Failed to generate titles');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectTitle = async (title) => {
    try {
      await selectTitle(topicId, title);
      setLocalSelectedTitle(title);
      if (onTitleSelected) onTitleSelected(title);
      setShowTitles(false);
    } catch (err) {
      setError('Failed to select title');
    }
  };

  const handleCopyTitle = async () => {
    if (!localSelectedTitle) return;
    try {
      await navigator.clipboard.writeText(localSelectedTitle);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleEditClick = () => {
    setEditedTitle(localSelectedTitle);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editedTitle || editedTitle.trim() === '') {
      setError('Title cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateTitle(topicId, editedTitle.trim());
      setLocalSelectedTitle(editedTitle.trim());
      if (onTitleSelected) onTitleSelected(editedTitle.trim());
      setIsEditing(false);
      setCopySuccess(false);
    } catch (err) {
      setError('Failed to update title');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle('');
  };


  return (
    <div className="space-y-4">
      {localSelectedTitle && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-green-700 text-sm font-semibold mb-2">
                  ✏️ Edit Title:
                </label>
                <textarea
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Enter your title..."
                />
                <p className="text-gray-500 text-xs mt-1">
                  {editedTitle.length} characters
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${isSaving
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                  {isSaving ? '⏳ Saving...' : '✓ Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium transition-colors disabled:bg-gray-400"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start gap-3">
              <p className="text-green-700 text-sm flex-1">
                <strong>📝 Selected Title:</strong> {localSelectedTitle}
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleCopyTitle}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${copySuccess
                      ? 'bg-green-500 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy'}
                </button>
                <button
                  onClick={handleEditClick}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!isGenerating && !showTitles && titles.length === 0 && (
        <button
          onClick={handleGenerateTitles}
          className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded transition-colors"
        >
          🎬 Generate YouTube Titles
        </button>
      )}

      {isGenerating && (
        <div className="text-center py-4">
          <p className="text-gray-600">⏳ Generating SEO-optimized titles...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showTitles && titles.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-800">
              Select a YouTube Title (10 options)
            </h4>
            <button
              onClick={handleGenerateTitles}
              disabled={isGenerating}
              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
            >
              🔄 Regenerate
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
            {titles.map((title, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => handleSelectTitle(title)}
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm break-words">{title}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {title.length} characters
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTitle(title);
                    }}
                    className="flex-shrink-0 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowTitles(false)}
            className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded transition-colors"
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
};

export default TitleSelector;
