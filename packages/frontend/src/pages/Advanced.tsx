import { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Globe,
  Share2,
  Loader2,
  Plus,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Webhook,
  Zap,
  Edit,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAppStore } from '../store';
import { Alert } from '../components/ui';

type Tab = 'scheduling' | 'collaboration' | 'localization' | 'repurposing' | 'webhooks';

export function Advanced(): JSX.Element {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('scheduling');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Scheduling state
  const [jobs, setJobs] = useState<Array<{
    id: string;
    name: string;
    status: string;
    nextExecutionAt: string;
    enabled: boolean;
  }>>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Collaboration state
  const [invitations, setInvitations] = useState<Array<{
    id: string;
    projectId: string;
    projectName: string;
    inviterEmail: string;
    role: string;
  }>>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);

  // Localization state
  const [localizeText, setLocalizeText] = useState('');
  const [sourceLocale, setSourceLocale] = useState('en');
  const [targetLocale, setTargetLocale] = useState('es');
  const [localizedResult, setLocalizedResult] = useState<string | null>(null);
  const [isLocalizing, setIsLocalizing] = useState(false);

  // Repurposing state
  const [repurposeText, setRepurposeText] = useState('');
  const [targetPlatform, setTargetPlatform] = useState<string>('twitter');
  const [repurposedResult, setRepurposedResult] = useState<{ content: string; characterCount: number } | null>(null);
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [supportedPlatforms, setSupportedPlatforms] = useState<Array<{ id: string; name: string; maxLength: number; features: string[] }>>([]);
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<Array<{
    id: string;
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
    successRate: number;
  }>>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [webhookEventTypes, setWebhookEventTypes] = useState<string[]>([]);
  const [isLoadingEventTypes, setIsLoadingEventTypes] = useState(false);
  
  // Modal states
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [showNewWebhookModal, setShowNewWebhookModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
  
  // New job form state
  const [newJobData, setNewJobData] = useState({
    name: '',
    frequency: 'daily' as 'once' | 'daily' | 'weekly' | 'monthly',
    time: '09:00',
    dayOfWeek: 1,
    dayOfMonth: 1,
    sourceType: 'text' as 'text' | 'project' | 'url',
    sourceContent: '',
    sourceProjectId: '',
    sourceUrl: '',
    level: 3,
    strategy: 'auto' as 'auto' | 'casual' | 'professional' | 'academic',
    notificationEmail: '',
  });

  const openEditJobModal = (job: typeof jobs[0]) => {
    setEditingJobId(job.id);
    setNewJobData({
      name: job.name,
      frequency: 'daily', // Default, would need to fetch actual schedule
      time: '09:00',
      dayOfWeek: 1,
      dayOfMonth: 1,
      sourceType: 'text',
      sourceContent: '',
      sourceProjectId: '',
      sourceUrl: '',
      level: 3,
      strategy: 'auto',
      notificationEmail: '',
    });
    setShowNewJobModal(true);
  };
  
  // New webhook form state
  const [newWebhookData, setNewWebhookData] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });

  // Load scheduled jobs
  useEffect(() => {
    if (activeTab === 'scheduling' && user?.id) {
      loadJobs();
    }
  }, [activeTab, user?.id]);

  // Load invitations
  useEffect(() => {
    if (activeTab === 'collaboration') {
      loadInvitations();
    }
  }, [activeTab]);

  // Load webhooks
  useEffect(() => {
    if (activeTab === 'webhooks' && user?.id) {
      loadWebhooks();
      loadWebhookEventTypes();
    }
  }, [activeTab, user?.id]);

  const loadWebhookEventTypes = async () => {
    setIsLoadingEventTypes(true);
    try {
      const result = await apiClient.getWebhookEventTypes().catch(() => null);
      if (result?.data?.eventTypes) {
        setWebhookEventTypes(result.data.eventTypes);
      } else {
        // Fallback to hardcoded list
        setWebhookEventTypes([
          'project.created',
          'project.updated',
          'transformation.completed',
          'version.created',
        ]);
      }
    } catch (err) {
      console.error('Failed to load webhook event types:', err);
      // Fallback to hardcoded list
      setWebhookEventTypes([
        'project.created',
        'project.updated',
        'transformation.completed',
        'version.created',
      ]);
    } finally {
      setIsLoadingEventTypes(false);
    }
  };

  // Load supported platforms
  useEffect(() => {
    if (activeTab === 'repurposing') {
      loadPlatforms();
    }
  }, [activeTab]);

  const loadPlatforms = async () => {
    setIsLoadingPlatforms(true);
    try {
      const result = await apiClient.getSupportedPlatforms();
      if (result?.platforms && result.platforms.length > 0) {
        setSupportedPlatforms(result.platforms);
        // Set default platform if not set
        if (!targetPlatform && result.platforms.length > 0) {
          setTargetPlatform(result.platforms[0].id);
        }
      } else {
        console.error('No platforms returned from API');
        setSupportedPlatforms([]);
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
      // Show error but don't fallback to hardcoded list
      setSupportedPlatforms([]);
    } finally {
      setIsLoadingPlatforms(false);
    }
  };

  const loadJobs = async () => {
    if (!user?.id) return;
    setIsLoadingJobs(true);
    try {
      const result = await apiClient.getScheduledJobs(user.id);
      setJobs(result.data?.jobs ?? []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const loadInvitations = async () => {
    setIsLoadingInvitations(true);
    try {
      const result = await apiClient.getMyInvitations();
      setInvitations(result.invitations ?? []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
      setInvitations([]);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const loadWebhooks = async () => {
    if (!user?.id) return;
    setIsLoadingWebhooks(true);
    try {
      const result = await apiClient.getWebhooks(user.id);
      setWebhooks(result.data?.webhooks ?? []);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
      setWebhooks([]);
    } finally {
      setIsLoadingWebhooks(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      await apiClient.deleteWebhook(webhookId);
      setWebhooks(webhooks.filter(w => w.id !== webhookId));
      setSuccess('Webhook deleted');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      const result = await apiClient.testWebhook(webhookId);
      if (result.success) {
        setSuccess(`Test sent! Status: ${result.data.statusCode}`);
      } else {
        setError(`Test failed: ${result.data.error}`);
      }
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    } catch (err) {
      setError('Failed to test webhook');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await apiClient.deleteScheduledJob(jobId);
      setJobs(jobs.filter(j => j.id !== jobId));
      setSuccess('Job deleted');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to delete job');
    }
  };

  const handleToggleJob = async (jobId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await apiClient.pauseScheduledJob(jobId);
      } else {
        await apiClient.resumeScheduledJob(jobId);
      }
      setJobs(jobs.map(j => j.id === jobId ? { ...j, enabled: !enabled } : j));
    } catch (err) {
      setError('Failed to update job');
    }
  };

  const handleAcceptInvitation = async (token: string) => {
    try {
      await apiClient.acceptInvitation(token);
      setInvitations(invitations.filter(i => i.id !== token));
      setSuccess('Invitation accepted');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (token: string) => {
    try {
      await apiClient.declineInvitation(token);
      setInvitations(invitations.filter(i => i.id !== token));
    } catch (err) {
      setError('Failed to decline invitation');
    }
  };

  const handleLocalize = async () => {
    if (!localizeText.trim()) return;
    
    // Check quota before localization
    const wordCount = localizeText.trim().split(/\s+/).length;
    try {
      const quotaCheck = await apiClient.checkQuota('words', wordCount);
      if (!quotaCheck.allowed) {
        setError(`Quota exceeded: You have ${quotaCheck.remaining.toLocaleString()} words remaining, but need ${wordCount.toLocaleString()}. Please upgrade your plan.`);
        return;
      }
      // Warn if using significant portion of remaining quota
      if (quotaCheck.remaining > 0 && wordCount > quotaCheck.remaining * 0.5) {
        if (!confirm(`Warning: You have ${quotaCheck.remaining.toLocaleString()} words remaining. This operation will use ${wordCount.toLocaleString()} words. Continue?`)) {
          return;
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('402')) {
        try {
          const errorData = JSON.parse(errorMessage);
          setError(errorData.message || 'Quota exceeded. Please upgrade your plan.');
          return;
        } catch {
          setError('Quota exceeded. Please upgrade your plan.');
          return;
        }
      }
      console.error('Failed to check quota:', err);
      // Continue with warning
      if (!confirm('Unable to check quota. Continue anyway?')) {
        return;
      }
    }
    
    setIsLocalizing(true);
    setError(null);
    try {
      const result = await apiClient.localizeContent({
        text: localizeText,
        sourceLocale,
        targetLocale,
        options: { preserveTone: true, adaptCulturally: true },
      });
      setLocalizedResult(result.data.localizedText);
    } catch (err) {
      setError('Localization failed');
    } finally {
      setIsLocalizing(false);
    }
  };

  const handleRepurpose = async () => {
    if (!repurposeText.trim()) return;
    
    // Check quota before repurposing
    const wordCount = repurposeText.trim().split(/\s+/).length;
    try {
      const quotaCheck = await apiClient.checkQuota('words', wordCount);
      if (!quotaCheck.allowed) {
        setError(`Quota exceeded: You have ${quotaCheck.remaining.toLocaleString()} words remaining, but need ${wordCount.toLocaleString()}. Please upgrade your plan.`);
        return;
      }
      // Warn if using significant portion of remaining quota
      if (quotaCheck.remaining > 0 && wordCount > quotaCheck.remaining * 0.5) {
        if (!confirm(`Warning: You have ${quotaCheck.remaining.toLocaleString()} words remaining. This operation will use ${wordCount.toLocaleString()} words. Continue?`)) {
          return;
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('402')) {
        try {
          const errorData = JSON.parse(errorMessage);
          setError(errorData.message || 'Quota exceeded. Please upgrade your plan.');
          return;
        } catch {
          setError('Quota exceeded. Please upgrade your plan.');
          return;
        }
      }
      console.error('Failed to check quota:', err);
      // Continue with warning
      if (!confirm('Unable to check quota. Continue anyway?')) {
        return;
      }
    }
    
    setIsRepurposing(true);
    setError(null);
    try {
      const result = await apiClient.repurposeContent({
        text: repurposeText,
        targetPlatform,
      });
      setRepurposedResult({
        content: result.data.repurposedContent,
        characterCount: result.data.characterCount,
      });
    } catch (err) {
      setError('Repurposing failed');
    } finally {
      setIsRepurposing(false);
    }
  };

  const tabs = [
    { id: 'scheduling' as const, label: 'Scheduling', icon: Calendar },
    { id: 'collaboration' as const, label: 'Collaboration', icon: Users },
    { id: 'localization' as const, label: 'Localization', icon: Globe },
    { id: 'repurposing' as const, label: 'Repurposing', icon: Share2 },
    { id: 'webhooks' as const, label: 'Webhooks', icon: Webhook },
  ];


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Advanced Features</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Scheduling, collaboration, localization, and content repurposing
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success"><CheckCircle className="w-4 h-4 mr-2" />{success}</Alert>}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Scheduling Tab */}
      {activeTab === 'scheduling' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Scheduled Jobs</h2>
            <button 
              onClick={() => setShowNewJobModal(true)}
              className="btn btn-primary btn-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Job
            </button>
          </div>
          {isLoadingJobs ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading jobs...</span>
            </div>
          ) : jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium">{job.name}</p>
                    <p className="text-sm text-gray-500">
                      Next run: {new Date(job.nextExecutionAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      job.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {job.enabled ? 'Active' : 'Paused'}
                    </span>
                    <button
                      onClick={() => openEditJobModal(job)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      title="Edit job"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleJob(job.id, job.enabled)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      title={job.enabled ? 'Pause' : 'Resume'}
                    >
                      {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                      title="Delete job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No scheduled jobs yet</p>
          )}
        </div>
      )}


      {/* Collaboration Tab */}
      {activeTab === 'collaboration' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Pending Invitations</h2>
          {isLoadingInvitations ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading invitations...</span>
            </div>
          ) : invitations.length > 0 ? (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium">{inv.projectName}</p>
                    <p className="text-sm text-gray-500">
                      From: {inv.inviterEmail} • Role: {inv.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptInvitation(inv.id)}
                      className="btn btn-primary btn-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(inv.id)}
                      className="btn btn-outline btn-sm"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No pending invitations</p>
          )}
        </div>
      )}

      {/* Localization Tab */}
      {activeTab === 'localization' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Content Localization</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Source Language</label>
                <select
                  value={sourceLocale}
                  onChange={(e) => setSourceLocale(e.target.value)}
                  className="input w-full"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Target Language</label>
                <select
                  value={targetLocale}
                  onChange={(e) => setTargetLocale(e.target.value)}
                  className="input w-full"
                >
                  <option value="es">Spanish</option>
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Text to Localize</label>
              <textarea
                value={localizeText}
                onChange={(e) => setLocalizeText(e.target.value)}
                placeholder="Enter text to localize..."
                className="input w-full h-32 resize-none"
              />
            </div>
            <button
              onClick={handleLocalize}
              disabled={isLocalizing || !localizeText.trim()}
              className="btn btn-primary w-full"
            >
              {isLocalizing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Localizing...</>
              ) : (
                <><Globe className="w-4 h-4 mr-2" />Localize Content</>
              )}
            </button>
            {localizedResult && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium mb-2">Localized Result:</p>
                <p className="text-gray-700 dark:text-gray-300">{localizedResult}</p>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Repurposing Tab */}
      {activeTab === 'repurposing' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Content Repurposing</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Target Platform</label>
              <select
                value={targetPlatform}
                onChange={(e) => setTargetPlatform(e.target.value)}
                className="input w-full"
                disabled={isLoadingPlatforms}
              >
                {isLoadingPlatforms ? (
                  <option>Loading platforms...</option>
                ) : supportedPlatforms.length > 0 ? (
                  supportedPlatforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.name} {platform.maxLength > 0 ? `(${platform.maxLength.toLocaleString()} chars)` : ''}
                    </option>
                  ))
                ) : (
                  <option disabled>Failed to load platforms. Please refresh the page.</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Original Content</label>
              <textarea
                value={repurposeText}
                onChange={(e) => setRepurposeText(e.target.value)}
                placeholder="Paste your content to repurpose..."
                className="input w-full h-32 resize-none"
              />
            </div>
            <button
              onClick={handleRepurpose}
              disabled={isRepurposing || !repurposeText.trim()}
              className="btn btn-primary w-full"
            >
              {isRepurposing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Repurposing...</>
              ) : (
                <><Share2 className="w-4 h-4 mr-2" />Repurpose for {targetPlatform}</>
              )}
            </button>
            {repurposedResult && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Repurposed Content:</p>
                  <span className="text-xs text-gray-500">{repurposedResult.characterCount} characters</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{repurposedResult.content}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(repurposedResult.content)}
                  className="btn btn-outline btn-sm mt-3"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Webhooks</h2>
            <button 
              onClick={() => setShowNewWebhookModal(true)}
              className="btn btn-primary btn-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Webhook
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Receive real-time notifications when events occur in your account.
          </p>
          {isLoadingWebhooks ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading webhooks...</span>
            </div>
          ) : webhooks.length > 0 ? (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Webhook className="w-4 h-4 text-gray-500" />
                      <p className="font-medium">{webhook.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      webhook.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {webhook.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2 truncate">{webhook.url}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 3).map((event) => (
                        <span key={event} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          {event}
                        </span>
                      ))}
                      {webhook.events.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          +{webhook.events.length - 3} more
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{Math.round(webhook.successRate)}% success</span>
                    <button
                      onClick={() => {
                        setEditingWebhookId(webhook.id);
                        setNewWebhookData({
                          name: webhook.name,
                          url: webhook.url,
                          events: webhook.events,
                        });
                        setShowNewWebhookModal(true);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      title="Edit webhook"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleTestWebhook(webhook.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      title="Test webhook"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                      title="Delete webhook"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No webhooks configured yet</p>
          )}
        </div>
      )}

      {/* New Job Modal */}
      {showNewJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">{editingJobId ? 'Edit Scheduled Job' : 'Create Scheduled Job'}</h2>
              <button
                onClick={() => {
                  setShowNewJobModal(false);
                  setEditingJobId(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Job Name</label>
                <input
                  type="text"
                  value={newJobData.name}
                  onChange={(e) => setNewJobData({ ...newJobData, name: e.target.value })}
                  className="input w-full"
                  placeholder="My Scheduled Job"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Frequency</label>
                  <select
                    value={newJobData.frequency}
                    onChange={(e) => setNewJobData({ ...newJobData, frequency: e.target.value as any })}
                    className="input w-full"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <input
                    type="time"
                    value={newJobData.time}
                    onChange={(e) => setNewJobData({ ...newJobData, time: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Level</label>
                  <select
                    value={newJobData.level}
                    onChange={(e) => setNewJobData({ ...newJobData, level: Number(e.target.value) })}
                    className="input w-full"
                  >
                    {[1, 2, 3, 4, 5].map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Strategy</label>
                  <select
                    value={newJobData.strategy}
                    onChange={(e) => setNewJobData({ ...newJobData, strategy: e.target.value as any })}
                    className="input w-full"
                  >
                    <option value="auto">Auto</option>
                    <option value="casual">Casual</option>
                    <option value="professional">Professional</option>
                    <option value="academic">Academic</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Source Type</label>
                <select
                  value={newJobData.sourceType}
                  onChange={(e) => setNewJobData({ ...newJobData, sourceType: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="text">Text</option>
                  <option value="project">Project</option>
                  <option value="url">URL</option>
                </select>
              </div>
              {newJobData.sourceType === 'text' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    value={newJobData.sourceContent}
                    onChange={(e) => setNewJobData({ ...newJobData, sourceContent: e.target.value })}
                    className="input w-full h-32"
                    placeholder="Enter text to humanize..."
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Notification Email</label>
                <input
                  type="email"
                  value={newJobData.notificationEmail}
                  onChange={(e) => setNewJobData({ ...newJobData, notificationEmail: e.target.value })}
                  className="input w-full"
                  placeholder="email@example.com"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNewJobModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!user?.id || !newJobData.name || !newJobData.notificationEmail) {
                      setError('Please fill in all required fields');
                      return;
                    }
                    try {
                      if (editingJobId) {
                        // Update existing job
                        await apiClient.updateScheduledJob(editingJobId, {
                          name: newJobData.name,
                          schedule: {
                            frequency: newJobData.frequency,
                            time: newJobData.time,
                            dayOfWeek: newJobData.frequency === 'weekly' ? newJobData.dayOfWeek : undefined,
                            dayOfMonth: newJobData.frequency === 'monthly' ? newJobData.dayOfMonth : undefined,
                          },
                          settings: {
                            level: newJobData.level,
                            strategy: newJobData.strategy,
                          },
                        });
                        setSuccess('Scheduled job updated');
                      } else {
                        // Create new job
                        await apiClient.createScheduledJob({
                          name: newJobData.name,
                          userId: user.id,
                          schedule: {
                            frequency: newJobData.frequency,
                            time: newJobData.time,
                            dayOfWeek: newJobData.frequency === 'weekly' ? newJobData.dayOfWeek : undefined,
                            dayOfMonth: newJobData.frequency === 'monthly' ? newJobData.dayOfMonth : undefined,
                          },
                          source: {
                            type: newJobData.sourceType,
                            content: newJobData.sourceType === 'text' ? newJobData.sourceContent : undefined,
                            projectId: newJobData.sourceType === 'project' ? newJobData.sourceProjectId : undefined,
                            url: newJobData.sourceType === 'url' ? newJobData.sourceUrl : undefined,
                          },
                          settings: {
                            level: newJobData.level,
                            strategy: newJobData.strategy,
                          },
                          notificationEmail: newJobData.notificationEmail,
                        });
                        setSuccess('Scheduled job created');
                      }
                      setShowNewJobModal(false);
                      setEditingJobId(null);
                      setNewJobData({
                        name: '',
                        frequency: 'daily',
                        time: '09:00',
                        dayOfWeek: 1,
                        dayOfMonth: 1,
                        sourceType: 'text',
                        sourceContent: '',
                        sourceProjectId: '',
                        sourceUrl: '',
                        level: 3,
                        strategy: 'auto',
                        notificationEmail: '',
                      });
                      loadJobs();
                      setTimeout(() => setSuccess(null), 2000);
                    } catch (err) {
                      setError('Failed to save scheduled job');
                    }
                  }}
                  className="btn btn-primary"
                >
                  {editingJobId ? 'Update Job' : 'Create Job'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Webhook Modal */}
      {showNewWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">{editingWebhookId ? 'Edit Webhook' : 'Create Webhook'}</h2>
              <button
                onClick={() => {
                  setShowNewWebhookModal(false);
                  setEditingWebhookId(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Webhook Name</label>
                <input
                  type="text"
                  value={newWebhookData.name}
                  onChange={(e) => setNewWebhookData({ ...newWebhookData, name: e.target.value })}
                  className="input w-full"
                  placeholder="My Webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Webhook URL</label>
                <input
                  type="url"
                  value={newWebhookData.url}
                  onChange={(e) => setNewWebhookData({ ...newWebhookData, url: e.target.value })}
                  className="input w-full"
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Events</label>
                <div className="space-y-2">
                  {isLoadingEventTypes ? (
                    <div className="text-sm text-gray-500">Loading event types...</div>
                  ) : webhookEventTypes.length > 0 ? (
                    webhookEventTypes.map(event => (
                      <label key={event} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newWebhookData.events.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWebhookData({ ...newWebhookData, events: [...newWebhookData.events, event] });
                            } else {
                              setNewWebhookData({ ...newWebhookData, events: newWebhookData.events.filter(e => e !== event) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{event}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No event types available</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNewWebhookModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!user?.id || !newWebhookData.name || !newWebhookData.url || newWebhookData.events.length === 0) {
                      setError('Please fill in all required fields');
                      return;
                    }
                    try {
                      if (editingWebhookId) {
                        // Update existing webhook
                        await apiClient.updateWebhook(editingWebhookId, {
                          name: newWebhookData.name,
                          url: newWebhookData.url,
                          events: newWebhookData.events,
                        });
                        setSuccess('Webhook updated');
                      } else {
                        // Create new webhook
                        await apiClient.createWebhook({
                          userId: user.id,
                          name: newWebhookData.name,
                          url: newWebhookData.url,
                          events: newWebhookData.events,
                        });
                        setSuccess('Webhook created');
                      }
                      setShowNewWebhookModal(false);
                      setEditingWebhookId(null);
                      setNewWebhookData({
                        name: '',
                        url: '',
                        events: [],
                      });
                      loadWebhooks();
                      setTimeout(() => setSuccess(null), 2000);
                    } catch (err) {
                      setError('Failed to save webhook');
                    }
                  }}
                  className="btn btn-primary"
                >
                  {editingWebhookId ? 'Update Webhook' : 'Create Webhook'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
