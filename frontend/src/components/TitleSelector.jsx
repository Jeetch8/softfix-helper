import React, { useState, useEffect } from 'react';
import { generateTitles, updateTitle } from '../api/client';

const TitleSelector = ({
  topicId,
  selectedTitle,
  onTitleSelected,
  onGenerateComplete,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [localSelectedTitle, setLocalSelectedTitle] = useState(
    selectedTitle || null,
  );
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalSelectedTitle(selectedTitle);
  }, [selectedTitle]);

  const handleGenerateTitle = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateTitles(topicId);
      const newTitle = response.data.data.selectedTitle;
      setLocalSelectedTitle(newTitle);
      if (onTitleSelected) onTitleSelected(newTitle);
      if (onGenerateComplete) onGenerateComplete();
    } catch (err) {
      setError('Failed to generate title');
    } finally {
      setIsGenerating(false);
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
    <div className="space-y-2.5 sm:space-y-4">
      {localSelectedTitle ? (
        <div className="bg-green-50 border border-green-200 rounded p-2.5 sm:p-4">
          {isEditing ? (
            <div className="space-y-2 sm:space-y-3">
              <div>
                <label className="block text-green-700 text-xs sm:text-sm font-semibold mb-1 sm:mb-2">
                  ✏️ Edit Title:
                </label>
                <textarea
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Enter your title..."
                />
                <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                  {editedTitle.length} characters
                </p>
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className={`flex-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                    isSaving
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isSaving ? '⏳ Saving...' : '✓ Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs sm:text-sm font-medium transition-colors disabled:bg-gray-400"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start gap-2 sm:gap-3">
              <div className="flex-1">
                <p className="text-green-700 text-xs sm:text-sm">
                  <strong>📝 Selected Title:</strong> {localSelectedTitle}
                </p>
                <button
                  onClick={handleGenerateTitle}
                  disabled={isGenerating}
                  className="mt-2 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white text-[11px] sm:text-xs font-medium rounded transition-colors"
                >
                  {isGenerating ? '⏳ Regenerating...' : '🔄 Regenerate Title'}
                </button>
              </div>
              <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                <button
                  onClick={handleCopyTitle}
                  className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded text-[11px] sm:text-xs font-medium transition-colors ${
                    copySuccess
                      ? 'bg-green-500 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy'}
                </button>
                <button
                  onClick={handleEditClick}
                  className="px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] sm:text-xs font-medium transition-colors"
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleGenerateTitle}
          disabled={isGenerating}
          className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white text-xs sm:text-sm font-medium rounded transition-colors"
        >
          {isGenerating ? '⏳ Generating Title...' : '🎬 Generate Title'}
        </button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2.5 sm:p-3 text-red-700 text-xs sm:text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default TitleSelector;
