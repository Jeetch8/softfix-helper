import React, { useState, useEffect } from 'react';
import {
  getIdeas,
  getIdeaStats,
  updateIdea,
  deleteIdea,
  convertIdeaToTopic,
} from '../api/client';

const IdeasList = () => {
  const [ideas, setIdeas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Detail Modal
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Convert Modal
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertIdea, setConvertIdea] = useState(null);
  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchIdeas();
    fetchStats();
  }, [page]);

  const fetchIdeas = async () => {
    try {
      setError(null);
      const params = { page, limit: 50 };
      if (search) params.search = search;

      const response = await getIdeas(params);
      setIdeas(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to fetch ideas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getIdeaStats();
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchIdeas();
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    setTimeout(() => fetchIdeas(), 0);
  };

  const handleOpenModal = (idea) => {
    setSelectedIdea(idea);
    setEditTitle(idea.title);
    setEditDescription(idea.description || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIdea(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleSave = async () => {
    if (!selectedIdea) return;
    setSaving(true);
    try {
      await updateIdea(selectedIdea._id, {
        title: editTitle,
        description: editDescription,
      });
      fetchIdeas();
      fetchStats();
      // Update the selected idea in the modal
      setSelectedIdea((prev) => ({
        ...prev,
        title: editTitle,
        description: editDescription,
      }));
      setError(null);
    } catch (err) {
      setError('Failed to update idea');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this idea?')) {
      try {
        await deleteIdea(id);
        fetchIdeas();
        fetchStats();
        if (selectedIdea && selectedIdea._id === id) {
          handleCloseModal();
        }
        setError(null);
      } catch (err) {
        setError('Failed to delete idea');
      }
    }
  };

  const handleOpenConvertModal = (idea) => {
    setConvertIdea(idea);
    setTopicName(idea.title);
    setTopicDescription(idea.description || '');
    setIsConvertModalOpen(true);
  };

  const handleCloseConvertModal = () => {
    setIsConvertModalOpen(false);
    setConvertIdea(null);
    setTopicName('');
    setTopicDescription('');
    setConverting(false);
  };

  const handleConvertToTopic = async () => {
    if (!convertIdea) return;
    if (!topicName.trim()) {
      setError('Topic name is required');
      return;
    }

    setConverting(true);
    try {
      // Convert idea to topic with custom name and description
      await convertIdeaToTopic(convertIdea._id, {
        topicName: topicName.trim(),
        description: topicDescription.trim(),
      });
      fetchIdeas();
      fetchStats();
      if (selectedIdea && selectedIdea._id === convertIdea._id) {
        setSelectedIdea((prev) => ({ ...prev, convertedToTopic: true }));
      }
      setError(null);
      handleCloseConvertModal();
      // Close the detail modal if it's open for the same idea
      if (selectedIdea && selectedIdea._id === convertIdea._id) {
        handleCloseModal();
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to convert idea to topic',
      );
    } finally {
      setConverting(false);
    }
  };

  const roundDecimal = (num) => {
    if (num === null || num === undefined) return 0;
    return Math.round(num * 100) / 100;
  };

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            💡 Ideas Manager
          </h1>
          <p className="text-gray-600">
            Manage your content ideas and convert them to topics
          </p>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {stats.totalIdeas}
              </p>
              <p className="text-gray-600 text-xs">Total Ideas</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.convertedCount}
              </p>
              <p className="text-gray-600 text-xs">Converted to Topics</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {(stats.totalIdeas || 0) - (stats.convertedCount || 0)}
              </p>
              <p className="text-gray-600 text-xs">Pending Ideas</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="🔍 Search ideas by title..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Search
            </button>
            {search && (
              <button
                onClick={handleClearSearch}
                className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => {
                fetchIdeas();
                fetchStats();
              }}
              className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Ideas List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">⏳ Loading ideas...</p>
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">
              No ideas yet. Add keywords from the Keywords page to get started!
              💡
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">
                        Description
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ideas.map((idea, index) => (
                      <tr
                        key={idea._id}
                        className={`hover:bg-amber-50 transition-colors cursor-pointer ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                        onClick={() => handleOpenModal(idea)}
                      >
                        <td className="px-4 py-3">
                          <span className="text-gray-800 font-medium">
                            {idea.title}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-500 text-sm truncate block max-w-xs">
                            {idea.description || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {idea.convertedToTopic ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              ✓ Converted
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="flex items-center justify-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!idea.convertedToTopic && (
                              <button
                                onClick={() => handleOpenConvertModal(idea)}
                                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                                title="Convert to Topic"
                              >
                                🚀
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(idea._id)}
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
                  onClick={() =>
                    setPage((p) => Math.min(pagination.pages, p + 1))
                  }
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

      {/* Detail Modal */}
      {isModalOpen && selectedIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">💡 Idea Details</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:text-gray-200 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Editable Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              {/* Editable Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  placeholder="Add a description for this idea..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Read-only Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Keyword Metrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Overall Score</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {roundDecimal(selectedIdea.overall)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Competition</p>
                    <p className="text-lg font-bold text-orange-600">
                      {roundDecimal(selectedIdea.competition)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Search Volume</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatSearchVolume(selectedIdea.searchVolume)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">30d Ago Searches</p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatSearchVolume(selectedIdea.thirtyDayAgoSearches)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Number of Words</p>
                    <p className="text-lg font-bold text-gray-700">
                      {selectedIdea.numberOfWords}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    {selectedIdea.convertedToTopic ? (
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium mt-1">
                        ✓ Converted
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full font-medium mt-1">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
                {!selectedIdea.convertedToTopic && (
                  <button
                    onClick={() => {
                      handleCloseModal();
                      handleOpenConvertModal(selectedIdea);
                    }}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
                  >
                    🚀 Convert to Topic
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedIdea._id)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Topic Modal */}
      {isConvertModalOpen && convertIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">🚀 Convert to Topic</h2>
                <button
                  onClick={handleCloseConvertModal}
                  className="text-white hover:text-gray-200 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-gray-600 text-sm">
                Review and customize the topic details before converting this
                idea.
              </p>

              {/* Topic Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="Enter topic name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Topic Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  rows={4}
                  placeholder="Add a description for this topic..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCloseConvertModal}
                  disabled={converting}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvertToTopic}
                  disabled={converting || !topicName.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {converting ? '⏳ Converting...' : '✓ Convert to Topic'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdeasList;
