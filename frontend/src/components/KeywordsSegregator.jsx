import React, { useState, useEffect } from 'react';
import { getSegregatorGroups, uploadSegregatorFiles, createSegregatorGroup, deleteSegregatorGroup, flushSegregatorGroups } from '../api/client';

const KeywordsSegregator = () => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [groupings, setGroupings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
                              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Keyword</th>
                              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Search Vol</th>
                              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Overall</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {flatKeywords.map((kw, i) => (
                              <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-3">
                                  <span className="text-gray-800 font-medium" title={kw.keyword}>
                                    {kw.keyword}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <span className="text-sm text-gray-600 font-medium">
                                    {kw.search_volume?.toLocaleString() || 0}
                                  </span>
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
                            ))}
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
