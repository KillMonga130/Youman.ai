import { Ghost, FileText, AlertCircle, Skull, FlaskConical, Zap, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { ProjectList } from '../components/ProjectList';
import { useProjects, useUsage, useDeleteProject, useBulkDeleteProjects } from '../api/hooks';
import { Alert } from '../components/ui';
import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GhostParticles, StatCard } from '../components/Halloween';

export function Dashboard(): JSX.Element {
  const queryClient = useQueryClient();
  const { deleteProject: deleteProjectFromStore } = useAppStore();
  const { data: projectsData, isLoading: isLoadingProjects, error: projectsError } = useProjects({ page: 1, limit: 20 });
  const { data: usageData, isLoading: isLoadingUsage } = useUsage();
  const deleteProjectMutation = useDeleteProject();
  const bulkDeleteMutation = useBulkDeleteProjects();

  const projects = projectsData?.projects || [];
  const totalProjects = projectsData?.pagination?.total || 0;
  const wordsProcessed = usageData?.usage?.wordsProcessed || 0;
  const usageLimit = usageData?.usage?.limit || 0;

  // Calculate stats from real data - Halloween themed (Resurrection Chamber)
  const stats = useMemo(() => {
    const projectsWithScores = projects.filter(p => p.detectionScore !== undefined && p.detectionScore !== null);
    const avgDetectionScore = projectsWithScores.length > 0
      ? projectsWithScores.reduce((sum, p) => sum + (p.detectionScore || 0), 0) / projectsWithScores.length
      : 0;
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthProjects = projects.filter(p => new Date(p.createdAt) >= thisMonth);

    // Calculate evasion rate (inverse of detection score)
    const evasionRate = avgDetectionScore > 0 ? 100 - avgDetectionScore : 0;

    return [
      { 
        label: 'Souls Saved', 
        value: totalProjects.toString(), 
        subtitle: 'Texts resurrected',
        icon: Skull,
        iconColor: 'text-primary-500'
      },
      { 
        label: 'Evasion Rate', 
        value: evasionRate > 0 ? `${evasionRate.toFixed(1)}%` : 'N/A', 
        subtitle: 'Detection bypassed',
        icon: FlaskConical,
        iconColor: 'text-accent-500'
      },
      { 
        label: 'Necromancy Power', 
        value: wordsProcessed > 1000 ? `${(wordsProcessed / 1000).toFixed(1)}K` : wordsProcessed.toString(), 
        subtitle: 'Words transmuted',
        icon: Zap,
        iconColor: 'text-warning-500'
      },
      { 
        label: 'Midnight Sessions', 
        value: thisMonthProjects.length.toString(), 
        subtitle: 'This month',
        icon: Moon,
        iconColor: 'text-primary-400'
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
    detectionScore: p.detectionScore,
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

      {/* Page header - Halloween themed */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display text-glow-purple mb-2">Resurrection Chamber</h1>
          <p className="text-gray-400">
            Your souls await resurrection. Begin the ritual.
          </p>
        </div>
        <Link to="/editor" className="btn-resurrection flex items-center gap-2 w-fit">
          <Ghost className="w-5 h-5" />
          <span>Begin Ritual</span>
        </Link>
      </div>

      {/* Stats grid - Spooky stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            subtitle={stat.subtitle}
            iconColor={stat.iconColor}
          />
        ))}
      </div>

      {/* Necromancy Power Meter */}
      {usageData && usageLimit > 0 && (
        <div className="card p-6 border-glow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-400" />
                Necromancy Power Reserve
              </h3>
              <p className="text-sm text-gray-400">
                {wordsProcessed.toLocaleString()} / {usageLimit.toLocaleString()} words transmuted
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${
                usagePercentage > 90 ? 'text-glow-red' :
                usagePercentage > 70 ? 'text-warning-400' :
                'text-glow-green'
              }`}>{Math.round(usagePercentage)}%</p>
            </div>
          </div>
          <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                usagePercentage > 90 ? 'bg-gradient-to-r from-error-600 to-error-500' :
                usagePercentage > 70 ? 'bg-gradient-to-r from-warning-600 to-warning-500' :
                'bg-gradient-to-r from-accent-600 to-accent-500'
              }`}
              style={{ 
                width: `${usagePercentage}%`,
                boxShadow: usagePercentage > 90 
                  ? '0 0 15px rgba(239, 68, 68, 0.5)' 
                  : usagePercentage > 70 
                    ? '0 0 15px rgba(249, 115, 22, 0.5)'
                    : '0 0 15px rgba(34, 197, 94, 0.5)'
              }}
            />
          </div>
          {usagePercentage > 80 && (
            <p className="text-xs text-warning-400 mt-2 animate-pulse">
              ⚠️ Your necromancy power is running low. Rest and return at midnight.
            </p>
          )}
        </div>
      )}

      {/* The Graveyard - Recent projects */}
      <div className="card relative overflow-hidden">
        <GhostParticles count={4} className="opacity-30" />
        <div className="p-6 border-b border-gray-800 relative z-10">
          <h2 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
            <Skull className="w-5 h-5 text-primary-400" />
            The Graveyard
          </h2>
          <p className="text-sm text-gray-400">Souls awaiting resurrection or already saved</p>
        </div>
        {displayProjects.length === 0 ? (
          <div className="p-12 text-center relative z-10">
            <div className="inline-flex p-4 bg-gray-800/50 rounded-lg mb-4 border border-gray-700">
              <Ghost className="w-12 h-12 text-primary-400 animate-float-ghost" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">The graveyard is empty</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              No souls to resurrect yet. Begin your first ritual to save a cursed text.
            </p>
            <Link to="/editor" className="btn-resurrection inline-flex items-center gap-2">
              <Ghost className="w-5 h-5" />
              <span>Begin First Ritual</span>
            </Link>
          </div>
        ) : (
          <div className="relative z-10">
            <ProjectList
              projects={displayProjects}
              onDeleteProject={handleDeleteProject}
              onBulkOperationComplete={async (result) => {
                if (result.success && result.successCount > 0) {
                  const deletedIds = displayProjects
                    .filter(p => !result.errors.some(e => e.id === p.id))
                    .map(p => p.id);
                  deletedIds.forEach(id => deleteProjectFromStore(id));
                  
                  await queryClient.invalidateQueries({ queryKey: ['projects'] });
                  await queryClient.invalidateQueries({ queryKey: ['usage'] });
                }
                return result;
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
