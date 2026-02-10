import React, { useState, useEffect, useRef } from 'react';
import {
  getKeywords,
  getKeywordStats,
  deleteKeyword,
  updateKeyword,
  addKeywordToTitle,
  removeKeywordFromTitle,
  uploadKeywords,
} from '../api/client';
import KeywordEditModal from './KeywordEditModal';

const KeywordsList = () => {
  const [keywords, setKeywords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [minOverall, setMinOverall] = useState('');
  const [maxOverall, setMaxOverall] = useState('');
  const [minSearchVolume, setMinSearchVolume] = useState('');
  const [maxSearchVolume, setMaxSearchVolume] = useState('');
  const [minCompetition, setMinCompetition] = useState('');
  const [maxCompetition, setMaxCompetition] = useState('');
  const [sortBy, setSortBy] = useState('overall');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterAddedToTitle, setFilterAddedToTitle] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Edit Modal
  const [editKeyword, setEditKeyword] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Show filters toggle
  const [showFilters, setShowFilters] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchKeywords();
    fetchStats();
  }, [page, sortBy, sortOrder]);

  const fetchKeywords = async () => {
    try {
      setError(null);
      const params = {
        page,
        limit: 50,
        sortBy,
        sortOrder,
      };
      if (search) params.search = search;
      if (minOverall) params.minOverall = minOverall;
      if (maxOverall) params.maxOverall = maxOverall;
      if (minSearchVolume) params.minSearchVolume = minSearchVolume;
      if (maxSearchVolume) params.maxSearchVolume = maxSearchVolume;
      if (minCompetition) params.minCompetition = minCompetition;
      if (maxCompetition) params.maxCompetition = maxCompetition;
      if (filterAddedToTitle) params.addedToTitle = filterAddedToTitle;

      const response = await getKeywords(params);
      setKeywords(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to fetch keywords');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getKeywordStats();
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchKeywords();
  };

  const handleClearFilters = () => {
    setSearch('');
    setMinOverall('');
    setMaxOverall('');
    setMinSearchVolume('');
    setMaxSearchVolume('');
    setMinCompetition('');
    setMaxCompetition('');
    setFilterAddedToTitle('');
    setPage(1);
    setTimeout(() => fetchKeywords(), 0);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Filter out duplicate files (ending with "(1)" etc.)
    const validFiles = files.filter(file => !file.name.match(/\(\d+\)\.[^.]+$/));
    
    if (validFiles.length === 0) {
      setError('All selected files appear to be duplicates (files ending with numbers in parentheses)');
      return;
    }

    setUploading(true);
    setUploadResult(null);
    setError(null);

    try {
      const response = await uploadKeywords(validFiles);
      setUploadResult(response.data.data);
      fetchKeywords();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this keyword?')) {
      try {
        await deleteKeyword(id);
        fetchKeywords();
        fetchStats();
        setError(null);
      } catch (err) {
        setError('Failed to delete keyword');
      }
    }
  };

  const handleEdit = (keyword) => {
    setEditKeyword(keyword);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (id, data) => {
    await updateKeyword(id, data);
    fetchKeywords();
    fetchStats();
  };

  const handleAddToTitle = async (id) => {
    try {
      await addKeywordToTitle(id);
      fetchKeywords();
      fetchStats();
    } catch (err) {
      setError('Failed to add keyword to title');
    }
  };

  const handleRemoveFromTitle = async (id) => {
    try {
      await removeKeywordFromTitle(id);
      fetchKeywords();
      fetchStats();
    } catch (err) {
      setError('Failed to remove keyword from title');
    }
  };

  // Helper function to round decimals to 2 places
  const roundDecimal = (num) => {
    if (num === null || num === undefined) return 0;
    return Math.round(num * 100) / 100;
  };

  // Helper function to format search volume with k/mil notation
  const formatSearchVolume = (volume) => {
    if (!volume || volume === 0) return '0';
    if (volume >= 1000000) {
      return `${roundDecimal(volume / 1000000)}mil`;
    }
    if (volume >= 1000) {
      return `${roundDecimal(volume / 1000)}k`;
    }
    return volume.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🔑 Question Keywords Manager
          </h1>
          <p className="text-gray-600">
            Import, filter, and manage SEO keywords from Excel files
          </p>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{stats.totalKeywords}</p>
              <p className="text-gray-600 text-xs">Total Keywords</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.avgOverall}</p>
              <p className="text-gray-600 text-xs">Avg Score</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.avgCompetition}</p>
              <p className="text-gray-600 text-xs">Avg Competition</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.avgSearchVolume?.toLocaleString()}</p>
              <p className="text-gray-600 text-xs">Avg Search Vol</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.addedToTitleCount}</p>
              <p className="text-gray-600 text-xs">In Title Queue</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.highScoreCount}</p>
              <p className="text-gray-600 text-xs">High Score (70+)</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-cyan-600">{stats.lowCompetitionCount}</p>
              <p className="text-gray-600 text-xs">Low Competition</p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
            />
            <label
              htmlFor="excel-upload"
              className={`flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-lg cursor-pointer hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg text-center ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {uploading ? '📤 Uploading...' : '📁 Upload Excel Files'}
            </label>
            <button
              onClick={() => fetchKeywords()}
              className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 font-medium rounded-lg transition-colors ${showFilters ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              🔍 {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium mb-2">✅ Upload Complete!</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-gray-600">
                <span>Files: {uploadResult.filesProcessed}</span>
                <span>Total: {uploadResult.totalKeywords}</span>
                <span className="text-green-600">Added: {uploadResult.storedKeywords}</span>
                <span className="text-blue-600">Updated: {uploadResult.updatedKeywords}</span>
                <span className="text-gray-500">Skipped: {uploadResult.skippedKeywords}</span>
              </div>
            </div>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-md p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Keyword</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter keyword..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Overall Score Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overall Score</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={minOverall}
                    onChange={(e) => setMinOverall(e.target.value)}
                    placeholder="Min"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={maxOverall}
                    onChange={(e) => setMaxOverall(e.target.value)}
                    placeholder="Max"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Search Volume Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Volume</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={minSearchVolume}
                    onChange={(e) => setMinSearchVolume(e.target.value)}
                    placeholder="Min"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={maxSearchVolume}
                    onChange={(e) => setMaxSearchVolume(e.target.value)}
                    placeholder="Max"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Competition Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competition</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={minCompetition}
                    onChange={(e) => setMinCompetition(e.target.value)}
                    placeholder="Min"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={maxCompetition}
                    onChange={(e) => setMaxCompetition(e.target.value)}
                    placeholder="Max"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="overall">Overall Score</option>
                  <option value="searchVolume">Search Volume</option>
                  <option value="competition">Competition</option>
                  <option value="keyword">Keyword</option>
                  <option value="createdAt">Date Added</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              {/* Added to Title Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title Queue</label>
                <select
                  value={filterAddedToTitle}
                  onChange={(e) => setFilterAddedToTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  <option value="true">In Queue</option>
                  <option value="false">Not in Queue</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-end gap-2">
                <button
                  onClick={handleSearch}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Keywords List/Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">⏳ Loading keywords...</p>
          </div>
        ) : keywords.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">
              No keywords found. Upload Excel files to get started! 📁
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Keyword</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Overall</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Search Vol</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Competition</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {keywords.map((keyword, index) => (
                      <tr 
                        key={keyword._id}
                        className={`hover:bg-purple-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-800 font-medium">{keyword.keyword}</span>
                            {keyword.addedToTitle && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                ✓ In Queue
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                              keyword.overall >= 70
                                ? 'bg-green-100 text-green-700'
                                : keyword.overall >= 60
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {roundDecimal(keyword.overall)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 font-medium">
                          {formatSearchVolume(keyword.searchVolume)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              keyword.competition <= 30
                                ? 'bg-green-100 text-green-700'
                                : keyword.competition <= 60
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {roundDecimal(keyword.competition)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {keyword.addedToTitle ? (
                            <span className="text-green-600 font-medium">Added</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {!keyword.addedToTitle ? (
                              <button
                                onClick={() => handleAddToTitle(keyword._id)}
                                className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
                                title="Add to Topic List"
                              >
                                ➕
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRemoveFromTitle(keyword._id)}
                                className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                                title="Remove from Topic List"
                              >
                                ➖
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(keyword)}
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(keyword._id)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ← Previous
                </button>
                <span className="text-gray-600">
                  Page {page} of {pagination.pages} ({pagination.total} total)
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <KeywordEditModal
        keyword={editKeyword}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default KeywordsList;
