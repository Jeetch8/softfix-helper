import React, { useState } from 'react';

const YouTubePreview = ({ thumbnail, title, channelName = "Softfix Central" }) => {
  const [isDesktop, setIsDesktop] = useState(true);

  if (!thumbnail) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          👀 YouTube Feed Preview
        </h2>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setIsDesktop(true)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isDesktop ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Desktop
          </button>
          <button
            onClick={() => setIsDesktop(false)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              !isDesktop ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Mobile
          </button>
        </div>
      </div>

      <div className="flex justify-center bg-gray-50 p-6 rounded-lg border border-gray-200">
        {/* Desktop View */}
        {isDesktop && (
          <div className="w-[360px] flex flex-col gap-3 group cursor-pointer">
            {/* Thumbnail Container */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-200">
              <img 
                src={thumbnail} 
                alt="Video Thumbnail" 
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                10:24
              </div>
            </div>

            {/* Video Info */}
            <div className="flex gap-3 pr-6">
              {/* Channel Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {channelName.charAt(0)}
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="flex flex-col">
                <h3 className="text-[#0f0f0f] font-semibold text-base leading-snug line-clamp-2">
                  {title || "Untitled Video"}
                </h3>
                <div className="text-[#606060] text-sm mt-1 flex flex-col">
                  <span className="hover:text-[#0f0f0f] transition-colors">{channelName}</span>
                  <span>1.2K views • 2 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile View */}
        {!isDesktop && (
          <div className="w-[375px] bg-white border border-gray-200 shadow-sm flex flex-col">
            {/* Thumbnail Container */}
            <div className="relative w-full aspect-video bg-gray-200">
              <img 
                src={thumbnail} 
                alt="Video Thumbnail" 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                10:24
              </div>
            </div>

            {/* Video Info */}
            <div className="flex gap-3 p-3">
              {/* Channel Avatar */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-base">
                  {channelName.charAt(0)}
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="flex flex-col flex-1 pr-4">
                <h3 className="text-[#0f0f0f] font-normal text-sm leading-snug line-clamp-2">
                  {title || "Untitled Video"}
                </h3>
                <div className="text-[#606060] text-xs mt-1 flex items-center gap-1 flex-wrap">
                  <span>{channelName}</span>
                  <span className="text-[10px]">•</span>
                  <span>1.2K views</span>
                  <span className="text-[10px]">•</span>
                  <span>2 hours ago</span>
                </div>
              </div>
              
              {/* More options icon placeholder */}
              <div className="flex-shrink-0 text-gray-500 pt-1">
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
