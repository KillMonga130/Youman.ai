import { useState } from 'react';
import { Clock, FileText, ChevronRight, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HistoryItem {
  id: string;
  projectName: string;
  versionNumber: number;
  createdAt: string;
  wordCount: number;
  detectionScore: number;
  strategy: string;
}

// Mock data
const mockHistory: HistoryItem[] = [
  {
    id: '1',
    projectName: 'Blog Post Draft',
    versionNumber: 3,
    createdAt: '2024-01-15T14:20:00Z',
    wordCount: 1250,
    detectionScore: 12,
    strategy: 'professional',
  },
  {
    id: '2',
    projectName: 'Blog Post Draft',
    versionNumber: 2,
    createdAt: '2024-01-15T12:30:00Z',
    wordCount: 1180,
    detectionScore: 25,
    strategy: 'professional',
  },
  {
    id: '3',
    projectName: 'Research Paper',
    versionNumber: 5,
    createdAt: '2024-01-14T16:45:00Z',
    wordCount: 5420,
    detectionScore: 8,
    strategy: 'academic',
  },
  {
    id: '4',
    projectName: 'Marketing Copy',
    versionNumber: 1,
    createdAt: '2024-01-13T11:15:00Z',
    wordCount: 320,
    detectionScore: 18,
    strategy: 'casual',
  },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStrategyBadge(strategy: string): JSX.Element {
  const colors: Record<string, string> = {
    casual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    professional: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    academic: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    auto: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[strategy] || colors.auto}`}>
      {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
    </span>
  );
}

export function History(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStrategy, setFilterStrategy] = useState<string>('all');

  const filteredHistory = mockHistory.filter((item) => {
    const matchesSearch = item.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStrategy === 'all' || item.strategy === filterStrategy;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Version History</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Browse and restore previous versions of your projects
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterStrategy}
            onChange={(e) => setFilterStrategy(e.target.value)}
            className="input pl-10 pr-8 appearance-none"
          >
            <option value="all">All Strategies</option>
            <option value="casual">Casual</option>
            <option value="professional">Professional</option>
            <option value="academic">Academic</option>
          </select>
        </div>
      </div>

      {/* History list */}
      <div className="card divide-y divide-gray-200 dark:divide-gray-700">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No history found</p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <Link
              key={item.id}
              to={`/editor/${item.id}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{item.projectName}</h3>
                    <span className="text-sm text-gray-500">v{item.versionNumber}</span>
                    {getStrategyBadge(item.strategy)}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>{item.wordCount.toLocaleString()} words</span>
                    <span
                      className={
                        item.detectionScore < 20
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }
                    >
                      {item.detectionScore}% AI detected
                    </span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
