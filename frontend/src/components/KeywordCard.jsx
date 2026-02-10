import React from 'react';

const KeywordCard = ({ keyword, onEdit, onDelete, onAddToTitle, onRemoveFromTitle }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getCompetitionColor = (competition) => {
    if (competition <= 30) return 'text-green-600';
    if (competition <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 border border-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-1 break-words">
            {keyword.keyword}
          </h3>
          <span className="text-xs text-gray-500">
            {keyword.numberOfWords} word{keyword.numberOfWords !== 1 ? 's' : ''}
          </span>
        </div>
        {keyword.addedToTitle && (
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            📋 In Queue
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 text-center">
          <p className={`text-xl font-bold ${getScoreColor(keyword.overall)}`}>
            {keyword.overall?.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Overall</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-600">
            {keyword.searchVolume?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Search Vol</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 text-center">
          <p className={`text-xl font-bold ${getCompetitionColor(keyword.competition)}`}>
            {keyword.competition?.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Competition</p>
        </div>
      </div>

      {/* 30d ago searches */}
      {keyword.thirtyDayAgoSearches > 0 && (
        <div className="text-sm text-gray-600 mb-4">
          <span className="text-gray-400">30d ago:</span>{' '}
          <span className="font-medium">{keyword.thirtyDayAgoSearches.toLocaleString()}</span>
          {keyword.searchVolume > keyword.thirtyDayAgoSearches && (
            <span className="text-green-600 ml-2">
              ↑ {((keyword.searchVolume - keyword.thirtyDayAgoSearches) / keyword.thirtyDayAgoSearches * 100).toFixed(0)}%
            </span>
          )}
          {keyword.searchVolume < keyword.thirtyDayAgoSearches && (
            <span className="text-red-600 ml-2">
              ↓ {((keyword.thirtyDayAgoSearches - keyword.searchVolume) / keyword.thirtyDayAgoSearches * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!keyword.addedToTitle ? (
          <button
            onClick={() => onAddToTitle(keyword._id)}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            📋 Add to Title
          </button>
        ) : (
          <button
            onClick={() => onRemoveFromTitle(keyword._id)}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            ✖️ Remove from Queue
          </button>
        )}
        <button
          onClick={() => onEdit(keyword)}
          className="px-3 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(keyword._id)}
          className="px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default KeywordCard;
