import React, { useState } from 'react';
import TopicsList from './components/TopicsList';
import KeywordsList from './components/KeywordsList';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('topics');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center h-16 gap-4">
            <button
              onClick={() => setActiveTab('topics')}
              className={`px-6 py-2 font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'topics'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🎬 YouTube Topics
            </button>
            <button
              onClick={() => setActiveTab('keywords')}
              className={`px-6 py-2 font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'keywords'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🔑 Question Keywords
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      {activeTab === 'topics' ? <TopicsList /> : <KeywordsList />}
    </div>
  );
}

export default App;

