import { Plus, FileText, TrendingUp, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { ProjectList } from '../components/ProjectList';
import { useProjects, useUsage, useDeleteProject, useBulkDeleteProjects } from '../api/hooks';
import { Spinner, Alert } from '../components/ui';
import { useMemo } from 'react';

export function Dashboard(): JSX.Element {
  const { deleteProject: deleteProjectFromStore } = useAppStore();
  const { data: projectsData, isLoading: isLoadingProjects, error: projectsError } = useProjects({ page: 1, limit: 20 });
  const { data: usageData, isLoading: isLoadingUsage } = useUsage();
  const deleteProjectMutation = useDeleteProject();
  const bulkDeleteMutation = useBulkDeleteProjects();

  const projects = projectsData?.projects || [];
  const totalProjects = projectsData?.pagination?.total || 0;
  const wordsProcessed = usageData?.usage?.wordsProcessed || 0;
  const usageLimit = usageData?.usage?.limit || 0;

  // Calculate stats from real data
  const stats = useMemo(() => {
    const totalWordCount = projects.reduce((sum, p) => sum + (p.wordCount || 0), 0);
    const avgDetectionScore = projects.length > 0
      ? projects.reduce((sum, p) => sum + ((p as { detectionScore?: number }).detectionScore || 0), 0) / projects.length
      : 0;
    
    // Get projects from this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthProjects = projects.filter(p => new Date(p.createdAt) >= thisMonth);

    return [
      { 
        label: 'Total Projects', 
        value: totalProjects.toString(), 
        icon: FileText, 
        gradient: 'from-blue-500 to-cyan-500',
        bgGradient: 'from-blue-500/10 to-cyan-500/10'
      },
      { 
        label: 'Words Processed', 
        value: wordsProcessed > 1000 ? `${(wordsProcessed / 1000).toFixed(1)}K` : wordsProcessed.toString(), 
        icon: TrendingUp, 
        gradient: 'from-green-500 to-emerald-500',
        bgGradient: 'from-green-500/10 to-emerald-500/10'
      },
      { 
        label: 'Avg Detection Score', 
        value: avgDetectionScore > 0 ? `${avgDetectionScore.toFixed(1)}%` : 'N/A', 
        icon: Sparkles, 
        gradient: 'from-teal-500 to-cyan-500',
        bgGradient: 'from-teal-500/10 to-cyan-500/10'
      },
      { 
        label: 'This Month', 
        value: thisMonthProjects.length.toString(), 
        icon: Clock, 
        gradient: 'from-amber-500 to-orange-500',
        bgGradient: 'from-amber-500/10 to-orange-500/10'
      },
    ];
  }, [totalProjects, wordsProcessed, projects]);

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProjectMutation.mutateAsync(id);
      deleteProjectFromStore(id);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]): Promise<import('../types/bulk-operations').BulkOperationResult> => {
    try {
      const result = await bulkDeleteMutation.mutateAsync(ids);
      ids.forEach(id => deleteProjectFromStore(id));
      return { 
        success: true,
        totalProcessed: ids.length,
        successCount: result.deleted || ids.length,
        failedCount: result.failed?.length || 0,
        errors: (result.failed || []).map(id => ({
          id,
          name: projects.find(p => p.id === id)?.name || 'Unknown',
          error: 'Failed to delete'
        }))
      };
    } catch (error) {
      console.error('Failed to bulk delete projects:', error);
      return { 
        success: false,
        totalProcessed: ids.length,
        successCount: 0,
        failedCount: ids.length,
        errors: ids.map(id => ({
          id,
          name: projects.find(p => p.id === id)?.name || 'Unknown',
          error: 'Failed to delete projects'
        }))
      };
    }
  };

  // Convert API projects to store format
  const displayProjects = projects.map(p => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    wordCount: p.wordCount || 0,
    status: (p.status.toLowerCase() === 'active' ? 'completed' : p.status.toLowerCase()) as 'draft' | 'processing' | 'completed',
    detectionScore: (p as { detectionScore?: number }).detectionScore,
  }));

  if (isLoadingProjects || isLoadingUsage) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Skeleton header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="skeleton h-12 w-64 mb-3 rounded-xl" />
            <div className="skeleton h-6 w-96 rounded-lg" />
          </div>
          <div className="skeleton h-12 w-40 rounded-xl" />
        </div>

        {/* Skeleton stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6">
              <div className="skeleton h-12 w-12 rounded-xl mb-4" />
              <div className="skeleton h-4 w-24 mb-2 rounded" />
              <div className="skeleton h-8 w-16 rounded" />
            </div>
          ))}
        </div>

        {/* Skeleton projects */}
        <div className="card">
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="skeleton h-6 w-32 mb-2 rounded" />
            <div className="skeleton h-4 w-48 rounded" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const usagePercentage = usageLimit > 0 ? Math.min((wordsProcessed / usageLimit) * 100, 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Error Alert */}
      {projectsError && (
        <Alert variant="error" className="animate-slide-down">
          <AlertCircle className="w-4 h-4" />
          <span>Failed to load projects. Please try refreshing the page.</span>
        </Alert>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-2">
        <div>
          <h1 className="text-5xl font-bold text-gradient mb-3 tracking-tight">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
            Welcome back! Here&apos;s an overview of your projects.
          </p>
        </div>
        <Link to="/editor" className="btn btn-primary flex items-center gap-2 w-fit shadow-lg hover:shadow-xl hover:scale-105 transition-all">
          <Plus className="w-5 h-5" />
          <span>New Project</span>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.label} 
              className="card-hover group relative overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Decorative background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div className={`p-3.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg shadow-primary-500/20 group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage limit indicator */}
      {usageData && usageLimit > 0 && (
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Usage Limit</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {wordsProcessed.toLocaleString()} / {usageLimit.toLocaleString()} words
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{Math.round(usagePercentage)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">used</p>
            </div>
          </div>
          <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div
              className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${
                usagePercentage > 90 ? 'from-error-500 to-error-600' :
                usagePercentage > 70 ? 'from-warning-500 to-warning-600' :
                'from-success-500 to-success-600'
              } transition-all duration-1000 shadow-lg`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent projects */}
      <div className="card animate-slide-up">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Recent Projects</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage and organize your work</p>
        </div>
        {displayProjects.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex p-5 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/10 mb-6 shadow-lg">
              <FileText className="w-14 h-14 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No projects yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto text-lg leading-relaxed">
              Get started by creating your first project. Transform AI-generated content into natural, human-like text.
            </p>
            <Link to="/editor" className="btn btn-primary inline-flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              <Plus className="w-5 h-5" />
              <span>Create Your First Project</span>
            </Link>
          </div>
        ) : (
          <ProjectList
            projects={displayProjects}
            onDeleteProject={handleDeleteProject}
            onBulkOperationComplete={async (result) => {
              // After bulk operations complete, remove deleted projects from store
              if (result.success && result.successCount > 0) {
                // The BulkOperationsToolbar already handles the API calls
                // We just need to ensure the store is updated
                // The query invalidation in the hooks should handle the refresh
                result.errors.forEach(error => {
                  // Remove failed deletions from store if they were partially processed
                  // This is handled by the individual delete handlers
                });
              }
              return result;
            }}
          />
        )}
      </div>
    </div>
  );
}
