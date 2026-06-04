import React, { useState, useEffect } from 'react';
import { getSegregatorGroups, uploadSegregatorFiles } from '../api/client';

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

      {/* Grid of File Uploads */}
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

      {/* Divider */}
      <hr className="my-12 border-gray-200" />

      {/* Results / Existing Groupings Display */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>📋</span> Keyword Groupings ({groupings.length})
        </h2>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {groupings.map((group) => {
              const flatKeywords = group.keywords ? group.keywords.flat() : [];
              return (
                <div key={group._id} className="flex flex-col">
                  {/* Group Title - Separate on Top */}
                  <div className="flex justify-between items-end mb-2 px-1">
                    <h3 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                      <span className="text-indigo-500 text-lg">📁</span> {group.title}
                    </h3>
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-100">
                      Vol: {group.total_average_volume?.toLocaleString() || 0}
                    </span>
                  </div>
                  
                  {/* Card Container below Title */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between flex-1">
                    <div className="max-h-72 overflow-y-auto mb-4 custom-scrollbar pr-1">
                      {flatKeywords.length === 0 ? (
                        <p className="text-gray-400 text-sm italic">No keywords in this group</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {flatKeywords.map((kw, i) => (
                            <div key={i} className="flex justify-between items-center text-sm bg-gray-50 hover:bg-gray-100 p-3 rounded-xl transition-all border border-transparent hover:border-gray-200">
                              <span className="text-gray-700 font-semibold truncate pr-3" title={kw.keyword}>
                                {kw.keyword}
                              </span>
                              <div className="flex gap-2 shrink-0 items-center">
                                <span className="text-xs text-gray-500 font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                                  SV: {kw.search_volume?.toLocaleString() || 0}
                                </span>
                                {kw.overall !== undefined && (
                                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                                    kw.overall >= 70
                                      ? 'bg-green-100 text-green-700'
                                      : kw.overall >= 60
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {kw.overall}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-400 border-t border-gray-100 pt-3 flex justify-between items-center">
                      <span className="font-medium">{flatKeywords.length} Keywords</span>
                      <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KeywordsSegregator;
