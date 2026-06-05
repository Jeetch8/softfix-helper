import React, { useState, useEffect } from 'react';
import { getSegregatorGroups, uploadSegregatorFiles, createSegregatorGroup, deleteSegregatorGroup, flushSegregatorGroups, updateSegregatorKeywordGroups } from '../api/client';

const KeywordsSegregator = () => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [groupings, setGroupings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sortConfig, setSortConfig] = useState({}); // { [groupId]: { key: 'search_volume', direction: 'desc' } }
  const [activeDropdownKeywordId, setActiveDropdownKeywordId] = useState(null);
  const [dropdownGroupSelections, setDropdownGroupSelections] = useState({});

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
    setSortConfig(prev => {
      const current = prev[groupId];
      if (current && current.key === key) {
        // Toggle direction
        return {
          ...prev,
          [groupId]: {
            key,
            direction: current.direction === 'desc' ? 'asc' : 'desc'
          }
        };
      } else {
        // Default direction: desc for search_volume and overall, asc for competition (low competition is better!)
        const defaultDir = (key === 'competition') ? 'asc' : 'desc';
        return {
          ...prev,
          [groupId]: { key, direction: defaultDir }
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

  const fetchGroups = async () => {
    try {
      const response = await getSegregatorGroups();
      setGroupings(response.data.data || []);
      console.log('Groupings fetched:', response.data.data);
    } catch (error) {
      console.error('Error fetching groupings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleFileChange = (e, setFile) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleClearFile = (setFile, inputId) => {
    setFile(null);
    const element = document.getElementById(inputId);
    if (element) element.value = '';
  };

  const handleProcess = async () => {
    if (!file1 && !file2) return;

    setProcessing(true);
    setError(null);
    setSuccess(null);

    const filesToUpload = [file1, file2].filter(Boolean);

    try {
      const response = await uploadSegregatorFiles(filesToUpload);
      setSuccess(response.data.message || 'Files uploaded and processed successfully! New keyword groupings created.');
      setFile1(null);
      setFile2(null);
      
      // Reset input element values
      const file1Input = document.getElementById('file1-input');
      const file2Input = document.getElementById('file2-input');
      if (file1Input) file1Input.value = '';
      if (file2Input) file2Input.value = '';

      // Refresh groupings
      await fetchGroups();
    } catch (err) {
      console.error('Processing failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to process files. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateGroup = async () => {
    const title = window.prompt("Enter a title for the new group:");
    if (!title) return;
    
    try {
      setProcessing(true);
      await createSegregatorGroup(title);
      setSuccess(`Group "${title}" created successfully!`);
      await fetchGroups();
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create group.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteGroup = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      setProcessing(true);
      await deleteSegregatorGroup(id);
      setSuccess(`Group "${title}" deleted successfully. Keywords migrated if any existed.`);
      await fetchGroups();
    } catch (err) {
      console.error('Error deleting group:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete group.');
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
      groupings.forEach(group => {
        const flat = group.keywords ? group.keywords.flat() : [];
        const exists = flat.some(k => k.id === kwId || k._id?.toString() === kwId);
        initialSelections[group._id] = exists;
      });
      setDropdownGroupSelections(initialSelections);
      setActiveDropdownKeywordId(kwId);
    }
  };

  const handleCheckboxChange = (groupId, checked) => {
    setDropdownGroupSelections(prev => ({
      ...prev,
      [groupId]: checked
    }));
  };

  const handleSaveGroups = async (kw) => {
    try {
      setProcessing(true);
      setError(null);
      const targetGroupIds = Object.keys(dropdownGroupSelections).filter(
        groupId => dropdownGroupSelections[groupId]
      );
      const keywordToSend = {
        ...kw,
        id: kw.id || kw._id
      };
      await updateSegregatorKeywordGroups(keywordToSend, targetGroupIds);
      setActiveDropdownKeywordId(null);
      window.location.reload();
    } catch (err) {
      console.error('Error updating keyword groups:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update keyword groups.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFlush = async () => {
    if (!window.confirm('Are you sure you want to delete ALL groupings? This cannot be undone.')) return;

    try {
      setProcessing(true);
      await flushSegregatorGroups();
      setSuccess('All groupings have been deleted successfully.');
      await fetchGroups();
    } catch (err) {
      console.error('Error flushing groups:', err);
      setError(err.response?.data?.message || err.message || 'Failed to flush groups.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <span className="text-4xl">🗂️</span> Keyword Segregator
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Upload files to filter, remove duplicates, and automatically segregate keywords using AI.
          </p>
        </div>
      </div>

      {/* Grid of File Uploads - Only show if NO groupings exist */}
      {groupings.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Card 1 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between text-center transition-all hover:shadow-md relative">
            <div>
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                📄
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload File 1</h2>
              <p className="text-gray-500 mb-6">Select the first file for segregation.</p>
              
              <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl px-6 py-8 w-full flex flex-col items-center transition-colors">
                <span className="text-gray-600 font-medium">Click to browse or drag & drop</span>
                <span className="text-sm text-gray-400 mt-1">CSV, TXT, or Excel</span>
                <input 
                  id="file1-input"
                  type="file" 
                  className="hidden" 
                  accept=".xlsx,.xls,.csv,text/csv"
                  onChange={(e) => handleFileChange(e, setFile1)}
                />
              </label>
            </div>
            
            {file1 && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-between w-full text-left">
                <div className="flex items-center gap-2 truncate">
                  <span>✅</span>
                  <span className="truncate font-medium">{file1.name}</span>
                </div>
                <button 
                  onClick={() => handleClearFile(setFile1, 'file1-input')}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Upload Card 2 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between text-center transition-all hover:shadow-md relative">
            <div>
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                📄
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload File 2</h2>
              <p className="text-gray-500 mb-6">Select the second file for segregation.</p>
              
              <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl px-6 py-8 w-full flex flex-col items-center transition-colors">
                <span className="text-gray-600 font-medium">Click to browse or drag & drop</span>
                <span className="text-sm text-gray-400 mt-1">CSV, TXT, or Excel</span>
                <input 
                  id="file2-input"
                  type="file" 
                  className="hidden" 
                  accept=".xlsx,.xls,.csv,text/csv"
                  onChange={(e) => handleFileChange(e, setFile2)}
                />
              </label>
            </div>
            
            {file2 && (
              <div className="mt-4 p-3 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-between w-full text-left">
                <div className="flex items-center gap-2 truncate">
                  <span>✅</span>
                  <span className="truncate font-medium">{file2.name}</span>
                </div>
                <button 
                  onClick={() => handleClearFile(setFile2, 'file2-input')}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications Section */}
      {success && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-3">
          <span className="text-xl">🎉</span>
          <p className="font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Actions */}
      {groupings.length === 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleProcess}
            disabled={(!file1 && !file2) || processing}
            className={`px-8 py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center gap-3 shadow-lg ${
              (!file1 && !file2) || processing
                ? 'bg-gray-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {processing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Files (Removing Duplicates, Filtering Low Volume & Segregating)...
              </>
            ) : (
              <>
                <span>⚡</span> Process Uploaded
              </>
            )}
          </button>
        </div>
      )}

      {/* Divider */}
      <hr className="my-12 border-gray-200" />

      {/* Results / Existing Groupings Display */}
      <div className="mt-8 relative pb-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>📋</span> Keyword Groupings ({groupings.length})
          </h2>
          {groupings.length > 0 && (
            <button
              onClick={handleCreateGroup}
              disabled={processing}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              <span>➕</span> Create group
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading groupings...</p>
          </div>
        ) : groupings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <span className="text-5xl block mb-4">📂</span>
            <h3 className="text-lg font-semibold text-gray-700">No groupings found</h3>
            <p className="text-gray-400 mt-1">Upload and process files to generate groups with AI!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupings.map((group) => {
              const flatKeywords = group.keywords ? group.keywords.flat() : [];
              const sortedKeywords = getSortedKeywords(flatKeywords, group._id);
              
              // Calculate derived values directly from frontend flatKeywords array
              const totalSearchVolume = flatKeywords.reduce((sum, kw) => sum + (Number(kw.search_volume) || 0), 0);
              const avgOverall = flatKeywords.length > 0 
                ? (flatKeywords.reduce((sum, kw) => sum + (Number(kw.overall) || 0), 0) / flatKeywords.length).toFixed(1)
                : 0;

              return (
                <div key={group._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col w-full overflow-hidden">
                  
                  {/* Group Title Area - Inside Card */}
                  <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                        <span className="text-indigo-500 text-xl">📁</span> {group.title}
                      </h3>
                      <button 
                        onClick={() => handleDeleteGroup(group._id, group.title)}
                        disabled={processing}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
                        title="Delete Group"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <span className="bg-indigo-50 text-indigo-700 text-sm font-semibold px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                        Total Vol: <span className="font-bold">{totalSearchVolume.toLocaleString()}</span>
                      </span>
                      {flatKeywords.length > 0 && (
                        <span className="bg-blue-50 text-blue-700 text-sm font-semibold px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1">
                          Avg Score: <span className="font-bold">{avgOverall}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Content Area */}
                  <div className="p-0">
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {flatKeywords.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 italic">
                          No keywords in this group
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
                                onClick={() => handleSort(group._id, 'search_volume')}
                                className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right cursor-pointer select-none hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Search Vol {getSortIcon(group._id, 'search_volume')}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleSort(group._id, 'competition')}
                                className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right cursor-pointer select-none hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Competition {getSortIcon(group._id, 'competition')}
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
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-center relative">
                                    <button 
                                      onClick={() => handleToggleDropdown(kw)}
                                      className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center font-bold text-sm transition-colors mx-auto"
                                    >
                                      +
                                    </button>
                                    {activeDropdownKeywordId === kwId && (
                                      <div className="absolute left-4 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4 text-left">
                                        <h4 className="text-sm font-bold text-gray-800 mb-3">Manage Groups</h4>
                                        <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                                          {groupings.map(g => (
                                            <label key={g._id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-50 p-1.5 rounded transition-colors">
                                              <input 
                                                type="checkbox"
                                                checked={!!dropdownGroupSelections[g._id]}
                                                onChange={(e) => handleCheckboxChange(g._id, e.target.checked)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                              />
                                              <span className="truncate" title={g.title}>{g.title}</span>
                                            </label>
                                          ))}
                                        </div>
                                        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                                          <button 
                                            onClick={() => setActiveDropdownKeywordId(null)}
                                            className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1"
                                          >
                                            Cancel
                                          </button>
                                          <button 
                                            onClick={() => handleSaveGroups(kw)}
                                            disabled={processing}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3">
                                    <span className="text-gray-800 font-medium" title={kw.keyword}>
                                      {kw.keyword}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <span className="text-sm text-gray-600 font-medium" title={kw.search_volume?.toLocaleString() || '0'}>
                                      {formatSearchVolume(kw.search_volume)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    {kw.competition !== undefined && kw.competition !== null ? (
                                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-md ${
                                        kw.competition <= 30
                                          ? 'bg-green-100 text-green-700'
                                          : kw.competition <= 60
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {kw.competition}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    {kw.overall !== undefined ? (
                                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md ${
                                        kw.overall >= 70
                                          ? 'bg-green-100 text-green-700'
                                          : kw.overall >= 60
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                      }`}>
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
                  
                  {/* Card Footer */}
                  <div className="bg-gray-50 text-xs text-gray-500 border-t border-gray-200 p-3 px-6 flex justify-between items-center">
                    <span className="font-medium">{flatKeywords.length} Keywords</span>
                    <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Flush Button pinned to bottom right */}
        {groupings.length > 0 && (
          <div className="absolute -bottom-8 right-0 mt-8">
             <button
              onClick={handleFlush}
              disabled={processing}
              className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 hover:border-transparent px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <span>🗑️</span> Flush All Groupings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeywordsSegregator;
