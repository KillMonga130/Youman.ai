import { TrendingUp, TrendingDown, FileText, Zap, Target, Clock, AlertCircle } from 'lucide-react';
import { useUsage, useProjects, useUsageHistory, useUsageTrends } from '../api/hooks';
import { Spinner, Alert } from '../components/ui';
import { useMemo } from 'react';

interface StatCard {
  label: string;
  value: string;
  change: number;
  icon: typeof TrendingUp;
  color: string;
}

export function Analytics(): JSX.Element {
  const { data: usageData, isLoading: isLoadingUsage, error: usageError } = useUsage();
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects({ page: 1, limit: 100 });
  const { data: usageHistoryData, isLoading: isLoadingHistory } = useUsageHistory(7);
  const { data: usageTrendsData, isLoading: isLoadingTrends } = useUsageTrends();
  
  const projects = projectsData?.projects || [];
  const wordsProcessed = usageData?.usage?.wordsProcessed || 0;
  const totalProjects = projectsData?.pagination?.total || 0;
  const usageHistory = usageHistoryData?.data?.entries || [];
  const usageTrends = usageTrendsData?.data || [];

  // Calculate stats from real data with trends
  const stats: StatCard[] = useMemo(() => {
    const avgDetectionScore = projects.length > 0
      ? projects.reduce((sum, p) => sum + ((p as { detectionScore?: number }).detectionScore || 0), 0) / projects.length
      : 0;
    
    // Get words trend
    const wordsTrend = usageTrends.find(t => t.resourceType === 'WORDS');
    const wordsChange = wordsTrend ? wordsTrend.changePercent : 0;
    
    return [
      { 
        label: 'Total Words Processed', 
        value: wordsProcessed > 1000 ? `${(wordsProcessed / 1000).toFixed(1)}K` : wordsProcessed.toString(), 
        change: Math.round(wordsChange),
        icon: FileText, 
        color: 'bg-blue-500' 
      },
      { 
        label: 'Avg Detection Score', 
        value: avgDetectionScore > 0 ? `${avgDetectionScore.toFixed(1)}%` : 'N/A', 
        change: 0, 
        icon: Target, 
        color: 'bg-green-500' 
      },
      { 
        label: 'Projects Completed', 
        value: totalProjects.toString(), 
        change: 0, 
        icon: Zap, 
        color: 'bg-teal-500' 
      },
      { 
        label: 'Usage Limit', 
        value: usageData?.usage?.limit ? `${((wordsProcessed / usageData.usage.limit) * 100).toFixed(0)}%` : 'N/A', 
        change: 0, 
        icon: Clock, 
        color: 'bg-amber-500' 
      },
    ];
  }, [wordsProcessed, projects, totalProjects, usageData, usageTrends]);

  // Calculate recent activity from usage history
  const recentActivity = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayEntry = usageHistory.find(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
    
    const yesterdayEntry = usageHistory.find(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === yesterday.getTime();
    });

    // Count projects created today/yesterday
    const todayProjects = projects.filter(p => {
      const created = new Date(p.createdAt);
      created.setHours(0, 0, 0, 0);
      return created.getTime() === today.getTime();
    }).length;
    
    const yesterdayProjects = projects.filter(p => {
      const created = new Date(p.createdAt);
      created.setHours(0, 0, 0, 0);
      return created.getTime() === yesterday.getTime();
    }).length;

    // Calculate average detection scores
    const todayAvgScore = todayProjects > 0
      ? projects.filter(p => {
          const created = new Date(p.createdAt);
          created.setHours(0, 0, 0, 0);
          return created.getTime() === today.getTime();
        }).reduce((sum, p) => sum + ((p as { detectionScore?: number }).detectionScore || 0), 0) / todayProjects
      : 0;
    
    const yesterdayAvgScore = yesterdayProjects > 0
      ? projects.filter(p => {
          const created = new Date(p.createdAt);
          created.setHours(0, 0, 0, 0);
          return created.getTime() === yesterday.getTime();
        }).reduce((sum, p) => sum + ((p as { detectionScore?: number }).detectionScore || 0), 0) / yesterdayProjects
      : 0;

    return [
      { 
        date: 'Today', 
        projects: todayProjects, 
        words: todayEntry?.words || 0, 
        avgScore: Math.round(todayAvgScore) 
      },
      { 
        date: 'Yesterday', 
        projects: yesterdayProjects, 
        words: yesterdayEntry?.words || 0, 
        avgScore: Math.round(yesterdayAvgScore) 
      },
    ];
  }, [usageHistory, projects]);

  // Calculate strategy usage from projects (if they have strategy metadata)
  const strategyUsage = useMemo(() => {
    const strategyCounts: Record<string, number> = {
      professional: 0,
      academic: 0,
      casual: 0,
      auto: 0,
    };
    
    // Count strategies from projects that have strategy metadata
    projects.forEach((project: any) => {
      const strategy = (project.strategy || project.settings?.strategy || 'auto').toLowerCase();
      if (strategyCounts.hasOwnProperty(strategy)) {
        strategyCounts[strategy]++;
      } else {
        strategyCounts.auto++;
      }
    });
    
    const total = projects.length;
    if (total === 0) {
      return [
        { strategy: 'Professional', percentage: 0, count: 0 },
        { strategy: 'Academic', percentage: 0, count: 0 },
        { strategy: 'Casual', percentage: 0, count: 0 },
        { strategy: 'Auto', percentage: 0, count: 0 },
      ];
    }
    
    // Calculate percentages
    return [
      { 
        strategy: 'Professional', 
        percentage: Math.round((strategyCounts.professional / total) * 100), 
        count: strategyCounts.professional 
      },
      { 
        strategy: 'Academic', 
        percentage: Math.round((strategyCounts.academic / total) * 100), 
        count: strategyCounts.academic 
      },
      { 
        strategy: 'Casual', 
        percentage: Math.round((strategyCounts.casual / total) * 100), 
        count: strategyCounts.casual 
      },
      { 
        strategy: 'Auto', 
        percentage: Math.round((strategyCounts.auto / total) * 100), 
        count: strategyCounts.auto 
      },
    ];
  }, [projects]);

  // Calculate detection score trend from last 7 days
  const detectionScoreTrend = useMemo(() => {
    const scores: number[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayProjects = projects.filter(p => {
        const created = new Date(p.createdAt);
        created.setHours(0, 0, 0, 0);
        return created.getTime() === date.getTime();
      });
      
      if (dayProjects.length > 0) {
        const avgScore = dayProjects.reduce((sum, p) => 
          sum + ((p as { detectionScore?: number }).detectionScore || 0), 0) / dayProjects.length;
        scores.push(Math.round(avgScore));
      } else {
        scores.push(0);
      }
    }
    
    // If no data, return zeros (no fake data)
    if (scores.every(s => s === 0)) {
      return [0, 0, 0, 0, 0, 0, 0];
    }
    
    return scores;
  }, [projects]);

  if (isLoadingUsage || isLoadingProjects || isLoadingHistory || isLoadingTrends) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Spinner size="lg" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track your humanization performance and usage
        </p>
      </div>

      {usageError && (
        <Alert variant="error">
          <AlertCircle className="w-4 h-4" />
          <span>Failed to load usage data. Please try again.</span>
        </Alert>
      )}

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
            {detectionScoreTrend.map((score, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                {score > 0 ? (
                  <>
                    <div
                      className={`w-full rounded-t transition-all duration-500 ${
                        score < 15 ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{ height: `${Math.min(100, (score / 20) * 100)}%` }}
                    />
                    <span className="text-xs text-gray-500">{score}%</span>
                  </>
                ) : (
                  <>
                    <div className="w-full rounded-t bg-gray-200 dark:bg-gray-700" style={{ height: '10%' }} />
                    <span className="text-xs text-gray-400">-</span>
                  </>
                )}
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
