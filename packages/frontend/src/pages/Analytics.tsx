import { TrendingUp, TrendingDown, FileText, Zap, Target, Clock } from 'lucide-react';

interface StatCard {
  label: string;
  value: string;
  change: number;
  icon: typeof TrendingUp;
  color: string;
}

const stats: StatCard[] = [
  { label: 'Total Words Processed', value: '125,420', change: 12.5, icon: FileText, color: 'bg-blue-500' },
  { label: 'Avg Detection Score', value: '9.2%', change: -3.2, icon: Target, color: 'bg-green-500' },
  { label: 'Projects Completed', value: '24', change: 8.3, icon: Zap, color: 'bg-teal-500' },
  { label: 'Time Saved', value: '18.5 hrs', change: 15.0, icon: Clock, color: 'bg-amber-500' },
];

const recentActivity = [
  { date: 'Today', projects: 3, words: 4520, avgScore: 8 },
  { date: 'Yesterday', projects: 5, words: 8240, avgScore: 11 },
  { date: 'Jan 13', projects: 2, words: 3100, avgScore: 9 },
  { date: 'Jan 12', projects: 4, words: 6800, avgScore: 12 },
  { date: 'Jan 11', projects: 3, words: 5200, avgScore: 7 },
];

const strategyUsage = [
  { strategy: 'Professional', percentage: 45, count: 11 },
  { strategy: 'Academic', percentage: 30, count: 7 },
  { strategy: 'Casual', percentage: 20, count: 5 },
  { strategy: 'Auto', percentage: 5, count: 1 },
];

export function Analytics(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track your humanization performance and usage
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(stat.change)}%
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold">Recent Activity</h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {recentActivity.map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{day.date}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {day.projects} projects · {day.words.toLocaleString()} words
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        day.avgScore < 15 ? 'text-green-600' : 'text-amber-600'
                      }`}
                    >
                      {day.avgScore}%
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">avg score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy usage */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold">Strategy Usage</h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {strategyUsage.map((item) => (
                <div key={item.strategy}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{item.strategy}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.count} projects ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detection score trend */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">Detection Score Trend</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Average AI detection scores over the last 7 days
          </p>
        </div>
        <div className="p-4">
          <div className="h-48 flex items-end justify-between gap-2">
            {[15, 12, 18, 9, 11, 8, 10].map((score, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t transition-all duration-500 ${
                    score < 15 ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                  style={{ height: `${(score / 20) * 100}%` }}
                />
                <span className="text-xs text-gray-500">{score}%</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>7 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
