import React from 'react';

const StatusBadge = ({ status }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  const statusEmojis = {
    pending: '⏳',
    processing: '⚙️',
    completed: '✅',
    failed: '❌',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${statusColors[status] || 'bg-gray-100'}`}
    >
      {statusEmojis[status]} {status}
    </span>
  );
};

export default StatusBadge;
