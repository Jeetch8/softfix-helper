import React, { useEffect, useState } from 'react';
import { generateVideoChapters } from '../api/client';

const formatChaptersForCopy = (chapters) => {
  if (!chapters || chapters.length === 0) return '';
  return chapters.map((c) => `${c.time} ${c.description}`).join('\n');
};

const VideoChaptersSelector = ({
  topicId,
  videoTranscript,
  timestamps,
  onChaptersGenerated,
}) => {
  const [transcript, setTranscript] = useState(videoTranscript || '');
  const [chapters, setChapters] = useState(timestamps || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTranscript(videoTranscript || '');
  }, [videoTranscript]);

  useEffect(() => {
    setChapters(timestamps || []);
  }, [timestamps]);

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError('Paste a timestamped video transcript first');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateVideoChapters(topicId, transcript.trim());
      const data = response.data.data;
      setChapters(data.timestamps || []);
      if (data.videoTranscript) {
        setTranscript(data.videoTranscript);
      }
      if (onChaptersGenerated) onChaptersGenerated(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to generate video chapters',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    const text = formatChaptersForCopy(chapters);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy chapters');
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <p className="text-xs sm:text-sm text-gray-600">
        Paste a timestamped transcript (YouTube captions or similar). Chapters are generated with Gemini Flash and saved on this topic.
      </p>

      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        className="w-full h-40 sm:h-56 p-2.5 sm:p-3 border border-gray-300 rounded-lg text-gray-700 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={'0:00 Welcome to this tutorial...\n0:18 Click the Start menu...\n1:02 Open Settings...'}
      />

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !transcript.trim()}
        className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {isGenerating
          ? '⏳ Generating chapters...'
          : chapters.length > 0
            ? '🔄 Regenerate Video Chapters'
            : '📑 Generate Video Chapters'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2.5 sm:p-4">
          <p className="text-red-700 text-xs sm:text-sm">❌ Error: {error}</p>
        </div>
      )}

      {chapters.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 sm:p-4">
          <div className="flex justify-between items-center gap-2 mb-2 sm:mb-3">
            <p className="text-slate-700 text-xs font-semibold">
              📑 YouTube Chapters ({chapters.length})
            </p>
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-800 text-white'
              }`}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {chapters.map((chapter, idx) => (
              <div
                key={`${chapter.time}-${idx}`}
                className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm bg-white border border-slate-200 rounded px-2 py-1.5 sm:px-3 sm:py-2"
              >
                <span className="font-mono font-semibold text-indigo-700 whitespace-nowrap">
                  {chapter.time}
                </span>
                <span className="text-gray-800">{chapter.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoChaptersSelector;
