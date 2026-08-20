import React, { useState, useEffect } from 'react';
import { generateExtraAssets, regenerateAudio, fetchMediaAsBlobUrl } from '../api/client';

const ExtraAssetsSelector = ({
  topicId,
  topicTitle,
  extraAssets,
  onAssetsGenerated,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showAssets, setShowAssets] = useState(!!extraAssets);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [assets, setAssets] = useState(extraAssets || null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);

  useEffect(() => {
    if (assets && assets.audioUrl) {
      fetchMediaAsBlobUrl(assets.audioUrl).then(url => setAudioBlobUrl(url));
    }
  }, [assets?.audioUrl]);

  useEffect(() => {
    setAssets(extraAssets);
    if (extraAssets) {
      setShowAssets(true);
    }
  }, [extraAssets]);

  const handleGenerateAssets = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateExtraAssets(topicId);
      const data = response.data.data;
      setAssets({
        seoDescription: data.seoDescription,
        tags: data.tags,
        audioUrl: data.audioUrl,
      });
      setShowAssets(true);
      if (onAssetsGenerated) onAssetsGenerated(data);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to generate extra assets',
      );
      console.error('Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleDownload = async () => {
    if (!assets || !assets.audioUrl) return;
    setIsDownloading(true);
    try {
      const url = audioBlobUrl || assets.audioUrl;
      const a = document.createElement('a');
      a.href = url;

      const isWav = assets.audioUrl.toLowerCase().endsWith('.wav');
      const extension =
        assets.audioUrl.split('.').pop().split('?')[0] ||
        (isWav ? 'wav' : 'mp3');

      const safeTitle = (topicTitle || 'audio')
        .replace(/[/\\?%*:|"<>\s]/g, '_')
        .replace(/_+/g, '_');

      a.download = `${safeTitle}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download file:', err);
      // Fallback: open in new tab
      window.open(assets.audioUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRegenerateAudio = async () => {
    setIsRegeneratingAudio(true);
    setError(null);
    try {
      const response = await regenerateAudio(topicId);
      const data = response.data.data;
      setAssets((prev) => ({
        ...prev,
        audioUrl: data.audioUrl,
      }));
      if (onAssetsGenerated) {
        onAssetsGenerated();
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to regenerate audio',
      );
      console.error('Error:', err);
    } finally {
      setIsRegeneratingAudio(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {!isGenerating && !showAssets && !assets && (
        <button
          onClick={handleGenerateAssets}
          className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
        >
          ⭐ Generate Extra Assets (SEO, Tags, Timestamps, Audio)
        </button>
      )}

      {isGenerating && (
        <div className="text-center py-4 sm:py-6">
          <p className="text-gray-600 flex items-center justify-center gap-2 text-sm sm:text-base">
            <span className="animate-spin">⏳</span>
            Generating extra assets...
          </p>
          <p className="text-xs text-gray-500 mt-1 sm:mt-2">
            This may take a minute (generating description, tags, timestamps,
            and MP3 audio)
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2.5 sm:p-4">
          <p className="text-red-700 text-xs sm:text-sm">❌ Error: {error}</p>
        </div>
      )}

      {assets && showAssets && (
        <div className="space-y-2.5 sm:space-y-4">
          {/* SEO Description */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-4">
            <div className="flex justify-between items-start gap-2 sm:gap-3">
              <div className="flex-1">
                <p className="text-blue-700 text-xs font-semibold mb-1">
                  📝 SEO Description
                </p>
                <p className="text-blue-900 text-xs sm:text-sm">{assets.seoDescription}</p>
              </div>
              <button
                onClick={() => handleCopy(assets.seoDescription, 0)}
                className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  copiedIndex === 0
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copiedIndex === 0 ? '✓' : '📋'}
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 sm:p-4">
            <div className="flex justify-between items-start gap-2 sm:gap-3">
              <div className="flex-1">
                <p className="text-green-700 text-xs font-semibold mb-1.5 sm:mb-2">
                  🏷️ Tags
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {assets.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-green-200 text-green-800 text-[11px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleCopy(assets.tags.join(', '), 1)}
                className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  copiedIndex === 1
                    ? 'bg-green-500 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {copiedIndex === 1 ? '✓' : '📋'}
              </button>
            </div>
          </div>

          {/* Regenerate Button */}
          <button
            onClick={handleGenerateAssets}
            disabled={isGenerating}
            className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            🔄 Regenerate Extra Assets
          </button>
        </div>
      )}
    </div>
  );
};

export default ExtraAssetsSelector;
