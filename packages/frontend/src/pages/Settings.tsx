import { useState, useEffect } from 'react';
import { Save, RotateCcw, User, Lock, CreditCard, CheckCircle, Cloud, Shield, FileText, Loader2 } from 'lucide-react';
import { useAppStore, UserSettings } from '../store';
import { KeyboardShortcutsSettings } from '../components/KeyboardShortcutsSettings';
import { AccessibilitySettings } from '../components/AccessibilitySettings';
import { useCurrentUser, useUpdateUser, useChangePassword, useSubscription } from '../api/hooks';
import { Spinner } from '../components/ui';
import { apiClient } from '../api/client';

const defaultSettings: UserSettings = {
  defaultLevel: 3,
  defaultStrategy: 'auto',
  defaultLanguage: 'en',
  darkMode: false,
  autoSave: true,
  accessibility: {
    highContrast: false,
    fontSize: 100,
    colorBlindnessMode: 'none',
    reduceMotion: false,
    screenReaderOptimized: false,
  },
};

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
];

const strategies = [
  { value: 'auto', label: 'Auto-detect', description: 'Automatically detect the best strategy based on content' },
  { value: 'casual', label: 'Casual', description: 'Conversational tone with contractions and colloquialisms' },
  { value: 'professional', label: 'Professional', description: 'Formal tone suitable for business content' },
  { value: 'academic', label: 'Academic', description: 'Scholarly language with hedging and citations' },
];

