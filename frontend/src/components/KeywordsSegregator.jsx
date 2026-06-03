import React, { useState, useEffect } from 'react';
import { getSegregatorGroups } from '../api/client';

const KeywordsSegregator = () => {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [groupings, setGroupings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await getSegregatorGroups();
        setGroupings(response.data);
        console.log('Groupings fetched:', response.data);
      } catch (error) {
        console.error('Error fetching groupings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const handleFileChange = (e, setFile) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <span className="text-4xl">🗂️</span> Keyword Segregator
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Upload files to segregate keywords.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Card 1 */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-2xl mb-4">
            📄
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload File 1</h2>
          <p className="text-gray-500 mb-6">Select the first file for segregation.</p>
          
          <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl px-6 py-8 w-full flex flex-col items-center transition-colors">
            <span className="text-gray-600 font-medium">Click to browse or drag & drop</span>
            <span className="text-sm text-gray-400 mt-1">CSV, TXT, or Excel</span>
            <input 
              type="file" 
              className="hidden" 
              onChange={(e) => handleFileChange(e, setFile1)}
            />
          </label>
          
          {file1 && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 w-full text-left">
              <span>✅</span>
              <span className="truncate flex-1 font-medium">{file1.name}</span>
            </div>
          )}
        </div>

        {/* Upload Card 2 */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-2xl mb-4">
            📄
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload File 2</h2>
          <p className="text-gray-500 mb-6">Select the second file for segregation.</p>
          
          <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl px-6 py-8 w-full flex flex-col items-center transition-colors">
            <span className="text-gray-600 font-medium">Click to browse or drag & drop</span>
            <span className="text-sm text-gray-400 mt-1">CSV, TXT, or Excel</span>
            <input 
              type="file" 
              className="hidden" 
              onChange={(e) => handleFileChange(e, setFile2)}
            />
          </label>
          
          {file2 && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 w-full text-left">
              <span>✅</span>
              <span className="truncate flex-1 font-medium">{file2.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeywordsSegregator;
