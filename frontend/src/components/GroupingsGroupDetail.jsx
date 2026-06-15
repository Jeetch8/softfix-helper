import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getGroupingsGroup,
  getSegregatorGroups,
  createSegregatorGroup,
  deleteSegregatorGroup,
  updateSegregatorGroup,
  updateSegregatorKeywordGroups,
  updateGroupingsGroup,
} from '../api/client';

const GroupingsGroupDetail = () => {
  const { groupingsGroupId } = useParams();
  const navigate = useNavigate();

  const [parentGroup, setParentGroup] = useState(null);
  const [groupings, setGroupings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sorting: { [groupId]: { key: 'search_volume', direction: 'desc' } }
  const [sortConfig, setSortConfig] = useState({});
  const [activeDropdownKeywordId, setActiveDropdownKeywordId] = useState(null);
  const [dropdownGroupSelections, setDropdownGroupSelections] = useState({});
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');

  // Parent title edit state
  const [isEditingParentTitle, setIsEditingParentTitle] = useState(false);
  const [parentTitleText, setParentTitleText] = useState('');

  // Format search volume as abstract notation (e.g. 1.2K, 5M)
  const formatSearchVolume = (volume) => {
    if (!volume || volume === 0) return '0';
    if (volume >= 1000000) {
      const val = volume / 1000000;
      return `${val % 1 === 0 ? val : val.toFixed(1)}M`;
    }
    if (volume >= 1000) {
      const val = volume / 1000;
      return `${val % 1 === 0 ? val : val.toFixed(1)}K`;
    }
    return volume.toString();
  };

  const handleSort = (groupId, key) => {
    setSortConfig((prev) => {
      const current = prev[groupId];
      if (current && current.key === key) {
        return {
          ...prev,
          [groupId]: {
            key,
            direction: current.direction === 'desc' ? 'asc' : 'desc',
          },
        };
      } else {
        const defaultDir = key === 'competition' ? 'asc' : 'desc';
        return {
          ...prev,
          [groupId]: { key, direction: defaultDir },
        };
      }
    });
  };

  const getSortIcon = (groupId, key) => {
    const config = sortConfig[groupId];
    if (!config || config.key !== key) {
      return <span className="text-gray-300 ml-1">↕</span>;
    }
    return config.direction === 'desc' ? ' 🔽' : ' 🔼';
  };

  const getSortedKeywords = (keywords, groupId) => {
    const config = sortConfig[groupId];
    if (!config) return keywords;

    const { key, direction } = config;
    const sorted = [...keywords].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      if (key === 'search_volume') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else if (key === 'overall' || key === 'competition') {
        valA = valA !== undefined && valA !== null ? Number(valA) : -1;
        valB = valB !== undefined && valB !== null ? Number(valB) : -1;
      } else if (key === 'keyword') {
        valA = valA ? String(valA).toLowerCase() : '';
        valB = valB ? String(valB).toLowerCase() : '';
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch parent detail
      const parentResponse = await getGroupingsGroup(groupingsGroupId);
      setParentGroup(parentResponse.data.data);
      setParentTitleText(parentResponse.data.data?.title || '');

      // Fetch children sub-groups
      const childrenResponse = await getSegregatorGroups(groupingsGroupId);
      setGroupings(childrenResponse.data.data || []);
    } catch (err) {
      console.error('Error fetching groupings data:', err);
      setError('Failed to fetch data for this groupings session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupingsGroupId) {
      fetchData();
    }
  }, [groupingsGroupId]);

  const handleCreateGroup = async () => {
    const title = window.prompt('Enter a title for the new group:');
    if (!title || !title.trim()) return;

    try {
      setProcessing(true);
      setError(null);
      await createSegregatorGroup(title.trim(), groupingsGroupId);
      setSuccess(`Group "${title}" created successfully!`);

      // Refresh only sub-groups
      const childrenResponse = await getSegregatorGroups(groupingsGroupId);
      setGroupings(childrenResponse.data.data || []);
    } catch (err) {
      console.error('Error creating group:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to create group.',
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteGroup = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      setProcessing(true);
      setError(null);
      await deleteSegregatorGroup(id);
      setSuccess(
        `Group "${title}" deleted successfully. Keywords migrated if any existed.`,
      );

      // Refresh only sub-groups
      const childrenResponse = await getSegregatorGroups(groupingsGroupId);
      setGroupings(childrenResponse.data.data || []);
    } catch (err) {
      console.error('Error deleting group:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to delete group.',
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleStartEditGroup = (group) => {
    setEditingGroupId(group._id);
    setEditTitleText(group.title);
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditTitleText('');
  };

  const handleSaveGroupTitle = async (id) => {
    if (!editTitleText.trim()) return;
    try {
      setProcessing(true);
      setError(null);
      await updateSegregatorGroup(id, editTitleText.trim());
      setSuccess('Group title updated successfully!');
      setEditingGroupId(null);
      setEditTitleText('');

      // Refresh only sub-groups
      const childrenResponse = await getSegregatorGroups(groupingsGroupId);
      setGroupings(childrenResponse.data.data || []);
    } catch (err) {
      console.error('Error updating group title:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to update group title.',
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveParentTitle = async () => {
    if (
      !parentTitleText.trim() ||
      parentTitleText.trim() === parentGroup.title
    ) {
      setIsEditingParentTitle(false);
      return;
    }
    try {
      setProcessing(true);
      setError(null);
      await updateGroupingsGroup(groupingsGroupId, parentTitleText.trim());
      setSuccess('Session title updated successfully!');
      setIsEditingParentTitle(false);

      // Update local state
      setParentGroup((prev) => ({ ...prev, title: parentTitleText.trim() }));
    } catch (err) {
      console.error('Error updating session title:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to update session title.',
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleDropdown = (kw) => {
    const kwId = kw.id || kw._id;
    if (activeDropdownKeywordId === kwId) {
      setActiveDropdownKeywordId(null);
    } else {
      const initialSelections = {};
      groupings.forEach((group) => {
        const flat = group.keywords ? group.keywords.flat() : [];
        const exists = flat.some(
          (k) => k.id === kwId || k._id?.toString() === kwId,
        );
        initialSelections[group._id] = exists;
      });
      setDropdownGroupSelections(initialSelections);
      setActiveDropdownKeywordId(kwId);
    }
  };

  const handleCheckboxChange = (groupId, checked) => {
    setDropdownGroupSelections((prev) => ({
      ...prev,
      [groupId]: checked,
    }));
  };

  const handleSaveGroups = async (kw) => {
    try {
      setProcessing(true);
      setError(null);
      const targetGroupIds = Object.keys(dropdownGroupSelections).filter(
        (groupId) => dropdownGroupSelections[groupId],
      );
      const keywordToSend = {
        ...kw,
        id: kw.id || kw._id,
      };

      // Pass groupingsGroupId to enforce search limits and groupings constraints
      await updateSegregatorKeywordGroups(
        keywordToSend,
        targetGroupIds,
        groupingsGroupId,
      );
      setActiveDropdownKeywordId(null);
      setSuccess('Keyword groupings updated successfully.');

      // REFACTORED STATE: Refresh groupings locally instead of page reload!
      const childrenResponse = await getSegregatorGroups(groupingsGroupId);
      setGroupings(childrenResponse.data.data || []);
    } catch (err) {
      console.error('Error updating keyword groups:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to update keyword groups.',
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-500 mt-4 font-medium text-lg">
          Loading session groupings...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Navigation & Header */}
      <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => navigate('/segregator')}
            className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-indigo-600 rounded-xl transition-all border border-gray-100 font-bold shadow-sm flex items-center justify-center"
            title="Back to Sessions"
          >
            ⬅️ Back
          </button>

          <div className="flex-grow">
            {isEditingParentTitle ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={parentTitleText}
                  onChange={(e) => setParentTitleText(e.target.value)}
                  className="px-3 py-1.5 border border-indigo-300 rounded-xl text-2xl font-extrabold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveParentTitle();
                    if (e.key === 'Escape') {
                      setIsEditingParentTitle(false);
                      setParentTitleText(parentGroup?.title || '');
                    }
                  }}
                />
                <button
                  onClick={handleSaveParentTitle}
                  disabled={processing}
                  className="bg-green-100 hover:bg-green-200 text-green-700 p-2.5 rounded-xl font-bold transition-all flex items-center justify-center shadow-sm"
                  title="Save Title"
                >
                  💾
                </button>
                <button
                  onClick={() => {
                    setIsEditingParentTitle(false);
                    setParentTitleText(parentGroup?.title || '');
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-xl font-bold transition-all flex items-center justify-center shadow-sm"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
                  📂 {parentGroup?.title || 'Untitled Session'}
                </h1>
                <button
                  onClick={() => setIsEditingParentTitle(true)}
                  disabled={processing}
                  className="text-gray-400 hover:text-indigo-600 transition-colors p-2 rounded-xl hover:bg-indigo-50"
                  title="Edit Session Title"
                >
                  ✏️
                </button>
              </div>
            )}
            <p className="text-gray-400 text-sm mt-1">
              Session created on{' '}
              {new Date(parentGroup?.createdAt).toLocaleString()} •{' '}
              {groupings.length} subgroups
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateGroup}
          disabled={processing}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-indigo-100 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>➕</span> Add New Group
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-3 animate-fade-in">
          <span className="text-xl">🎉</span>
          <p className="font-semibold">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3 animate-fade-in">
          <span className="text-xl">⚠️</span>
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Main Grid / Layout */}
      {groupings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <span className="text-5xl block mb-4">🗂️</span>
          <h3 className="text-lg font-bold text-gray-700">
            No subgroups found in this session
          </h3>
          <p className="text-gray-400 mt-1 mb-6">
            Create a group to start categorizing your keywords!
          </p>
          <button
            onClick={handleCreateGroup}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md"
          >
            Create Subgroup
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groupings.map((group) => {
            const flatKeywords = group.keywords ? group.keywords.flat() : [];
            const sortedKeywords = getSortedKeywords(flatKeywords, group._id);

            const totalSearchVolume = flatKeywords.reduce(
              (sum, kw) => sum + (Number(kw.search_volume) || 0),
              0,
            );
            const avgOverall =
              flatKeywords.length > 0
                ? (
                    flatKeywords.reduce(
                      (sum, kw) => sum + (Number(kw.overall) || 0),
                      0,
                    ) / flatKeywords.length
                  ).toFixed(1)
                : 0;

            return (
              <div
                key={group._id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col w-full overflow-hidden"
              >
                {/* Header of Subgroup Card */}
                <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className="text-indigo-500 text-xl">📁</span>
                    {editingGroupId === group._id ? (
                      <div className="flex items-center gap-2 flex-grow">
                        <input
                          type="text"
                          value={editTitleText}
                          onChange={(e) => setEditTitleText(e.target.value)}
                          className="px-2.5 py-1 border border-indigo-300 rounded-lg text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter')
                              handleSaveGroupTitle(group._id);
                            if (e.key === 'Escape') handleCancelEditGroup();
                          }}
                        />
                        <button
                          onClick={() => handleSaveGroupTitle(group._id)}
                          disabled={processing}
                          className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center shadow-sm"
                          title="Save Title"
                        >
                          💾
                        </button>
                        <button
                          onClick={handleCancelEditGroup}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center shadow-sm"
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-800 tracking-tight">
                          {group.title}
                        </h3>
                        <button
                          onClick={() => handleStartEditGroup(group)}
                          disabled={processing}
                          className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50"
                          title="Edit Group Title"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteGroup(group._id, group.title)
                          }
                          disabled={processing}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                          title="Delete Group (Migrate Keywords)"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <span className="bg-indigo-50 text-indigo-700 text-sm font-semibold px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                      Total Vol:{' '}
                      <span className="font-bold">
                        {totalSearchVolume.toLocaleString()}
                      </span>
                    </span>
                    {flatKeywords.length > 0 && (
                      <span className="bg-blue-50 text-blue-700 text-sm font-semibold px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                        Avg Score:{' '}
                        <span className="font-bold">{avgOverall}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Subgroup Keywords Table */}
                <div className="p-0">
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {flatKeywords.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 italic">
                        No keywords in this subgroup
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12 text-center">
                              Add
                            </th>
                            <th
                              onClick={() => handleSort(group._id, 'keyword')}
                              className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                Keyword {getSortIcon(group._id, 'keyword')}
                              </div>
                            </th>
                            <th
                              onClick={() =>
                                handleSort(group._id, 'search_volume')
                              }
                              className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right cursor-pointer select-none hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center justify-end gap-1">
                                Search Vol{' '}
                                {getSortIcon(group._id, 'search_volume')}
                              </div>
                            </th>
                            <th
                              onClick={() =>
                                handleSort(group._id, 'competition')
                              }
                              className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right cursor-pointer select-none hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center justify-end gap-1">
                                Competition{' '}
                                {getSortIcon(group._id, 'competition')}
                              </div>
                            </th>
                            <th
                              onClick={() => handleSort(group._id, 'overall')}
                              className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right cursor-pointer select-none hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center justify-end gap-1">
                                Overall {getSortIcon(group._id, 'overall')}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {sortedKeywords.map((kw, i) => {
                            const kwId = kw.id || kw._id;
                            return (
                              <tr
                                key={i}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-4 py-3 text-center relative">
                                  <button
                                    onClick={() => handleToggleDropdown(kw)}
                                    className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center font-bold text-sm transition-colors mx-auto"
                                  >
                                    +
                                  </button>
                                  {activeDropdownKeywordId === kwId && (
                                    <div className="absolute left-4 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4 text-left animate-fade-in">
                                      <h4 className="text-sm font-bold text-gray-800 mb-3">
                                        Manage Subgroups
                                      </h4>
                                      <div className="max-h-48 overflow-y-auto space-y-2 mb-4 custom-scrollbar">
                                        {groupings.map((g) => (
                                          <label
                                            key={g._id}
                                            className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-50 p-1.5 rounded transition-colors"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={
                                                !!dropdownGroupSelections[g._id]
                                              }
                                              onChange={(e) =>
                                                handleCheckboxChange(
                                                  g._id,
                                                  e.target.checked,
                                                )
                                              }
                                              className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span
                                              className="truncate"
                                              title={g.title}
                                            >
                                              {g.title}
                                            </span>
                                          </label>
                                        ))}
                                      </div>
                                      <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                                        <button
                                          onClick={() =>
                                            setActiveDropdownKeywordId(null)
                                          }
                                          className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => handleSaveGroups(kw)}
                                          disabled={processing}
                                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-3">
                                  <span
                                    className="text-gray-800 font-medium"
                                    title={kw.keyword}
                                  >
                                    {kw.keyword}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <span
                                    className="text-sm text-gray-600 font-medium"
                                    title={
                                      kw.search_volume?.toLocaleString() || '0'
                                    }
                                  >
                                    {formatSearchVolume(kw.search_volume)}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  {kw.competition !== undefined &&
                                  kw.competition !== null ? (
                                    <span
                                      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-md ${
                                        kw.competition <= 30
                                          ? 'bg-green-100 text-green-700'
                                          : kw.competition <= 60
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {kw.competition}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                  {kw.overall !== undefined ? (
                                    <span
                                      className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md ${
                                        kw.overall >= 70
                                          ? 'bg-green-100 text-green-700'
                                          : kw.overall >= 60
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                      }`}
                                    >
                                      {kw.overall}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Footer of Subgroup Card */}
                <div className="bg-gray-50 text-xs text-gray-400 border-t border-gray-200 p-3 px-6 flex justify-between items-center">
                  <span className="font-semibold text-gray-500">
                    {flatKeywords.length} Keywords
                  </span>
                  <span>
                    Created {new Date(group.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupingsGroupDetail;
