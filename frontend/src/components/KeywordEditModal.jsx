import React, { useState, useEffect } from 'react';

const KeywordEditModal = ({ keyword, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    keyword: '',
    overall: 0,
    competition: 0,
    searchVolume: 0,
    thirtyDayAgoSearches: 0,
    numberOfWords: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (keyword) {
      setFormData({
        keyword: keyword.keyword || '',
        overall: keyword.overall || 0,
        competition: keyword.competition || 0,
        searchVolume: keyword.searchVolume || 0,
        thirtyDayAgoSearches: keyword.thirtyDayAgoSearches || 0,
        numberOfWords: keyword.numberOfWords || 1,
      });
    }
    setError(null);
  }, [keyword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'keyword' ? value : parseFloat(value) || 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.overall <= 50) {
      setError('Overall score must be greater than 50');
      return;
    }

    setSaving(true);
    try {
      await onSave(keyword._id, formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save keyword');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Edit Keyword</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keyword
            </label>
            <input
              type="text"
              name="keyword"
              value={formData.keyword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overall Score
              </label>
              <input
                type="number"
                name="overall"
                value={formData.overall}
                onChange={handleChange}
                step="0.01"
                min="50.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competition
              </label>
              <input
                type="number"
                name="competition"
                value={formData.competition}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Volume
              </label>
              <input
                type="number"
                name="searchVolume"
                value={formData.searchVolume}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                30d Ago Searches
              </label>
              <input
                type="number"
                name="thirtyDayAgoSearches"
                value={formData.thirtyDayAgoSearches}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Words
            </label>
            <input
              type="number"
              name="numberOfWords"
              value={formData.numberOfWords}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KeywordEditModal;
