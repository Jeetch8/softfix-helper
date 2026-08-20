import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getGroupingsGroups,
  createGroupingsGroupEmpty,
  uploadSegregatorFiles,
  updateGroupingsGroup,
  deleteGroupingsGroup,
  flushGroupingsGroups
} from '../api/client';

const KeywordsSegregator = () => {
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [sessionTitle, setSessionTitle] = useState('');
  const [emptySessionTitle, setEmptySessionTitle] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [creatingEmpty, setCreatingEmpty] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [customGroupsList, setCustomGroupsList] = useState('');


  // Editing session title inline state
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [editingSessionDescId, setEditingSessionDescId] = useState(null);
  const [editSessionDescText, setEditSessionDescText] = useState('');

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

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      setError(null);
      setSuccess(null);
    }
    // Reset input value to allow selecting the same file again if removed
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleCreateEmptySession = async () => {
    if (!emptySessionTitle.trim()) {
      setError('Please enter a session title.');
      return;
    }

    setCreatingEmpty(true);
    setError(null);
    setSuccess(null);

    try {
      await createGroupingsGroupEmpty(emptySessionTitle.trim());
      setSuccess('Empty session created successfully!');
      setEmptySessionTitle('');
      await fetchSessions();
    } catch (err) {
      console.error('Error creating empty session:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create empty session.');
    } finally {
      setCreatingEmpty(false);
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setError(null);
    setSuccess(null);

    const filesToUpload = files;
    const finalTitle = sessionTitle.trim() || 'New Keywords Session';

    try {
      const response = await uploadSegregatorFiles(filesToUpload, finalTitle, customGroupsList);
      setSuccess(response.data.message || 'Files uploaded and processed successfully! New session created.');
      
      // Reset upload states
      setFiles([]);
      setSessionTitle('');
      setCustomGroupsList('');

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

  const handleStartEditSessionDesc = (e, session) => {
    e.stopPropagation();
    setEditingSessionDescId(session._id);
    setEditSessionDescText(session.description || '');
  };

  const handleCancelEditSessionDesc = (e) => {
    if (e) e.stopPropagation();
    setEditingSessionDescId(null);
    setEditSessionDescText('');
  };

  const handleSaveSessionDesc = async (e, id) => {
    e.stopPropagation();
    try {
      setProcessing(true);
      setError(null);
      await updateGroupingsGroup(id, undefined, editSessionDescText.trim());
      setSuccess('Session description updated successfully!');
      setEditingSessionDescId(null);
      setEditSessionDescText('');
      await fetchSessions();
    } catch (err) {
      console.error('Error updating session description:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update session description.');
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
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-8 flex justify-between items-center bg-white p-3.5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-4xl">🗂️</span> Keyword Segregator
          </h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-xs sm:text-lg">
            Upload SEO keywords lists, deduplicate them, filter low volume, and automatically create AI groupings.
          </p>
        </div>
      </div>

      {/* Create Empty Grouping Session Card */}
      <div className="bg-white p-3.5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 mb-4 sm:mb-12">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-6 flex items-center gap-2">
          <span>📁</span> Create Empty Groupings Session
        </h2>

        <div className="mb-3 sm:mb-6 max-w-xl">
          <label htmlFor="empty-session-title" className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2">
            Session Title
          </label>
          <input
            id="empty-session-title"
            type="text"
            value={emptySessionTitle}
            onChange={(e) => setEmptySessionTitle(e.target.value)}
            placeholder="e.g., Softfix SEO Keyword Expansion - June 2026"
            className="w-full px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-base rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white focus:bg-white transition-all text-gray-800 font-medium placeholder-gray-400 mb-2 sm:mb-4"
          />
        </div>

        <div className="flex justify-start">
          <button
            onClick={handleCreateEmptySession}
            disabled={!emptySessionTitle.trim() || creatingEmpty}
            className={`w-full sm:w-auto justify-center px-4 py-2.5 sm:px-8 sm:py-4 text-xs sm:text-base rounded-xl font-bold text-white transition-all duration-300 flex items-center gap-2 sm:gap-3 shadow-md ${
              !emptySessionTitle.trim() || creatingEmpty
                ? 'bg-gray-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 hover:shadow-teal-100 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {creatingEmpty ? (
              <>
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <span>➕</span> Create Empty Session
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="bg-white p-3.5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 mb-4 sm:mb-12">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-6 flex items-center gap-2">
          <span>⚡</span> Upload and Generate Groupings Session
        </h2>

        {/* Text Input for Group Title */}
        <div className="mb-3 sm:mb-6 max-w-xl">
          <label htmlFor="session-title" className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2">
            Session Title
          </label>
          <input
            id="session-title"
            type="text"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="e.g., Softfix SEO Keyword Expansion - June 2026"
            className="w-full px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-base rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white focus:bg-white transition-all text-gray-800 font-medium placeholder-gray-400 mb-2 sm:mb-4"
          />

          <label htmlFor="custom-groups" className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2">
            Custom Groups (Optional)
          </label>
          <textarea
            id="custom-groups"
            value={customGroupsList}
            onChange={(e) => setCustomGroupsList(e.target.value)}
            placeholder="e.g., VPNs | Best VPNs for streaming&#10;Antivirus | Top Antivirus software"
            className="w-full px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-base rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white focus:bg-white transition-all text-gray-800 font-medium placeholder-gray-400 min-h-[80px] sm:min-h-[100px]"
          ></textarea>
        </div>

        {/* File Upload Box */}
        <div className="mb-3 sm:mb-6">
          <div className="bg-gray-50 p-3.5 sm:p-6 rounded-xl border border-gray-150 flex flex-col justify-between text-center relative">
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg sm:text-xl mx-auto mb-2 sm:mb-3">
                📄
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-0.5 sm:mb-1">Upload Keywords Files</h3>
              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">Select multiple files for segregation.</p>
              
              <label className="cursor-pointer bg-white hover:bg-gray-100 border-2 border-dashed border-gray-200 rounded-xl px-3 py-4 sm:px-4 sm:py-6 w-full flex flex-col items-center transition-all shadow-sm">
                <span className="text-gray-600 text-xs sm:text-sm font-medium">Browse Files</span>
                <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Excel or CSV</span>
                <input 
                  id="files-input"
                  type="file" 
                  multiple
                  className="hidden" 
                  accept=".xlsx,.xls,.csv,text/csv"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
          
          {/* List of selected files */}
          {files.length > 0 && (
            <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {files.map((file, index) => (
                <div key={index} className="p-2 sm:p-3 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-between w-full text-left text-xs sm:text-sm border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                    <span>✅</span>
                    <span className="truncate font-medium">{file.name}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Process Button */}
        <div className="flex justify-end">
          <button
            onClick={handleProcess}
            disabled={files.length === 0 || processing}
            className={`w-full sm:w-auto justify-center px-4 py-2.5 sm:px-8 sm:py-4 text-xs sm:text-base rounded-xl font-bold text-white transition-all duration-300 flex items-center gap-2 sm:gap-3 shadow-md ${
              files.length === 0 || processing
                ? 'bg-gray-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:shadow-indigo-100 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {processing ? (
              <>
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
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
        <div className="mb-4 sm:mb-8 p-3 sm:p-4 bg-green-50 border border-green-200 text-green-800 text-xs sm:text-base rounded-xl flex items-center gap-2 sm:gap-3 animate-fade-in">
          <span className="text-lg sm:text-xl">🎉</span>
          <p className="font-semibold">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 sm:mb-8 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-800 text-xs sm:text-base rounded-xl flex items-center gap-2 sm:gap-3 animate-fade-in">
          <span className="text-lg sm:text-xl">⚠️</span>
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Sessions Grid */}
      <div className="relative pb-16 sm:pb-24">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-6 flex items-center gap-2">
          <span>📋</span> Keyword Groupings Sessions ({sessions.length})
        </h2>

        {loading ? (
          <div className="text-center py-10 sm:py-16">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 text-xs sm:text-sm mt-3 sm:mt-4">Loading groupings sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-150 p-8 sm:p-16 text-center shadow-sm">
            <span className="text-3xl sm:text-5xl block mb-2 sm:mb-4">📁</span>
            <h3 className="text-base sm:text-xl font-bold text-gray-700">No sessions found</h3>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 sm:mt-2 max-w-sm mx-auto">Define a title, upload your Excel or CSV keywords lists, and hit process to create groupings!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {sessions.map((session) => (
              <div
                key={session._id}
                onClick={() => navigate(`/segregator/groups/${session._id}`)}
                className="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[11rem] sm:min-h-[14rem] h-auto pb-3.5 sm:pb-6 relative overflow-hidden group shadow-sm"
              >
                {/* Visual Accent Bar */}
                <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity"></div>

                <div>
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <span className="text-2xl sm:text-3xl">📂</span>
                    
                    {/* Actions Menu */}
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => handleStartEditSession(e, session)}
                        disabled={processing}
                        className="text-gray-400 hover:text-indigo-600 p-1 sm:p-1.5 rounded-lg hover:bg-indigo-50 transition-colors text-xs sm:text-sm"
                        title="Edit Session Title"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(e, session._id, session.title)}
                        disabled={processing}
                        className="text-gray-400 hover:text-red-500 p-1 sm:p-1.5 rounded-lg hover:bg-red-50 transition-colors text-xs sm:text-sm"
                        title="Delete Session"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Inline Edit Title or Standard Render */}
                  {editingSessionId === session._id ? (
                    <div className="flex items-center gap-1.5 mt-1 sm:mt-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        className="px-2 py-1 text-xs sm:text-sm border border-indigo-300 rounded-lg font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSessionTitle(e, session._id);
                          if (e.key === 'Escape') handleCancelEditSession(e);
                        }}
                      />
                      <button
                        onClick={(e) => handleSaveSessionTitle(e, session._id)}
                        className="bg-green-50 hover:bg-green-100 text-green-700 p-1 sm:p-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-colors"
                        title="Save Title"
                      >
                        💾
                      </button>
                      <button
                        onClick={(e) => handleCancelEditSession(e)}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-700 p-1 sm:p-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-colors"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                      {session.title}
                    </h3>
                  )}

                  {/* Session Description */}
                  {editingSessionDescId === session._id ? (
                    <div className="flex items-center gap-1 mt-1 sm:mt-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editSessionDescText}
                        onChange={(e) => setEditSessionDescText(e.target.value)}
                        placeholder="Add description..."
                        className="px-2 py-0.5 sm:py-1 text-xs border border-indigo-300 rounded-lg text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSessionDesc(e, session._id);
                          if (e.key === 'Escape') handleCancelEditSessionDesc(e);
                        }}
                      />
                      <button
                        onClick={(e) => handleSaveSessionDesc(e, session._id)}
                        className="bg-green-50 hover:bg-green-100 text-green-700 p-1 rounded-md text-[10px] font-bold transition-colors"
                        title="Save Description"
                      >
                        💾
                      </button>
                      <button
                        onClick={(e) => handleCancelEditSessionDesc(e)}
                        className="bg-gray-50 hover:bg-gray-100 text-gray-700 p-1 rounded-md text-[10px] font-bold transition-colors"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5 min-h-[1.25rem] sm:min-h-[1.5rem]" onClick={(e) => e.stopPropagation()}>
                      <p className={`text-[11px] sm:text-xs line-clamp-2 font-medium ${session.description ? 'text-gray-500' : 'text-gray-400 italic'}`}>
                        {session.description || 'No description'}
                      </p>
                      <button
                        onClick={(e) => handleStartEditSessionDesc(e, session)}
                        disabled={processing}
                        className="text-gray-400 hover:text-indigo-600 p-0.5 rounded transition-colors text-xs"
                        title="Edit Description"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  {/* Badge */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 mt-2">
                    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-indigo-100">
                      📁 {session.numberOfGroups || 0} groups
                    </span>
                  </div>

                  {/* Timestamps */}
                  <div className="text-[10px] sm:text-2xs text-gray-400 space-y-0.5 border-t border-gray-100 pt-2 sm:pt-3">
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

        {/* Flush Button */}
        {sessions.length > 0 && (
          <div className="mt-4 sm:mt-0 sm:absolute sm:-bottom-4 sm:right-0 flex justify-end">
             <button
              onClick={handleFlushSessions}
              disabled={processing}
              className="w-full sm:w-auto justify-center bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-100 hover:border-transparent px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 sm:gap-2 disabled:opacity-50"
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
