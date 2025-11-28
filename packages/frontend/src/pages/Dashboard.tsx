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
        gradient: 'from-purple-500 to-pink-500',
        bgGradient: 'from-purple-500/10 to-pink-500/10'
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
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-500 dark:text-gray-400 mt-4">Loading dashboard...</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gradient mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Welcome back! Here&apos;s an overview of your projects.
          </p>
        </div>
        <Link to="/editor" className="btn btn-primary flex items-center gap-2 w-fit shadow-lg hover:shadow-xl transition-all">
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
              className="card-hover group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${stat.bgGradient} absolute -top-4 -right-4 blur-2xl opacity-50 group-hover:opacity-75 transition-opacity`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage limit indicator */}
      {usageData && usageLimit > 0 && (
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Usage Limit</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {wordsProcessed.toLocaleString()} / {usageLimit.toLocaleString()} words
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(usagePercentage)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">used</p>
            </div>
          </div>
          <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Projects</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and organize your work</p>
        </div>
        {displayProjects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/10 mb-6">
              <FileText className="w-12 h-12 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No projects yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Get started by creating your first project. Transform AI-generated content into natural, human-like text.
            </p>
            <Link to="/editor" className="btn btn-primary inline-flex items-center gap-2 shadow-lg hover:shadow-xl">
              <Plus className="w-5 h-5" />
              <span>Create Your First Project</span>
            </Link>
          </div>
        ) : (
          <ProjectList
            projects={displayProjects}
            onDeleteProject={handleDeleteProject}
            onBulkOperationComplete={async (result) => {
              return result;
            }}
          />
        )}
      </div>
    </div>
  );
}
