'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const getInitialTab = () => {
    if (pathname.includes('/segregator')) return 'segregator';
    if (pathname.includes('/keywords')) return 'keywords';
    return 'topics';
  };

  const activeTab = getInitialTab();

  return (
    <div className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-2 sm:px-4">
        <div className="flex gap-1 py-1.5 sm:py-2 overflow-x-auto">
          <Link
            href="/"
            className={`px-2.5 sm:px-6 py-1.5 sm:py-3 rounded-md sm:rounded-t-lg font-semibold text-xs sm:text-base whitespace-nowrap transition-all ${
              activeTab === 'topics'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md sm:shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎬 Topics
          </Link>
          <Link
            href="/keywords"
            className={`px-2.5 sm:px-6 py-1.5 sm:py-3 rounded-md sm:rounded-t-lg font-semibold text-xs sm:text-base whitespace-nowrap transition-all ${
              activeTab === 'keywords'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md sm:shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🔑 Keywords
          </Link>
          <Link
            href="/segregator"
            className={`px-2.5 sm:px-6 py-1.5 sm:py-3 rounded-md sm:rounded-t-lg font-semibold text-xs sm:text-base whitespace-nowrap transition-all ${
              activeTab === 'segregator'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md sm:shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🗂️ Keyword Segregator
          </Link>
        </div>
      </div>
    </div>
  );
}