const tierLabels: Record<string, string> = {
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

export function Settings(): JSX.Element {
  const { settings, updateSettings, user, setUser } = useAppStore();
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [saved, setSaved] = useState(false);
  
  // User profile state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // API hooks
  const { data: currentUserData, isLoading: isLoadingUser } = useCurrentUser();
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useSubscription();
  const updateUserMutation = useUpdateUser();
  const changePasswordMutation = useChangePassword();
  
  // Load user data
  useEffect(() => {
    if (currentUserData?.user) {
      const nameParts = currentUserData.user.name.split(' ');
      setProfileData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: currentUserData.user.email,
      });
      if (!user) {
        setUser(currentUserData.user);
      }
    }
  }, [currentUserData, user, setUser]);

  const handleSaveSettings = (): void => {
    updateSettings(localSettings);
    
    // Apply dark mode
    document.documentElement.classList.toggle('dark', localSettings.darkMode);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleUpdateProfile = async (): Promise<void> => {
    try {
      const result = await updateUserMutation.mutateAsync({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
      });
      
      if (result.user) {
        setUser(result.user);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password. Please check your current password.');
    }
  };

  const handleReset = (): void => {
    setLocalSettings(defaultSettings);
  };

  // Cloud Storage state
  const [cloudConnections, setCloudConnections] = useState<Array<{ provider: string; email: string }>>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  
  // MFA state
  const [mfaStatus, setMfaStatus] = useState<{ enabled: boolean; methods: Array<{ type: string; enabled: boolean }> } | null>(null);
  const [isLoadingMFA, setIsLoadingMFA] = useState(false);
  const [showMFASetupModal, setShowMFASetupModal] = useState(false);
  const [mfaSetupMethod, setMfaSetupMethod] = useState<'totp' | 'sms' | null>(null);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret?: string; qrCode?: string; phoneNumber?: string } | null>(null);
  const [mfaVerificationCode, setMfaVerificationCode] = useState('');
  const [isSettingUpMFA, setIsSettingUpMFA] = useState(false);
  
  // Invoices state
  const [invoices, setInvoices] = useState<Array<{ id: string; number: string; amount: number; status: string; createdAt: string }>>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Load cloud connections
  useEffect(() => {
    const loadCloudConnections = async () => {
      setIsLoadingCloud(true);
      try {
        const result = await apiClient.getCloudConnections();
        setCloudConnections(result.connections ?? []);
      } catch (error) {
        console.error('Failed to load cloud connections:', error);
        setCloudConnections([]);
      } finally {
        setIsLoadingCloud(false);
      }
    };
    loadCloudConnections();
  }, []);

  // Load MFA status
  useEffect(() => {
    const loadMFAStatus = async () => {
      setIsLoadingMFA(true);
      try {
        const result = await apiClient.getMFAStatus();
        // Ensure methods array exists
        setMfaStatus({
          enabled: result.enabled ?? false,
          methods: result.methods ?? [],
        });
      } catch (error) {
        console.error('Failed to load MFA status:', error);
        // Set default state on error
        setMfaStatus({ enabled: false, methods: [] });
      } finally {
        setIsLoadingMFA(false);
      }
    };
    loadMFAStatus();
  }, []);

  // Load invoices
  useEffect(() => {
    const loadInvoices = async () => {
      setIsLoadingInvoices(true);
      try {
        const result = await apiClient.getInvoices();
        setInvoices(result.invoices ?? []);
      } catch (error) {
        console.error('Failed to load invoices:', error);
        setInvoices([]);
      } finally {
        setIsLoadingInvoices(false);
      }
    };
    loadInvoices();
  }, []);

  const handleConnectCloud = async (provider: string) => {
    try {
      const redirectUri = `${window.location.origin}/settings/cloud-callback`;
      const result = await apiClient.getCloudOAuthUrl(provider, redirectUri);
      window.location.href = result.url;
    } catch (error) {
      console.error('Failed to get OAuth URL:', error);
    }
  };

  const handleDisconnectCloud = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) {
      return;
    }
    try {
      await apiClient.disconnectCloudProvider(provider);
      setCloudConnections(cloudConnections.filter(c => c.provider !== provider));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      alert('Failed to disconnect cloud provider. Please try again.');
    }
  };

  const handleSetupMFA = async (method: 'totp' | 'sms') => {
    setIsSettingUpMFA(true);
    try {
      const result = await apiClient.setupMFA(method);
      setMfaSetupData(result);
      setMfaSetupMethod(method);
      setShowMFASetupModal(true);
    } catch (error) {
      console.error('Failed to setup MFA:', error);
      alert('Failed to setup MFA. Please try again.');
    } finally {
      setIsSettingUpMFA(false);
    }
  };

  const handleVerifyMFASetup = async () => {
    if (!mfaSetupMethod || !mfaVerificationCode) return;
    
    setIsSettingUpMFA(true);
    try {
      await apiClient.verifyMFASetup(mfaSetupMethod, mfaVerificationCode);
      setShowMFASetupModal(false);
      setMfaSetupData(null);
      setMfaSetupMethod(null);
      setMfaVerificationCode('');
      // Reload MFA status
      const result = await apiClient.getMFAStatus();
      setMfaStatus({
        enabled: result.enabled ?? false,
        methods: result.methods ?? [],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to verify MFA:', error);
      alert('Invalid verification code. Please try again.');
    } finally {
      setIsSettingUpMFA(false);
    }
  };

  const handleDisableMFA = async (method: 'totp' | 'sms') => {
    const code = prompt(`Enter your ${method === 'totp' ? 'authenticator' : 'SMS'} code to disable MFA:`);
    if (!code) return;
    
    try {
      await apiClient.disableMFA(method, code);
      // Reload MFA status
      const result = await apiClient.getMFAStatus();
      setMfaStatus({
        enabled: result.enabled ?? false,
        methods: result.methods ?? [],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      alert('Invalid code or failed to disable MFA. Please try again.');
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const blob = await apiClient.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download invoice:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  const hasSettingsChanges = JSON.stringify(settings) !== JSON.stringify(localSettings);
  const hasProfileChanges = currentUserData?.user && (
    profileData.firstName !== (currentUserData.user.name.split(' ')[0] || '') ||
    profileData.lastName !== (currentUserData.user.name.split(' ').slice(1).join(' ') || '') ||
    profileData.email !== currentUserData.user.email
  );

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-gradient mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Manage your account, preferences, and subscription
        </p>
      </div>

      {/* User Profile */}
      <div className="card animate-slide-up">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 to-transparent dark:from-primary-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name</label>
              <input
                type="text"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                className="input"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name</label>
              <input
                type="text"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                className="input"
                placeholder="Last name"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="input"
              placeholder="your@email.com"
            />
          </div>
          {hasProfileChanges && (
            <button
              onClick={handleUpdateProfile}
              disabled={updateUserMutation.isPending}
              className="btn btn-primary w-full sm:w-auto"
            >
              {updateUserMutation.isPending ? 'Saving...' : 'Save Profile'}
            </button>
          )}
        </div>
      </div>

      {/* Password Change */}
      <div className="card animate-slide-up">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-amber-50/30 to-transparent dark:from-amber-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Change Password</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Current Password</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              className="input"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="input"
              placeholder="Enter new password (min 8 characters)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="input"
              placeholder="Confirm new password"
            />
          </div>
          {(passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword) && (
            <button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
              className="btn btn-primary w-full sm:w-auto"
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </button>
          )}
        </div>
      </div>

      {/* Subscription */}
      {!isLoadingSubscription && subscriptionData && (
        <div className="card animate-slide-up">
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Subscription</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Plan</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tierLabels[subscriptionData.subscription.tier] || subscriptionData.subscription.tier}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                subscriptionData.subscription.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {subscriptionData.subscription.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Word Limit</p>
                <p className="text-lg font-semibold">
                  {subscriptionData.subscription.monthlyWordLimit.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Storage Limit</p>
                <p className="text-lg font-semibold">
                  {(subscriptionData.subscription.storageLimit / 1024 / 1024).toFixed(0)} MB
                </p>
              </div>
            </div>
            {subscriptionData.subscription.currentPeriodEnd && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Current period ends: {new Date(subscriptionData.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            )}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Upgrade or downgrade your subscription plan
              </p>
              <div className="flex gap-2 flex-wrap">
                {['FREE', 'BASIC', 'PRO', 'ENTERPRISE'].map((tier) => {
                  const isCurrentTier = subscriptionData.subscription.tier === tier;
                  return (
                    <button
                      key={tier}
                      onClick={async () => {
                        if (!isCurrentTier && confirm(`Are you sure you want to change to ${tier} plan?`)) {
                          try {
                            await apiClient.updateSubscription(tier);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 2000);
                            // Reload subscription data
                            window.location.reload();
                          } catch (error) {
                            console.error('Failed to update subscription:', error);
                            alert('Failed to update subscription. Please try again or contact support.');
                          }
                        }
                      }}
                      disabled={isCurrentTier}
                      className={`btn btn-sm ${
                        isCurrentTier
                          ? 'btn-primary'
                          : 'btn-outline'
                      }`}
                    >
                      {tierLabels[tier] || tier}
                      {isCurrentTier && ' (Current)'}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
                      try {
                        await apiClient.cancelSubscription();
                        setSaved(true);
                        setTimeout(() => setSaved(false), 2000);
                        window.location.reload();
                      } catch (error) {
                        console.error('Failed to cancel subscription:', error);
                        alert('Failed to cancel subscription. Please try again or contact support.');
                      }
                    }
                  }}
                  className="btn btn-outline btn-sm text-red-600 border-red-300 hover:bg-red-50"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transformation defaults */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">Transformation Defaults</h2>
        </div>
        <div className="p-4 space-y-4">
          {/* Default level */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Default Humanization Level
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="5"
                value={localSettings.defaultLevel}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, defaultLevel: Number(e.target.value) })
                }
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <span className="w-8 text-center font-medium">{localSettings.defaultLevel}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Level 1 = minimal changes, Level 5 = aggressive transformation
            </p>
          </div>

          {/* Default strategy */}
          <div>
            <label className="block text-sm font-medium mb-2">Default Strategy</label>
            <div className="space-y-2">
              {strategies.map((strategy) => (
                <label
                  key={strategy.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    localSettings.defaultStrategy === strategy.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={strategy.value}
                    checked={localSettings.defaultStrategy === strategy.value}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        defaultStrategy: e.target.value as UserSettings['defaultStrategy'],
                      })
                    }
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{strategy.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {strategy.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Default language */}
          <div>
            <label className="block text-sm font-medium mb-2">Default Language</label>
            <select
              value={localSettings.defaultLanguage}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, defaultLanguage: e.target.value })
              }
              className="input"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">Appearance</h2>
        </div>
        <div className="p-4 space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use dark theme for the interface
              </p>
            </div>
            <button
              onClick={() =>
                setLocalSettings({ ...localSettings, darkMode: !localSettings.darkMode })
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                localSettings.darkMode ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  localSettings.darkMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Editor preferences */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">Editor Preferences</h2>
        </div>
        <div className="p-4 space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-save</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automatically save drafts every 2 minutes
              </p>
            </div>
            <button
              onClick={() =>
                setLocalSettings({ ...localSettings, autoSave: !localSettings.autoSave })
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                localSettings.autoSave ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  localSettings.autoSave ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Cloud Storage */}
      <div className="card animate-slide-up">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50/30 to-transparent dark:from-blue-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cloud Storage</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connect your cloud storage accounts to import and export documents directly.
          </p>
          {isLoadingCloud ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading connections...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {['GOOGLE_DRIVE', 'DROPBOX', 'ONEDRIVE'].map((provider) => {
                const connection = cloudConnections.find(c => c.provider === provider);
                const displayName = provider === 'GOOGLE_DRIVE' ? 'Google Drive' : provider === 'ONEDRIVE' ? 'OneDrive' : 'Dropbox';
                return (
                  <div key={provider} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-medium">{displayName}</p>
                      {connection && <p className="text-sm text-gray-500">{connection.email}</p>}
                    </div>
                    {connection ? (
                      <button
                        onClick={() => handleDisconnectCloud(provider)}
                        className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectCloud(provider)}
                        className="btn btn-outline"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MFA / Two-Factor Authentication */}
      <div className="card animate-slide-up">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-green-50/30 to-transparent dark:from-green-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add an extra layer of security to your account with two-factor authentication.
          </p>
          {isLoadingMFA ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading MFA status...</span>
            </div>
          ) : mfaStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium">Authenticator App (TOTP)</p>
                  <p className="text-sm text-gray-500">Use Google Authenticator or similar</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    mfaStatus.methods?.find(m => m.type === 'totp')?.enabled
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {mfaStatus.methods?.find(m => m.type === 'totp')?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {mfaStatus.methods?.find(m => m.type === 'totp')?.enabled ? (
                    <button
                      onClick={() => handleDisableMFA('totp')}
                      className="btn btn-outline btn-sm text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSetupMFA('totp')}
                      disabled={isSettingUpMFA}
                      className="btn btn-primary btn-sm"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium">SMS Verification</p>
                  <p className="text-sm text-gray-500">Receive codes via text message</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    mfaStatus.methods?.find(m => m.type === 'sms')?.enabled
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {mfaStatus.methods?.find(m => m.type === 'sms')?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {mfaStatus.methods?.find(m => m.type === 'sms')?.enabled ? (
                    <button
                      onClick={() => handleDisableMFA('sms')}
                      className="btn btn-outline btn-sm text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSetupMFA('sms')}
                      disabled={isSettingUpMFA}
                      className="btn btn-primary btn-sm"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Unable to load MFA status</p>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="card animate-slide-up">
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-orange-50/30 to-transparent dark:from-orange-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Billing History</h2>
          </div>
        </div>
        <div className="p-6">
          {isLoadingInvoices ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading invoices...</span>
            </div>
          ) : invoices.length > 0 ? (
            <div className="space-y-2">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="font-medium">Invoice #{invoice.number}</p>
                    <p className="text-sm text-gray-500">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">${(invoice.amount / 100).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownloadInvoice(invoice.id)}
                      className="btn btn-outline btn-sm"
                      title="Download invoice"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No invoices yet</p>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <KeyboardShortcutsSettings />

      {/* Accessibility */}
      <AccessibilitySettings />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={handleReset} className="btn btn-outline flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-green-600 dark:text-green-400 text-sm flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Settings saved!
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={!hasSettingsChanges}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* MFA Setup Modal */}
      {showMFASetupModal && mfaSetupMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Setup {mfaSetupMethod === 'totp' ? 'Authenticator App' : 'SMS'} MFA</h2>
              <button
                onClick={() => {
                  setShowMFASetupModal(false);
                  setMfaSetupData(null);
                  setMfaSetupMethod(null);
                  setMfaVerificationCode('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {mfaSetupMethod === 'totp' && mfaSetupData?.qrCode && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <img src={mfaSetupData.qrCode} alt="QR Code" className="mx-auto border border-gray-200 dark:border-gray-700 rounded" />
                  {mfaSetupData.secret && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Or enter this code manually: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{mfaSetupData.secret}</code>
                    </p>
                  )}
                </div>
              )}
              {mfaSetupMethod === 'sms' && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    A verification code will be sent to your phone number.
                  </p>
                  {mfaSetupData?.phoneNumber && (
                    <p className="text-sm font-medium">Phone: {mfaSetupData.phoneNumber}</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Verification Code</label>
                <input
                  type="text"
                  value={mfaVerificationCode}
                  onChange={(e) => setMfaVerificationCode(e.target.value)}
                  className="input w-full"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowMFASetupModal(false);
                    setMfaSetupData(null);
                    setMfaSetupMethod(null);
                    setMfaVerificationCode('');
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyMFASetup}
                  disabled={isSettingUpMFA || mfaVerificationCode.length !== 6}
                  className="btn btn-primary"
                >
                  {isSettingUpMFA ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
