import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Share2,
  Star,
  Copy,
  Search,
  Filter,
  Loader2,
  CheckCircle,
  X,
  Eye,
  Grid,
  List,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Alert } from '../components/ui';
import { useAppStore } from '../store';
import { useProjects } from '../api/hooks';

export function Templates(): JSX.Element {
  const { user } = useAppStore();
  const [templates, setTemplates] = useState<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    level: number;
    strategy: string;
    isPublic: boolean;
    useCount: number;
  }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSharesModal, setShowSharesModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [applyProjectId, setApplyProjectId] = useState<string>('');
  const [templateShares, setTemplateShares] = useState<Array<{
    id: string;
    userId: string;
    userEmail: string;
    userName: string | null;
    sharedAt: string;
  }>>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  
  // Get projects for apply modal
  const { data: projectsData } = useProjects({ page: 1, limit: 100 });
  const projects = projectsData?.projects || [];
  
  // Form states
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: '',
    level: 3,
    strategy: 'auto' as 'auto' | 'casual' | 'professional' | 'academic',
    settings: {} as Record<string, unknown>,
  });
  
  const [shareForm, setShareForm] = useState({
    userId: '',
    userEmail: '',
  });
  
  const [importData, setImportData] = useState('');

  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.getTemplates();
      setTemplates(result.templates ?? []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await apiClient.getTemplateCategories();
      // API client already returns objects with {id, name, description}
      setCategories(result.categories ?? []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Fallback to default categories
      setCategories([
        { id: 'blog-posts', name: 'Blog Posts', description: 'Templates for blog posts' },
        { id: 'academic-papers', name: 'Academic Papers', description: 'Templates for academic papers' },
        { id: 'creative-writing', name: 'Creative Writing', description: 'Templates for creative writing' },
        { id: 'business-content', name: 'Business Content', description: 'Templates for business content' },
        { id: 'technical-docs', name: 'Technical Docs', description: 'Templates for technical documentation' },
        { id: 'social-media', name: 'Social Media', description: 'Templates for social media' },
        { id: 'marketing', name: 'Marketing', description: 'Templates for marketing' },
        { id: 'custom', name: 'Custom', description: 'Custom templates' },
      ]);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name || !templateForm.category) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      await apiClient.createTemplate(templateForm);
      setSuccess('Template created successfully');
      setShowCreateModal(false);
      setTemplateForm({
        name: '',
        description: '',
        category: '',
        level: 3,
        strategy: 'auto',
        settings: {},
      });
      loadTemplates();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to create template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate || !templateForm.name || !templateForm.category) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      await apiClient.updateTemplate(selectedTemplate, templateForm);
      setSuccess('Template updated successfully');
      setShowEditModal(false);
      setSelectedTemplate(null);
      loadTemplates();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await apiClient.deleteTemplate(id);
      setSuccess('Template deleted successfully');
      loadTemplates();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to delete template');
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    setSelectedTemplate(templateId);
    setShowApplyModal(true);
  };

  const handleConfirmApply = async () => {
    if (!selectedTemplate || !applyProjectId) {
      setError('Please select a project');
      return;
    }
    try {
      await apiClient.applyTemplate(selectedTemplate, applyProjectId);
      setSuccess('Template applied successfully');
      setShowApplyModal(false);
      setApplyProjectId('');
      setSelectedTemplate(null);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to apply template');
    }
  };

  const handleExportTemplate = async (templateId: string) => {
    try {
      const result = await apiClient.exportTemplate(templateId);
      const dataStr = JSON.stringify(result.template, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template-${result.template.name.replace(/\s+/g, '-')}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess('Template exported successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to export template');
    }
  };

  const handleImportTemplate = async () => {
    try {
      const templateData = JSON.parse(importData);
      await apiClient.importTemplate({ template: templateData });
      setSuccess('Template imported successfully');
      setShowImportModal(false);
      setImportData('');
      loadTemplates();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Invalid template data or import failed');
    }
  };

  const handleShareTemplate = async () => {
    if (!selectedTemplate || !shareForm.userEmail) {
      setError('Please enter user email');
      return;
    }
    // Note: This would need user lookup by email first
    try {
      // For now, we'll use a placeholder userId
      await apiClient.shareTemplate(selectedTemplate, shareForm.userEmail);
      setSuccess('Template shared successfully');
      setShowShareModal(false);
      setShareForm({ userId: '', userEmail: '' });
      // Reload shares if modal is open
      if (showSharesModal && selectedTemplate) {
        loadTemplateShares(selectedTemplate);
      }
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to share template');
    }
  };

  const loadTemplateShares = async (templateId: string) => {
    setIsLoadingShares(true);
    try {
      const result = await apiClient.getTemplateShares(templateId);
      setTemplateShares(result.shares || []);
    } catch (err) {
      console.error('Failed to load template shares:', err);
      setError('Failed to load template shares');
    } finally {
      setIsLoadingShares(false);
    }
  };

  const handleViewShares = async (templateId: string) => {
    setSelectedTemplate(templateId);
    setShowSharesModal(true);
    await loadTemplateShares(templateId);
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to remove this share?')) return;
    try {
      await apiClient.unshareTemplate(shareId);
      setSuccess('Share removed successfully');
      if (selectedTemplate) {
        await loadTemplateShares(selectedTemplate);
      }
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to remove share');
    }
  };

  const handleRateTemplate = async (templateId: string, rating: number) => {
    try {
      await apiClient.rateTemplate(templateId, rating);
      setSuccess('Rating submitted');
      loadTemplates();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to rate template');
    }
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      await apiClient.duplicateTemplate(templateId);
      setSuccess('Template duplicated successfully');
      loadTemplates();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to duplicate template');
    }
  };

  const openEditModal = (template: typeof templates[0]) => {
    setSelectedTemplate(template.id);
    setTemplateForm({
      name: template.name,
      description: template.description,
      category: template.category,
      level: template.level,
      strategy: template.strategy as any,
      settings: {},
    });
    setShowEditModal(true);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Create, manage, and share humanization templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="btn btn-outline btn-sm"
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-outline btn-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success"><CheckCircle className="w-4 h-4 mr-2" />{success}</Alert>}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Templates Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`card p-4 hover:shadow-lg transition-shadow flex flex-col ${
                viewMode === 'list' ? 'flex-row items-center justify-between' : ''
              }`}
            >
              <div className={viewMode === 'list' ? 'flex-1' : 'flex-1'}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => handleRateTemplate(template.id, rating)}
                        className="text-yellow-400 hover:text-yellow-500"
                      >
                        <Star className={`w-4 h-4 ${rating <= 3 ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{template.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                    {template.category}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs">
                    Level {template.level}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs">
                    {template.strategy}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  Used {template.useCount} times
                </div>
              </div>
              <div className={`flex flex-wrap gap-2 ${viewMode === 'list' ? 'ml-4 flex-shrink-0' : 'mt-auto pt-2'}`}>
                <button
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setShowPreviewModal(true);
                  }}
                  className={`btn btn-primary btn-sm ${viewMode === 'list' ? '' : 'flex-1 min-w-[60px]'}`}
                  title="Preview template"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleExportTemplate(template.id)}
                  className="btn btn-outline btn-sm min-w-[40px]"
                  title="Export"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewShares(template.id)}
                  className="btn btn-outline btn-sm min-w-[40px]"
                  title="View shares"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setShowShareModal(true);
                  }}
                  className="btn btn-outline btn-sm min-w-[40px]"
                  title="Share with user"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDuplicateTemplate(template.id)}
                  className="btn btn-outline btn-sm min-w-[40px]"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditModal(template)}
                  className="btn btn-outline btn-sm min-w-[40px]"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="btn btn-outline btn-sm text-red-600 min-w-[40px]"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No templates found</p>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Create Template</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="input w-full"
                  placeholder="Template name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="input w-full h-24"
                  placeholder="Template description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Level</label>
                  <select
                    value={templateForm.level}
                    onChange={(e) => setTemplateForm({ ...templateForm, level: Number(e.target.value) })}
                    className="input w-full"
                  >
                    {[1, 2, 3, 4, 5].map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Strategy</label>
                <select
                  value={templateForm.strategy}
                  onChange={(e) => setTemplateForm({ ...templateForm, strategy: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="auto">Auto</option>
                  <option value="casual">Casual</option>
                  <option value="professional">Professional</option>
                  <option value="academic">Academic</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTemplate}
                  className="btn btn-primary"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Edit Template</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="input w-full h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="input w-full"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Level</label>
                  <select
                    value={templateForm.level}
                    onChange={(e) => setTemplateForm({ ...templateForm, level: Number(e.target.value) })}
                    className="input w-full"
                  >
                    {[1, 2, 3, 4, 5].map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Strategy</label>
                <select
                  value={templateForm.strategy}
                  onChange={(e) => setTemplateForm({ ...templateForm, strategy: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="auto">Auto</option>
                  <option value="casual">Casual</option>
                  <option value="professional">Professional</option>
                  <option value="academic">Academic</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTemplate}
                  className="btn btn-primary"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Template Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Share Template</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">User Email</label>
                <input
                  type="email"
                  value={shareForm.userEmail}
                  onChange={(e) => setShareForm({ ...shareForm, userEmail: e.target.value })}
                  className="input w-full"
                  placeholder="user@example.com"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareTemplate}
                  className="btn btn-primary"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Template Modal */}
      {showApplyModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Apply Template to Project</h2>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setApplyProjectId('');
                  setSelectedTemplate(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Project</label>
                <select
                  value={applyProjectId}
                  onChange={(e) => setApplyProjectId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {projects.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">No projects available. Create a project first.</p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setApplyProjectId('');
                    setSelectedTemplate(null);
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApply}
                  disabled={!applyProjectId}
                  className="btn btn-primary"
                >
                  Apply Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Shares Management Modal */}
      {showSharesModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Template Shares</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedTemplate(selectedTemplate);
                    setShowShareModal(true);
                  }}
                  className="btn btn-sm btn-primary"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Share
                </button>
                <button
                  onClick={() => {
                    setShowSharesModal(false);
                    setSelectedTemplate(null);
                    setTemplateShares([]);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {isLoadingShares ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : templateShares.length > 0 ? (
                <div className="space-y-3">
                  {templateShares.map((share) => (
                    <div
                      key={share.id}
                      className="card p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{share.userName || share.userEmail}</p>
                        <p className="text-sm text-gray-500">{share.userEmail}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Shared {new Date(share.sharedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveShare(share.id)}
                        className="btn btn-outline btn-sm text-red-600"
                        title="Remove share"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No shares yet</p>
                  <button
                    onClick={() => {
                      setShowShareModal(true);
                    }}
                    className="btn btn-primary btn-sm mt-4"
                  >
                    Share Template
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Template Modal */}
      {showPreviewModal && selectedTemplate && (() => {
        const template = templates.find(t => t.id === selectedTemplate);
        if (!template) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Template Preview</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      handleApplyTemplate(template.id);
                    }}
                    className="btn btn-primary btn-sm"
                    title="Apply to project"
                  >
                    Apply Template
                  </button>
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      setSelectedTemplate(null);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{template.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Category</p>
                    <p className="text-base">{template.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Level</p>
                    <p className="text-base">Level {template.level}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Strategy</p>
                    <p className="text-base capitalize">{template.strategy}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Usage</p>
                    <p className="text-base">Used {template.useCount} times</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Rating:</span>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleRateTemplate(template.id, rating)}
                      className="text-yellow-400 hover:text-yellow-500"
                    >
                      <Star className={`w-4 h-4 ${rating <= 3 ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Import Template Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Import Template</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template JSON</label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="input w-full h-64 font-mono text-sm"
                  placeholder="Paste template JSON here..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportTemplate}
                  className="btn btn-primary"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

