import React, { useState, useEffect } from 'react';
import {
  getTopics,
  deleteTopic,
  getStatusStats,
  triggerProcessing,
} from '../api/client';
import CreateTopicForm from './CreateTopicForm';
import TopicCard from './TopicCard';
import TopicModal from './TopicModal';

const TopicsList = () => {
  const [topics, setTopics] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [processingLoading, setProcessingLoading] = useState(false);

  useEffect(() => {
    fetchTopics();
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTopics();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTopics = async () => {
    try {
      setError(null);
      const response = await getTopics();
      setTopics(response.data.data || []);
    } catch (err) {
      setError('Failed to fetch topics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getStatusStats();
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      try {
        await deleteTopic(id);
        fetchTopics();
        setError(null);
      } catch (err) {
        setError('Failed to delete topic');
      }
    }
  };

  const handleViewTopic = (id) => {
    setSelectedTopicId(id);
    setIsModalOpen(true);
  };

  const handleProcessNow = async () => {
    setProcessingLoading(true);
    try {
      await triggerProcessing();
      setError(null);
      // Refresh topics immediately
      setTimeout(() => {
        fetchTopics();
        fetchStats();
      }, 1000);
    } catch (err) {
      setError('Failed to trigger processing');
    } finally {
      setProcessingLoading(false);
    }
  };

  const filteredTopics =
    filterStatus === 'all'
      ? topics
      : topics.filter((t) => t.status === filterStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎬 YouTube Narration Generator
          </h1>
          <p className="text-gray-600">
            Create AI-powered narration scripts for your videos
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
              <p className="text-gray-600 text-sm">⏳ Pending</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.processing}
              </p>
              <p className="text-gray-600 text-sm">⚙️ Processing</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.completed}
              </p>
              <p className="text-gray-600 text-sm">✅ Completed</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-gray-600 text-sm">❌ Failed</p>
            </div>
          </div>
        )}

        {/* Create Topic Form */}
        <CreateTopicForm onSuccess={fetchTopics} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <button
            onClick={handleProcessNow}
            disabled={processingLoading}
            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {processingLoading ? '⏳ Processing...' : '🚀 Process Now'}
          </button>
          <button
            onClick={fetchTopics}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'pending', 'processing', 'completed', 'failed'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ),
          )}
        </div>

        {/* Topics List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">⏳ Loading topics...</p>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">
              {filterStatus === 'all'
                ? 'No topics yet. Create one to get started! 📝'
                : `No ${filterStatus} topics found.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTopics.map((topic) => (
              <TopicCard
                key={topic._id}
                topic={topic}
                onDelete={handleDelete}
                onView={handleViewTopic}
              />
            ))}
          </div>
        )}
      </div>

      {/* Topic Modal */}
      <TopicModal
        topicId={selectedTopicId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={() => {
          fetchTopics();
          fetchStats();
        }}
      />
    </div>
  );
};

export default TopicsList;
