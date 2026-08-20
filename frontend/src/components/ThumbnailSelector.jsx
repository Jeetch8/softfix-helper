import React, { useState, useEffect } from 'react';
import { uploadThumbnail, skipThumbnail, selectThumbnail, fetchMediaAsBlobUrl } from '../api/client';
import Paginator from './Paginator';

const ThumbnailSelector = ({
  topicId,
  selectedThumbnail,
  generatedThumbnails = [],
  onThumbnailSelected,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [localSelectedThumbnail, setLocalSelectedThumbnail] = useState(
    selectedThumbnail || null,
  );
  const [blobUrl, setBlobUrl] = useState(null);

  // Normalize generatedThumbnails if nested or flat
  const batches = Array.isArray(generatedThumbnails) && generatedThumbnails.length > 0
    ? (Array.isArray(generatedThumbnails[0]) ? generatedThumbnails : [generatedThumbnails])
    : [];

  const [batchPage, setBatchPage] = useState(batches.length || 1);

  useEffect(() => {
    if (batches.length > 0) {
      setBatchPage(batches.length);
    }
  }, [batches.length]);

  useEffect(() => {
    setLocalSelectedThumbnail(selectedThumbnail || null);
  }, [selectedThumbnail]);

  useEffect(() => {
    if (localSelectedThumbnail) {
      fetchMediaAsBlobUrl(localSelectedThumbnail).then(url => setBlobUrl(url));
    } else {
      setBlobUrl(null);
    }
  }, [localSelectedThumbnail]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype) && !file.type.startsWith('image/')) {
       // Simple check for image
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await uploadThumbnail(topicId, file);
      const updatedTopic = response.data.data;
      const newThumbnailUrl = updatedTopic.selectedThumbnail;
      
      setLocalSelectedThumbnail(newThumbnailUrl);
      if (onThumbnailSelected) onThumbnailSelected({ url: newThumbnailUrl });
    } catch (err) {
      setError(
        'Failed to upload thumbnail: ' +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = async () => {
    setIsUploading(true);
    setError(null);
    try {
      const response = await skipThumbnail(topicId);
      const updatedTopic = response.data.data;
      const newThumbnailUrl = updatedTopic.selectedThumbnail;
      
      setLocalSelectedThumbnail(newThumbnailUrl);
      if (onThumbnailSelected) onThumbnailSelected({ url: newThumbnailUrl });
    } catch (err) {
      setError(
        'Failed to skip thumbnail: ' +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectGeneratedThumbnail = async (url) => {
    setIsUploading(true);
    setError(null);
    try {
      await selectThumbnail(topicId, url);
      setLocalSelectedThumbnail(url);
      if (onThumbnailSelected) onThumbnailSelected({ url });
    } catch (err) {
      setError(
        'Failed to select thumbnail: ' +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setIsUploading(false);
    }
  };

  const currentBatch = batches[batchPage - 1] || [];

  return (
    <div className="space-y-2.5 sm:space-y-4">
      {batches.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-4 shadow-2xs space-y-2 sm:space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs sm:text-sm font-bold text-gray-700">
              🖼️ Generated Thumbnail Sets ({batches.length} batch{batches.length > 1 ? 'es' : ''})
            </h3>
          </div>

          <Paginator
            currentPage={batchPage}
            totalPages={batches.length}
            onPageChange={setBatchPage}
            itemLabel="Batch"
            colorScheme="green"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-1 sm:mt-2">
            {currentBatch.map((thumb, idx) => {
              const isSelected = localSelectedThumbnail === thumb.url;
              return (
                <div
                  key={thumb.url || idx}
                  className={`border rounded-lg p-2 sm:p-2.5 transition-all flex flex-col items-center gap-1.5 sm:gap-2 ${
                    isSelected
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-500'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <img
                    src={thumb.url}
                    alt={`Thumbnail option ${idx + 1}`}
                    className="w-full h-28 sm:h-36 object-contain rounded bg-black"
                  />
                  <div className="w-full flex justify-between items-center gap-2 mt-0.5 sm:mt-1">
                    <span className="text-[11px] sm:text-xs font-semibold text-gray-600">
                      Option #{idx + 1}
                    </span>
                    {isSelected ? (
                      <span className="text-[10px] sm:text-xs font-bold text-green-700 bg-green-100 border border-green-300 px-2 sm:px-2.5 py-0.5 rounded-full">
                        ✓ Active
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelectGeneratedThumbnail(thumb.url)}
                        disabled={isUploading}
                        className="text-[11px] sm:text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium px-2.5 sm:px-3 py-0.5 sm:py-1 rounded transition-colors"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {localSelectedThumbnail && localSelectedThumbnail !== 'skipped' && (
        <div className="bg-green-50 border border-green-200 rounded p-2.5 sm:p-4">
          <div className="flex justify-between items-center mb-1.5 sm:mb-2">
            <p className="text-green-700 text-xs sm:text-sm">
              <strong>✅ Selected Thumbnail</strong>
            </p>
            <label className="cursor-pointer px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white border border-green-300 text-green-700 text-[11px] sm:text-xs font-medium rounded hover:bg-green-50 transition-colors">
              Change Image
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>
          <div className="relative inline-block w-full">
            <img
              src={blobUrl || localSelectedThumbnail}
              alt="Selected Thumbnail"
              className="w-full rounded max-h-96 object-contain bg-black"
            />
            <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-black/80 text-white text-[10px] sm:text-xs font-medium px-1.5 py-0.5 sm:px-2 sm:py-1 rounded shadow">
              21:23
            </div>
          </div>
        </div>
      )}

      {(!localSelectedThumbnail || localSelectedThumbnail === 'skipped') && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
          {localSelectedThumbnail === 'skipped' && (
            <div className="mb-2 sm:mb-4 text-amber-600 font-semibold text-xs sm:text-sm">
              ⏭️ Thumbnail generation skipped. You can still upload one below if you change your mind.
            </div>
          )}
          {isUploading ? (
            <div className="space-y-2 sm:space-y-3">
              <div className="animate-spin inline-block w-6 h-6 sm:w-8 sm:h-8 border-3 sm:border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-blue-600 text-xs sm:text-base font-medium">Processing...</p>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-4">
              <label className="cursor-pointer block">
                <div className="space-y-2 sm:space-y-3">
                  <div className="text-3xl sm:text-4xl">📸</div>
                  <div className="text-gray-600 text-xs sm:text-base">
                    <span className="text-blue-500 font-semibold">Click to upload</span> or drag and drop
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-400">PNG, JPG or WEBP (max. 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </label>
              {localSelectedThumbnail !== 'skipped' && (
                <div className="pt-2.5 sm:pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSkip}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs sm:text-sm font-medium rounded transition-colors"
                  >
                    Skip Thumbnail for Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2.5 sm:p-3 text-red-700 text-xs sm:text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default ThumbnailSelector;
