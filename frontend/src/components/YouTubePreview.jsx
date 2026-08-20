import React, { useState, useEffect } from 'react';
import { fetchMediaAsBlobUrl } from '../api/client';

const YouTubePreview = ({ thumbnail, title, channelName = "Softfix Central" }) => {
  const [isDesktop, setIsDesktop] = useState(true);
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (thumbnail) {
      fetchMediaAsBlobUrl(thumbnail).then(url => setBlobUrl(url));
    } else {
      setBlobUrl(null);
    }
  }, [thumbnail]);

  if (!thumbnail || thumbnail === 'skipped') return null;

  return (
    <div className="bg-white rounded-xl sm:rounded-lg shadow-md p-3.5 sm:p-6 mb-3 sm:mb-6">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-2xl font-semibold text-gray-800">
          👀 Feed Preview
        </h2>
        <div className="flex bg-gray-100 rounded-lg p-0.5 sm:p-1">
          <button
            onClick={() => setIsDesktop(true)}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              isDesktop ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Desktop
          </button>
          <button
            onClick={() => setIsDesktop(false)}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              !isDesktop ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Mobile
          </button>
        </div>
      </div>

      <div className="flex justify-center bg-gray-50 p-2.5 sm:p-6 rounded-lg border border-gray-200">
        {/* Desktop View */}
        {isDesktop && (
          <div className="w-full max-w-[360px] flex flex-col gap-2.5 sm:gap-3 group cursor-pointer">
            {/* Thumbnail Container */}
            <div className="relative w-full aspect-video rounded-lg sm:rounded-xl overflow-hidden bg-gray-200">
              <img 
                src={blobUrl || thumbnail} 
                alt="Video Thumbnail" 
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded">
                21:23
              </div>
            </div>

            {/* Video Info */}
            <div className="flex gap-2.5 sm:gap-3 pr-2 sm:pr-6">
              {/* Channel Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                  {channelName.charAt(0)}
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="flex flex-col">
                <h3 className="text-[#0f0f0f] font-semibold text-xs sm:text-base leading-snug line-clamp-2">
                  {title || "Untitled Video"}
                </h3>
                <div className="text-[#606060] text-xs sm:text-sm mt-0.5 sm:mt-1 flex flex-col">
                  <span className="hover:text-[#0f0f0f] transition-colors">{channelName}</span>
                  <span>1.2K views • 2 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile View */}
        {!isDesktop && (
          <div className="w-full max-w-[375px] bg-white border border-gray-200 shadow-sm flex flex-col rounded-lg overflow-hidden">
            {/* Thumbnail Container */}
            <div className="relative w-full aspect-video bg-gray-200">
              <img 
                src={blobUrl || thumbnail} 
                alt="Video Thumbnail" 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded">
                21:23
              </div>
            </div>

            {/* Video Info */}
            <div className="flex gap-2.5 sm:gap-3 p-2.5 sm:p-3">
              {/* Channel Avatar */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs sm:text-base">
                  {channelName.charAt(0)}
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="flex flex-col flex-1 pr-2 sm:pr-4">
                <h3 className="text-[#0f0f0f] font-normal text-xs sm:text-sm leading-snug line-clamp-2">
                  {title || "Untitled Video"}
                </h3>
                <div className="text-[#606060] text-[11px] sm:text-xs mt-0.5 sm:mt-1 flex items-center gap-1 flex-wrap">
                  <span>{channelName}</span>
                  <span className="text-[10px]">•</span>
                  <span>1.2K views</span>
                  <span className="text-[10px]">•</span>
                  <span>2 hours ago</span>
                </div>
              </div>
              
              {/* More options icon placeholder */}
              <div className="flex-shrink-0 text-gray-500 pt-1 text-xs sm:text-sm">
                ⋮
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubePreview;
