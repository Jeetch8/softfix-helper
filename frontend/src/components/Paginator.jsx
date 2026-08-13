import React from 'react';

/**
 * Reusable Paginator component for navigating pages/versions.
 *
 * Props:
 * - currentPage: number (1-based index)
 * - totalPages: number
 * - onPageChange: (page: number) => void
 * - itemLabel: string (e.g. "Version", "Page", "Item") - default "Version"
 * - totalItems: number (optional)
 * - pageSize: number (optional)
 * - showPills: boolean (default true) - show direct page selector buttons
 * - activeBadgeIndex: number (optional, 1-based index) - page that is currently active/selected in backend
 * - className: string (optional)
 * - colorScheme: 'blue' | 'purple' | 'indigo' | 'green' (default 'blue')
 */
const Paginator = ({
  currentPage,
  totalPages,
  onPageChange,
  itemLabel = 'Version',
  totalItems,
  pageSize,
  showPills = true,
  activeBadgeIndex,
  className = '',
  colorScheme = 'blue',
}) => {
  if (totalPages <= 1) return null;

  const colorStyles = {
    blue: {
      activeBg: 'bg-blue-600 text-white border-blue-600',
      activeBadgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
      hoverBg: 'hover:bg-blue-50 text-blue-700 border-blue-200',
      ring: 'focus:ring-blue-500',
    },
    purple: {
      activeBg: 'bg-purple-600 text-white border-purple-600',
      activeBadgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
      hoverBg: 'hover:bg-purple-50 text-purple-700 border-purple-200',
      ring: 'focus:ring-purple-500',
    },
    indigo: {
      activeBg: 'bg-indigo-600 text-white border-indigo-600',
      activeBadgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      hoverBg: 'hover:bg-indigo-50 text-indigo-700 border-indigo-200',
      ring: 'focus:ring-indigo-500',
    },
    green: {
      activeBg: 'bg-green-600 text-white border-green-600',
      activeBadgeBg: 'bg-green-100 text-green-800 border-green-300',
      hoverBg: 'hover:bg-green-50 text-green-700 border-green-200',
      ring: 'focus:ring-green-500',
    },
  }[colorScheme] || colorStyles.blue;

  // Generate page numbers to show (with max 7 visible pills, using ellipsis if needed)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-gray-50/90 border border-gray-200 rounded-xl shadow-sm ${className}`}
    >
      {/* Left info label */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
        <span className="px-2 py-1 bg-white border border-gray-200 rounded-lg shadow-2xs font-mono">
          {itemLabel} {currentPage} of {totalPages}
        </span>
        {totalItems !== undefined && (
          <span className="text-gray-500 font-normal hidden sm:inline">
            ({totalItems} total)
          </span>
        )}
      </div>

      {/* Center pills / Page number buttons */}
      {showPills && (
        <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-0.5 text-xs text-gray-400 select-none"
                >
                  ...
                </span>
              );
            }

            const isCurrent = page === currentPage;
            const isActiveSystemVersion = activeBadgeIndex === page;

            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all duration-150 flex items-center gap-1 ${
                  isCurrent
                    ? `${colorStyles.activeBg} shadow-xs font-bold scale-105`
                    : `bg-white border-gray-300 text-gray-700 ${colorStyles.hoverBg}`
                }`}
                title={`Go to ${itemLabel} ${page}${
                  isActiveSystemVersion ? ' (Currently Active)' : ''
                }`}
              >
                <span>v{page}</span>
                {isActiveSystemVersion && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCurrent ? 'bg-green-300' : 'bg-green-500'
                    }`}
                    title="Active Version"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Right navigation buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-2.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
          title="Previous Page"
        >
          <span>←</span>
          <span className="hidden sm:inline">Prev</span>
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
          title="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};

export default Paginator;
