import { Plus, FileText, TrendingUp, Clock, Trash2, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore, Project } from '../store';

// Mock data for demonstration
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Blog Post Draft',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T14:20:00Z',
    wordCount: 1250,
    status: 'completed',
    detectionScore: 12,
  },
  {
    id: '2',
    name: 'Research Paper',
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-14T16:45:00Z',
    wordCount: 5420,
    status: 'completed',
    detectionScore: 8,
  },
  {
    id: '3',
    name: 'Marketing Copy',
    createdAt: '2024-01-13T11:15:00Z',
    updatedAt: '2024-01-13T11:15:00Z',
    wordCount: 320,
    status: 'draft',
  },
];

const stats = [
  { label: 'Total Projects', value: '24', icon: FileText, color: 'bg-blue-500' },
  { label: 'Words Processed', value: '125.4K', icon: TrendingUp, color: 'bg-green-500' },
  { label: 'Avg Detection Score', value: '9.2%', icon: TrendingUp, color: 'bg-teal-500' },
  { label: 'This Month', value: '12', icon: Clock, color: 'bg-amber-500' },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadge(status: Project['status']): JSX.Element {
  const styles = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function Dashboard(): JSX.Element {
  const { projects, deleteProject } = useAppStore();
  const displayProjects = projects.length > 0 ? projects : mockProjects;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back! Here&apos;s an overview of your projects.
          </p>
        </div>
        <Link to="/editor" className="btn btn-primary flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-xl font-semibold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {displayProjects.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No projects yet</p>
              <Link to="/editor" className="btn btn-primary mt-4 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create your first project
              </Link>
            </div>
          ) : (
            displayProjects.map((project) => (
              <div
                key={project.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{project.name}</h3>
                    {getStatusBadge(project.status)}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>{project.wordCount.toLocaleString()} words</span>
                    <span>Updated {formatDate(project.updatedAt)}</span>
                    {project.detectionScore !== undefined && (
                      <span className="text-green-600 dark:text-green-400">
                        {project.detectionScore}% AI detected
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/editor/${project.id}`}
                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
