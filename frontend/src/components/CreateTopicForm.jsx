import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { createTopic, getSegregatorGroups } from '../api/client';

const CreateTopicForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    topicName: '',
    description: '',
    userId: 'default-user',
  });
  const [groupings, setGroupings] = useState([]);
  const [selectedGroupingId, setSelectedGroupingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Format avg search volume numbers as K / M shorthand
  const fmtVol = (n) => {
    const v = Number(n);
    if (!v || isNaN(v)) return null;
    if (v >= 1_000_000) {
      const x = v / 1_000_000;
      return `${x % 1 === 0 ? x : x.toFixed(1)}M`;
    }
    if (v >= 1_000) {
      const x = v / 1_000;
      return `${x % 1 === 0 ? x : x.toFixed(1)}K`;
    }
    return String(v);
  };

  // Build react-select options from the groupings list
  const groupingOptions = groupings.map((g) => {
    const vol = fmtVol(g.total_average_volume);
    return {
      value: g._id,
      label: vol ? `${g.title}  ·  ${vol} avg vol` : g.title,
    };
  });

  const selectedOption = groupingOptions.find((o) => o.value === selectedGroupingId) || null;

  useEffect(() => {
    const fetchGroupings = async () => {
      try {
        const response = await getSegregatorGroups();
        setGroupings(response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch groupings:', err);
      }
    };
    fetchGroupings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const selectedGrouping = groupings.find(g => g._id === selectedGroupingId);
  const keywordsList = selectedGrouping && selectedGrouping.keywords && selectedGrouping.keywords.length > 0
    ? selectedGrouping.keywords.flat()
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formattedKeywords = keywordsList
        .map(kw => `${kw.keyword} | ${kw.search_volume}`)
        .join(', ');

      const submitData = {
        ...formData,
        keywords: formattedKeywords
      };

      await createTopic(submitData);
      setSuccess(true);
      setFormData({ topicName: '', description: '', userId: 'default-user' });
      setSelectedGroupingId('');

      // Call parent callback to refresh list
      if (onSuccess) {
        onSuccess();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create topic');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        📝 Create New Topic
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-4 mb-4 text-green-700 text-sm">
          ✅ Topic created successfully! Processing will start in ~2 minutes.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic Name *
          </label>
          <input
            type="text"
            name="topicName"
            value={formData.topicName}
            onChange={handleChange}
            placeholder="e.g., Future of Artificial Intelligence"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Optional description for your topic..."
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Keyword Grouping
          </label>
          <Select
            isSearchable
            isClearable
            value={selectedOption}
            onChange={(opt) => setSelectedGroupingId(opt ? opt.value : '')}
            options={groupingOptions}
            placeholder="Search and select a grouping..."
            noOptionsMessage={() => 'No groupings found'}
            styles={{
              control: (base, state) => ({
                ...base,
                borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
                boxShadow: state.isFocused
                  ? '0 0 0 2px rgba(59,130,246,0.3)'
                  : 'none',
                '&:hover': { borderColor: '#3b82f6' },
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                minHeight: '42px',
                backgroundColor: 'white',
              }),
              singleValue: (base) => ({
                ...base,
                color: '#1d4ed8',
                fontWeight: '500',
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? '#3b82f6'
                  : state.isFocused
                  ? '#dbeafe'
                  : 'white',
                color: state.isSelected ? 'white' : '#1e293b',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }),
              menu: (base) => ({ ...base, zIndex: 50 }),
              placeholder: (base) => ({ ...base, color: '#9ca3af' }),
            }}
          />

          {keywordsList.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-medium text-gray-500">Keyword</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Overall</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Volume</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Comp.</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {keywordsList.map((kw, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900 font-medium">{kw.keyword}</td>
                      <td className="px-3 py-2 text-gray-600">{kw.overall}</td>
                      <td className="px-3 py-2 text-gray-600">{kw.search_volume}</td>
                      <td className="px-3 py-2 text-gray-600">{kw.competition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User ID
          </label>
          <input
            type="text"
            name="userId"
            value={formData.userId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? '⏳ Creating...' : '✨ Create Topic'}
        </button>
      </form>
    </div>
  );
};

export default CreateTopicForm;
