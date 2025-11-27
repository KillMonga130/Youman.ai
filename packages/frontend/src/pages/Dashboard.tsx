import { Plus, FileText, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore, Project } from '../store';
import { ProjectList } from '../components/ProjectList';

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

      {/* Recent projects with bulk operations */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
        </div>
        <ProjectList
          projects={displayProjects}
          onDeleteProject={deleteProject}
          onBulkOperationComplete={(result) => {
            // Refresh projects after bulk operation
            if (result.success) {
              // Projects will be refreshed via store
            }
          }}
        />
      </div>
    </div>
  );
}
