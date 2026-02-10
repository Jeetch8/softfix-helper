import React from 'react';
import StatusBadge from './StatusBadge';

const TopicCard = ({ topic, onDelete, onView }) => {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
      <div className=" justify-between items-start">
        <div className="flex gap-2">
          <StatusBadge status={topic.status} />
          {topic.level && (
            <span
              className={`px-2 py-1 rounded text-xs font-semibold text-white ${topic.level === 'scripting'
                  ? 'bg-blue-500'
                  : topic.level === 'title'
                    ? 'bg-purple-500'
                    : topic.level === 'thumbnail'
                      ? 'bg-orange-500'
                      : topic.level === 'finished'
                        ? 'bg-green-500'
                        : topic.level === 'uploaded'
                          ? 'bg-emerald-600'
                          : 'bg-gray-500'
                }`}
            >
              {topic.level === 'uploaded' ? '📤 ' : ''}
              {topic.level.charAt(0).toUpperCase() + topic.level.slice(1)}
            </span>
          )}
        </div>
        <div className="flex-1 mt-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            {topic.topicName}
          </h3>
          {topic.description && (
            <p className="text-gray-600 text-sm mb-2">{topic.description}</p>
          )}
        </div>
      </div>

      {topic.userId && (
        <div className="text-xs text-gray-500 mb-3">👤 {topic.userId}</div>
      )}

      {topic.narrationScript && (
        <div className="bg-gray-50 rounded p-3 mb-4 max-h-32 overflow-y-auto border border-gray-200">
          <p className="text-gray-700 text-sm line-clamp-3">
            {topic.narrationScript}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>📅 {new Date(topic.createdAt).toLocaleDateString()}</span>
        {topic.processedAt && (
          <span>✓ {new Date(topic.processedAt).toLocaleDateString()}</span>
        )}
      </div>

      {topic.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded p-2 mb-4">
          <p className="text-red-700 text-sm">⚠️ Error: {topic.errorMessage}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onView(topic._id)}
          className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors"
        >
          📖 View
        </button>
        <button
          onClick={() => onDelete(topic._id)}
          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default TopicCard;
