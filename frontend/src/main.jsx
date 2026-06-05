import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import TopicsList from './components/TopicsList';
import TopicPage from './components/TopicPage';
import KeywordsList from './components/KeywordsList';
import KeywordsSegregator from './components/KeywordsSegregator';
import GroupingsGroupDetail from './components/GroupingsGroupDetail';

// Main App Component with Navigation
function App() {
  const currentPath = window.location.pathname;
  const initialTab = currentPath.includes('/segregator') ? 'segregator'
    : currentPath.includes('/keywords') ? 'keywords'
      : 'topics';
  const [activeTab, setActiveTab] = React.useState(initialTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Tabs */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            <button
              onClick={() => {
                setActiveTab('topics');
                window.location.href = '/';
              }}
              className={`px-6 py-3 rounded-t-lg font-semibold transition-all ${activeTab === 'topics'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              🎬 Topics
            </button>
            <button
              onClick={() => {
                setActiveTab('keywords');
                window.location.href = '/keywords';
              }}
              className={`px-6 py-3 rounded-t-lg font-semibold transition-all ${activeTab === 'keywords'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              🔑 Keywords
            </button>
            {/* <button
              onClick={() => {
                setActiveTab('ideas');
                window.location.href = '/ideas';
              }}
              className={`px-6 py-3 rounded-t-lg font-semibold transition-all ${
                activeTab === 'ideas'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              💡 Ideas
            </button> */}
            <button
              onClick={() => {
                setActiveTab('segregator');
                window.location.href = '/segregator';
              }}
              className={`px-6 py-3 rounded-t-lg font-semibold transition-all ${activeTab === 'segregator'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              🗂️ Keyword Segregator
            </button>
          </div>
        </div>
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<TopicsList />} />
        <Route path="/topics" element={<TopicsList />} />
        <Route path="/topics/:topicId" element={<TopicPage />} />
        <Route path="/keywords" element={<KeywordsList />} />
        {/* <Route path="/ideas" element={<IdeasList />} /> */}
        <Route path="/segregator" element={<KeywordsSegregator />} />
        <Route path="/segregator/groups/:groupingsGroupId" element={<GroupingsGroupDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// Render the app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
