import React, { useState, useEffect } from 'react';
import { generateThumbnails, selectThumbnail } from '../api/client';

const ThumbnailSelector = ({
  topicId,
  selectedThumbnail,
  generatedThumbnails = [],
  onThumbnailSelected,
  onGenerateComplete,
}) => {
  const [thumbnails, setThumbnails] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [localSelectedThumbnail, setLocalSelectedThumbnail] = useState(
    selectedThumbnail || null,
  );

  useEffect(() => {
    if (generatedThumbnails && generatedThumbnails.length > 0) {
      // Handle migration from flat array to nested array if needed
      const isNested = Array.isArray(generatedThumbnails[0]);
      const formattedThumbnails = isNested ? generatedThumbnails : [generatedThumbnails];
      
      setThumbnails(formattedThumbnails);
      setCurrentIndex(formattedThumbnails.length - 1);
      setShowThumbnails(true);
    }
  }, [generatedThumbnails]);

  const handleGenerateThumbnails = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateThumbnails(topicId);
      const newThumbnails = response.data.data.generatedThumbnails;
      
      const isNested = Array.isArray(newThumbnails[0]);
      const formattedThumbnails = isNested ? newThumbnails : [newThumbnails];
      
      setThumbnails(formattedThumbnails);
      setCurrentIndex(formattedThumbnails.length - 1);
      setShowThumbnails(true);
      if (onGenerateComplete) onGenerateComplete();
    } catch (err) {
      setError(
        'Failed to generate thumbnails: ' +
          (err.response?.data?.message || err.message),
      );
      setShowThumbnails(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectThumbnail = async (thumbnail) => {
    try {
      await selectThumbnail(topicId, thumbnail.url);
      setLocalSelectedThumbnail(thumbnail.url);
      if (onThumbnailSelected) onThumbnailSelected(thumbnail);
      setShowThumbnails(false);
    } catch (err) {
      setError('Failed to select thumbnail');
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(thumbnails.length - 1, prev + 1));
  };

  const currentPair = thumbnails[currentIndex] || [];

  return (
    <div className="space-y-4">
      {localSelectedThumbnail && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <p className="text-green-700 text-sm mb-2">
            <strong>✅ Thumbnail Selected</strong>
          </p>
          <img
            src={localSelectedThumbnail}
            alt="Selected Thumbnail"
            className="w-full rounded max-h-96 object-contain bg-black"
          />
        </div>
      )}

      {!isGenerating && !showThumbnails && thumbnails.length === 0 && (
        <button
          onClick={handleGenerateThumbnails}
          className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded transition-colors"
        >
          🎨 Generate Thumbnails
        </button>
      )}

      {isGenerating && (
        <div className="text-center py-8 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-600 font-medium">
            ⏳ Generating eye-catching thumbnails...
          </p>
          <p className="text-blue-500 text-sm mt-2">
            This may take 1-2 minutes...
          </p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin">
              <div className="text-blue-600">●●●</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showThumbnails && thumbnails.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-800">
              Select a Thumbnail Set
            </h4>
            <div className="flex items-center gap-2">
              {thumbnails.length > 1 && (
                <div className="flex items-center gap-1 mr-2 bg-gray-100 rounded px-2 py-1">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="p-1 hover:bg-gray-200 disabled:opacity-50 rounded"
                    title="Previous Generation"
                  >
                    ◀
                  </button>
                  <span className="text-xs font-medium text-gray-600 min-w-[3rem] text-center">
                    {currentIndex + 1} / {thumbnails.length}
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={currentIndex === thumbnails.length - 1}
                    className="p-1 hover:bg-gray-200 disabled:opacity-50 rounded"
                    title="Next Generation"
                  >
                    ▶
                  </button>
                </div>
              )}
              <button
                onClick={handleGenerateThumbnails}
                disabled={isGenerating}
                className="px-3 py-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
              >
                {isGenerating ? '⏳ Generating...' : '🔄 Regenerate'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto p-2">
            {currentPair.map((thumbnail, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded overflow-hidden hover:border-orange-500 transition-colors cursor-pointer"
                onClick={() => handleSelectThumbnail(thumbnail)}
              >
                <div className="relative bg-black flex items-center justify-center">
                  <img
                    src={thumbnail.url}
                    alt={`Thumbnail ${thumbnail.index}`}
                    className="w-full h-auto max-h-64 object-contain"
                  />
                  <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {thumbnail.index}
                  </div>
                </div>
                <div className="p-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectThumbnail(thumbnail);
                    }}
                    className="w-full px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowThumbnails(false)}
            className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded transition-colors"
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
};

export default ThumbnailSelector;
