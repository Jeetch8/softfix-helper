import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getGroupingsGroups,
  uploadSegregatorFiles,
  updateGroupingsGroup,
  deleteGroupingsGroup,
  flushGroupingsGroups
} from '../api/client';

const KeywordsSegregator = () => {
  const navigate = useNavigate();

  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Editing session title inline state
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getGroupingsGroups();
      setSessions(response.data.data || []);
      console.log('Groupings sessions fetched:', response.data.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load groupings sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
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
    const finalTitle = sessionTitle.trim() || 'New Keywords Session';

    try {
      const response = await uploadSegregatorFiles(filesToUpload, finalTitle);
      setSuccess(response.data.message || 'Files uploaded and processed successfully! New session created.');
      
      // Reset upload states
      setFile1(null);
      setFile2(null);
      setSessionTitle('');
      
      const file1Input = document.getElementById('file1-input');
      const file2Input = document.getElementById('file2-input');
      if (file1Input) file1Input.value = '';
      if (file2Input) file2Input.value = '';

      // Refresh list
      await fetchSessions();
    } catch (err) {
      console.error('Processing failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to process files. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteSession = async (e, id, title) => {
    e.stopPropagation(); // Prevent card click navigation trigger
    if (!window.confirm(`Are you sure you want to delete session "${title}" and all its subgroups? This cannot be undone.`)) return;

    try {
      setProcessing(true);
      setError(null);
      await deleteGroupingsGroup(id);
      setSuccess(`Session "${title}" deleted successfully.`);
      await fetchSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete session.');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartEditSession = (e, session) => {
    e.stopPropagation(); // Prevent card click navigation trigger
    setEditingSessionId(session._id);
    setEditTitleText(session.title);
  };

  const handleCancelEditSession = (e) => {
    if (e) e.stopPropagation();
    setEditingSessionId(null);
    setEditTitleText('');
  };

  const handleSaveSessionTitle = async (e, id) => {
    e.stopPropagation(); // Prevent card click navigation trigger
    if (!editTitleText.trim()) return;

    try {
      setProcessing(true);
      setError(null);
      await updateGroupingsGroup(id, editTitleText.trim());
      setSuccess('Session title updated successfully!');
      setEditingSessionId(null);
      setEditTitleText('');
      await fetchSessions();
    } catch (err) {
      console.error('Error updating session title:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update session title.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFlushSessions = async () => {
    if (!window.confirm('Are you sure you want to delete ALL groupings sessions? This will permanently delete all data.')) return;

    try {
      setProcessing(true);
      setError(null);
      await flushGroupingsGroups();
      setSuccess('All groupings sessions have been successfully deleted.');
      await fetchSessions();
    } catch (err) {
      console.error('Error flushing sessions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to flush groupings sessions.');
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
            Upload SEO keywords lists, deduplicate them, filter low volume, and automatically create AI groupings.
          </p>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>⚡</span> Create New Grouping Session
        </h2>

        {/* Text Input for Group Title */}
        <div className="mb-6 max-w-xl">
          <label htmlFor="session-title" className="block text-sm font-bold text-gray-700 mb-2">
            Session Title
          </label>
          <input
            id="session-title"
            type="text"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="e.g., Softfix SEO Keyword Expansion - June 2026"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white focus:bg-white transition-all text-gray-800 font-medium placeholder-gray-400"
          />
        </div>

        {/* Grid of File Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Upload Card 1 */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-150 flex flex-col justify-between text-center relative">
            <div>
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                📄
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Keywords File 1</h3>
              <p className="text-gray-400 text-sm mb-4">Select first file for segregation.</p>
              
              <label className="cursor-pointer bg-white hover:bg-gray-100 border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 w-full flex flex-col items-center transition-all shadow-sm">
                <span className="text-gray-600 text-sm font-medium">Browse File</span>
                <span className="text-xs text-gray-400 mt-1">Excel or CSV</span>
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
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-between w-full text-left text-sm">
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
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-150 flex flex-col justify-between text-center relative">
            <div>
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                📄
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Keywords File 2</h3>
              <p className="text-gray-400 text-sm mb-4">Select second file for segregation.</p>
              
              <label className="cursor-pointer bg-white hover:bg-gray-100 border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 w-full flex flex-col items-center transition-all shadow-sm">
                <span className="text-gray-600 text-sm font-medium">Browse File</span>
                <span className="text-xs text-gray-400 mt-1">Excel or CSV</span>
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
              <div className="mt-4 p-3 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-between w-full text-left text-sm">
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

        {/* Process Button */}
        <div className="flex justify-end">
          <button
            onClick={handleProcess}
            disabled={(!file1 && !file2) || processing}
            className={`px-8 py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center gap-3 shadow-md ${
              (!file1 && !file2) || processing
                ? 'bg-gray-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:shadow-indigo-100 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {processing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing (Filtering & Segregating)...
              </>
            ) : (
              <>
                <span>⚡</span> Run Segregator
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      {success && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center gap-3 animate-fade-in">
          <span className="text-xl">🎉</span>
          <p className="font-semibold">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3 animate-fade-in">
          <span className="text-xl">⚠️</span>
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Sessions Grid */}
      <div className="relative pb-24">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>📋</span> Keyword Groupings Sessions ({sessions.length})
        </h2>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading groupings sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-150 p-16 text-center shadow-sm">
            <span className="text-5xl block mb-4">📁</span>
            <h3 className="text-xl font-bold text-gray-700">No sessions found</h3>
            <p className="text-gray-400 mt-2 max-w-sm mx-auto">Define a title, upload your Excel or CSV keywords lists, and hit process to create groupings!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div
                key={session._id}
                onClick={() => navigate(`/segregator/groups/${session._id}`)}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between h-56 relative overflow-hidden group shadow-sm"
              >
                {/* Visual Accent Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity"></div>

                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-3xl">📂</span>
                    
                    {/* Actions Menu */}
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => handleStartEditSession(e, session)}
                        disabled={processing}
                        className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                        title="Edit Session Title"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(e, session._id, session.title)}
                        disabled={processing}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Session"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Inline Edit Title or Standard Render */}
                  {editingSessionId === session._id ? (
                    <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        className="px-2 py-1 text-sm border border-indigo-300 rounded-lg font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSessionTitle(e, session._id);
                          if (e.key === 'Escape') handleCancelEditSession(e);
                        }}
                      />
                      <button
                        onClick={(e) => handleSaveSessionTitle(e, session._id)}
                        className="bg-green-50 hover:bg-green-100 text-green-700 p-1.5 rounded-md text-xs font-bold transition-colors"
                        title="Save Title"
                      >
                        💾
                      </button>
                      <button
                        onClick={(e) => handleCancelEditSession(e)}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-700 p-1.5 rounded-md text-xs font-bold transition-colors"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                      {session.title}
                    </h3>
                  )}
                </div>

                <div>
                  {/* Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-100">
                      📁 {session.numberOfGroups || 0} groups
                    </span>
                  </div>

                  {/* Timestamps */}
                  <div className="text-2xs text-gray-400 space-y-0.5 border-t border-gray-100 pt-3">
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span className="font-medium text-gray-500">{new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Edit:</span>
                      <span className="font-medium text-gray-500">{new Date(session.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flush Button pinned bottom right */}
        {sessions.length > 0 && (
          <div className="absolute -bottom-4 right-0 mt-8">
             <button
              onClick={handleFlushSessions}
              disabled={processing}
              className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 hover:border-transparent px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <span>🗑️</span> Flush All Sessions
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeywordsSegregator;
