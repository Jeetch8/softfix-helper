import React, { useState } from 'react';
import { uploadThumbnail } from '../api/client';

const ThumbnailSelector = ({
  topicId,
  selectedThumbnail,
  onThumbnailSelected,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [localSelectedThumbnail, setLocalSelectedThumbnail] = useState(
    selectedThumbnail || null,
  );

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

  return (
    <div className="space-y-4">
      {localSelectedThumbnail && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-green-700 text-sm">
              <strong>✅ Thumbnail Uploaded</strong>
            </p>
            <label className="cursor-pointer px-3 py-1 bg-white border border-green-300 text-green-700 text-xs font-medium rounded hover:bg-green-50 transition-colors">
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
          <img
            src={localSelectedThumbnail}
            alt="Selected Thumbnail"
            className="w-full rounded max-h-96 object-contain bg-black"
          />
        </div>
      )}

      {!localSelectedThumbnail && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
          {isUploading ? (
            <div className="space-y-3">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-blue-600 font-medium">Uploading thumbnail...</p>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <div className="space-y-3">
                <div className="text-4xl">📸</div>
                <div className="text-gray-600">
                  <span className="text-blue-500 font-semibold">Click to upload</span> or drag and drop
                </div>
                <p className="text-xs text-gray-400">PNG, JPG or WEBP (max. 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
            </label>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default ThumbnailSelector;
