import { useState, useEffect } from 'react';
import { Save, RotateCcw, User, Lock, CreditCard, CheckCircle, Cloud, Shield, FileText, Loader2, X, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';
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

// Languages will be loaded from API

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
  
  // Locales state
  const [locales, setLocales] = useState<Array<{ code: string; name: string; nativeName: string }>>([]);
  const [isLoadingLocales, setIsLoadingLocales] = useState(false);
  
  // Billing dashboard state
  const [billingDashboard, setBillingDashboard] = useState<{
    subscription: any;
    usage: any;
    invoices: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      periodStart: string | Date;
      periodEnd: string | Date;
      paidAt: string | Date | null;
      invoiceUrl: string | null;
    }>;
    paymentMethods: Array<{
      id: string;
      type: string;
      brand: string | null;
      last4: string | null;
      expiryMonth: number | null;
      expiryYear: number | null;
      isDefault: boolean;
    }>;
  } | null>(null);
  const [subscriptionTiers, setSubscriptionTiers] = useState<Array<{
    tier: string;
    limits: any;
  }>>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [showBillingDashboard, setShowBillingDashboard] = useState(false);
  const [upgradePreview, setUpgradePreview] = useState<{
    tier: string;
    preview: {
      currentTier: string;
      newTier: string;
      priceDifference: number;
      newLimits: {
        monthlyWordLimit: number;
        monthlyApiCallLimit: number;
        storageLimit: number;
      };
    };
  } | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  // Load locales
  useEffect(() => {
    const loadLocales = async () => {
      try {
        setIsLoadingLocales(true);
        const result = await apiClient.getSupportedLocales();
        if (result?.locales && result.locales.length > 0) {
          setLocales(result.locales);
        } else {
          console.error('No locales returned from API');
          setLocales([]);
        }
      } catch (error) {
        console.error('Failed to load locales:', error);
        // Show error but don't fallback to hardcoded list
        setLocales([]);
      } finally {
        setIsLoadingLocales(false);
      }
    };
    loadLocales();
  }, []);

  // Load billing dashboard and tiers
  useEffect(() => {
    const loadBillingData = async () => {
      try {
        setIsLoadingBilling(true);
        const [dashboardResult, tiersResult] = await Promise.all([
          apiClient.getBillingDashboard().catch(() => null),
          apiClient.getSubscriptionTiers().catch(() => null),
        ]);
        if (dashboardResult?.data) {
          setBillingDashboard(dashboardResult.data);
        }
        if (tiersResult?.data) {
          setSubscriptionTiers(tiersResult.data);
        }
      } catch (error) {
        console.error('Failed to load billing data:', error);
      } finally {
        setIsLoadingBilling(false);
      }
    };
    loadBillingData();
  }, []);

  const handleSaveSettings = (): void => {
    // Get current settings from store to preserve accessibility settings that were updated directly
    const currentSettings = useAppStore.getState().settings;
    
    // Merge localSettings with current accessibility settings from store
    const settingsToSave = {
      ...localSettings,
      accessibility: currentSettings.accessibility, // Preserve accessibility settings
    };
    
    updateSettings(settingsToSave);
    
    // Apply dark mode
    document.documentElement.classList.toggle('dark', settingsToSave.darkMode);
    
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
  const [mfaSetupData, setMfaSetupData] = useState<{ 
    deviceId: string;
    method: string;
    secret?: string;
    qrCodeUrl?: string;
    phoneNumber?: string;
    verificationRequired: boolean;
  } | null>(null);
  const [mfaVerificationCode, setMfaVerificationCode] = useState('');
  const [mfaPhoneNumber, setMfaPhoneNumber] = useState('');
  const [isSettingUpMFA, setIsSettingUpMFA] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  
  // Invoices state
  const [invoices, setInvoices] = useState<Array<{ id: string; number: string; amount: number; status: string; createdAt: string }>>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const state = urlParams.get('state');

      if (error) {
        alert(`OAuth error: ${error}`);
        // Clean up URL
        window.history.replaceState({}, document.title, '/settings');
        return;
      }

      if (code && state) {
        const provider = sessionStorage.getItem('cloudProvider');
        if (provider) {
          setIsLoadingCloud(true);
          try {
            const redirectUri = `${window.location.origin}/settings/cloud-callback`;
            await apiClient.connectCloudProvider({
              provider: provider.toLowerCase(),
              code,
              redirectUri,
            });
            // Reload connections
            const result = await apiClient.getCloudConnections();
            setCloudConnections(result.connections ?? []);
            // Clean up
            sessionStorage.removeItem('cloudProvider');
            window.history.replaceState({}, document.title, '/settings');
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          } catch (error) {
            console.error('Failed to connect cloud provider:', error);
            alert('Failed to connect cloud storage. Please try again.');
            sessionStorage.removeItem('cloudProvider');
            window.history.replaceState({}, document.title, '/settings');
          } finally {
            setIsLoadingCloud(false);
          }
        }
      }
    };

    handleOAuthCallback();
  }, []);

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
      const result = await apiClient.getCloudOAuthUrl(provider.toLowerCase(), redirectUri);
      // Store provider in sessionStorage for callback handling
      sessionStorage.setItem('cloudProvider', provider);
      window.location.href = result.url;
    } catch (error: any) {
      console.error('Failed to get OAuth URL:', error);
      const errorMessage = error?.message || error?.error || 'Failed to initiate cloud storage connection.';
      if (errorMessage.includes('not configured') || errorMessage.includes('OAUTH_NOT_CONFIGURED')) {
        alert(`${errorMessage}\n\nPlease configure OAuth credentials in the backend environment variables.`);
      } else {
        alert(`Failed to initiate cloud storage connection: ${errorMessage}`);
      }
    }
  };

  const handleDisconnectCloud = async (provider: string) => {
    const displayName = provider === 'GOOGLE_DRIVE' ? 'Google Drive' : provider === 'ONEDRIVE' ? 'OneDrive' : 'Dropbox';
    if (!confirm(`Are you sure you want to disconnect ${displayName}?`)) {
      return;
    }
    try {
      await apiClient.disconnectCloudProvider(provider.toLowerCase());
      setCloudConnections(cloudConnections.filter(c => c.provider !== provider));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      alert('Failed to disconnect cloud provider. Please try again.');
    }
  };

  const handleSetupMFA = async (method: 'totp' | 'sms', phoneNumber?: string) => {
    setIsSettingUpMFA(true);
    try {
      // Generate a device name based on method
      const deviceName = method === 'totp' 
        ? `${user?.name || 'User'}'s Authenticator App`
        : `${user?.name || 'User'}'s Phone`;
      
      const result = await apiClient.setupMFA(method, deviceName, phoneNumber);
      setMfaSetupData(result);
      setMfaSetupMethod(method);
      setShowMFASetupModal(true);
      setShowPhoneInput(false);
    } catch (error) {
      console.error('Failed to setup MFA:', error);
      alert('Failed to setup MFA. Please try again.');
    } finally {
      setIsSettingUpMFA(false);
    }
  };

  const handleStartSMSSetup = () => {
    setShowPhoneInput(true);
    setMfaSetupMethod('sms');
  };

  const handleSubmitPhoneNumber = () => {
    if (!mfaPhoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }
    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(mfaPhoneNumber.replace(/[\s-()]/g, ''))) {
      alert('Please enter a valid phone number (e.g., +1234567890)');
      return;
    }
    handleSetupMFA('sms', mfaPhoneNumber);
  };

  const handleVerifyMFASetup = async () => {
    if (!mfaSetupData?.deviceId || !mfaVerificationCode) return;
    
    setIsSettingUpMFA(true);
    try {
      await apiClient.verifyMFASetup(mfaSetupData.deviceId, mfaVerificationCode);
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
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-teal-50/30 to-transparent dark:from-teal-900/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg">
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

      {/* Billing Dashboard */}
      {!isLoadingSubscription && subscriptionData && (
        <div className="card animate-slide-up">
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50/30 to-transparent dark:from-blue-900/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Billing Dashboard</h2>
              </div>
              <button
                onClick={() => setShowBillingDashboard(!showBillingDashboard)}
                className="btn btn-sm btn-outline"
              >
                {showBillingDashboard ? 'Hide' : 'Show'} Details
              </button>
            </div>
          </div>
          {showBillingDashboard && (
            <div className="p-6 space-y-6">
              {isLoadingBilling ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading billing information...</span>
                </div>
              ) : (
                <>
                  {/* Usage Summary */}
                  {billingDashboard?.usage && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Current Period Usage</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Words Used</p>
                          <p className="text-lg font-bold">
                            {billingDashboard.usage.words?.used?.toLocaleString() || 0}
                            {billingDashboard.usage.words?.limit && (
                              <span className="text-sm font-normal text-gray-500">
                                {' / ' + billingDashboard.usage.words.limit.toLocaleString()}
                              </span>
                            )}
                          </p>
                          {billingDashboard.usage.words?.percentUsed !== undefined && (
                            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  billingDashboard.usage.words.percentUsed > 90 ? 'bg-red-500' :
                                  billingDashboard.usage.words.percentUsed > 70 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(billingDashboard.usage.words.percentUsed, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">API Calls</p>
                          <p className="text-lg font-bold">
                            {billingDashboard.usage.apiCalls?.used?.toLocaleString() || 0}
                            {billingDashboard.usage.apiCalls?.limit && (
                              <span className="text-sm font-normal text-gray-500">
                                {' / ' + billingDashboard.usage.apiCalls.limit.toLocaleString()}
                              </span>
                            )}
                          </p>
                          {billingDashboard.usage.apiCalls?.percentUsed !== undefined && (
                            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  billingDashboard.usage.apiCalls.percentUsed > 90 ? 'bg-red-500' :
                                  billingDashboard.usage.apiCalls.percentUsed > 70 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(billingDashboard.usage.apiCalls.percentUsed, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Storage</p>
                          <p className="text-lg font-bold">
                            {billingDashboard.usage.storage?.used ? (billingDashboard.usage.storage.used / 1024 / 1024).toFixed(2) + ' MB' : '0 MB'}
                            {billingDashboard.usage.storage?.limit && (
                              <span className="text-sm font-normal text-gray-500">
                                {' / ' + (billingDashboard.usage.storage.limit / 1024 / 1024).toFixed(0) + ' MB'}
                              </span>
                            )}
                          </p>
                          {billingDashboard.usage.storage?.percentUsed !== undefined && (
                            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  billingDashboard.usage.storage.percentUsed > 90 ? 'bg-red-500' :
                                  billingDashboard.usage.storage.percentUsed > 70 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(billingDashboard.usage.storage.percentUsed, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Methods */}
                  {billingDashboard?.paymentMethods && billingDashboard.paymentMethods.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
                      <div className="space-y-2">
                        {billingDashboard.paymentMethods.map((method) => (
                          <div key={method.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="font-medium">
                                  {method.brand ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1) : method.type} 
                                  {method.last4 && ` •••• ${method.last4}`}
                                </p>
                                {method.expiryMonth && method.expiryYear && (
                                  <p className="text-sm text-gray-500">
                                    Expires {method.expiryMonth}/{method.expiryYear}
                                  </p>
                                )}
                              </div>
                            </div>
                            {method.isDefault && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded text-xs font-medium">
                                Default
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices */}
                  {billingDashboard?.invoices && billingDashboard.invoices.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Recent Invoices</h3>
                      <div className="space-y-2">
                        {billingDashboard.invoices.slice(0, 5).map((invoice) => (
                          <div key={invoice.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                              <p className="font-medium">Invoice #{invoice.id.slice(-8)}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-medium">
                                  {invoice.currency === 'usd' ? '$' : invoice.currency.toUpperCase() + ' '}
                                  {invoice.amount.toFixed(2)}
                                </p>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                  invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                  {invoice.status}
                                </span>
                              </div>
                              {invoice.invoiceUrl && (
                                <a
                                  href={invoice.invoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline"
                                  title="View invoice"
                                >
                                  <FileText className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tier Comparison */}
                  {subscriptionTiers.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Available Plans</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {subscriptionTiers.map((tier) => {
                          const isCurrentTier = subscriptionData?.subscription.tier === tier.tier;
                          return (
                            <div
                              key={tier.tier}
                              className={`p-4 border-2 rounded-lg ${
                                isCurrentTier
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold">{tierLabels[tier.tier] || tier.tier}</h4>
                                {isCurrentTier && (
                                  <span className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="space-y-2 text-sm">
                                <p className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Words:</span> {tier.limits?.monthlyWordLimit?.toLocaleString() || 'N/A'}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">API Calls:</span> {tier.limits?.monthlyApiCallLimit?.toLocaleString() || 'N/A'}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Storage:</span> {tier.limits?.storageLimit || 'N/A'}
                                </p>
                              </div>
                              {!isCurrentTier && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const previewResult = await apiClient.getUpgradePreview(tier.tier);
                                      setUpgradePreview({
                                        tier: tier.tier,
                                        preview: previewResult.preview,
                                      });
                                    } catch (error) {
                                      console.error('Failed to get upgrade preview:', error);
                                      alert('Failed to load upgrade preview. Please try again.');
                                    }
                                  }}
                                  className="btn btn-sm btn-outline w-full mt-3"
                                >
                                  Upgrade
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
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
              disabled={isLoadingLocales}
            >
              {isLoadingLocales ? (
                <option>Loading languages...</option>
              ) : locales.length > 0 ? (
                locales.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName || lang.name} ({lang.code})
                  </option>
                ))
              ) : (
                <option disabled>Failed to load languages. Please refresh the page.</option>
              )}
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
                      onClick={handleStartSMSSetup}
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
      <div className="card animate-slide-up">
        <AccessibilitySettings />
      </div>

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

      {/* Phone Number Input Modal for SMS */}
      {showPhoneInput && mfaSetupMethod === 'sms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Setup SMS MFA</h2>
              <button
                onClick={() => {
                  setShowPhoneInput(false);
                  setMfaSetupMethod(null);
                  setMfaPhoneNumber('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={mfaPhoneNumber}
                  onChange={(e) => setMfaPhoneNumber(e.target.value)}
                  className="input w-full"
                  placeholder="+1234567890"
                  disabled={isSettingUpMFA}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter your phone number with country code (e.g., +1234567890)
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowPhoneInput(false);
                    setMfaSetupMethod(null);
                    setMfaPhoneNumber('');
                  }}
                  className="btn btn-outline"
                  disabled={isSettingUpMFA}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPhoneNumber}
                  disabled={isSettingUpMFA || !mfaPhoneNumber.trim()}
                  className="btn btn-primary"
                >
                  {isSettingUpMFA ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Setting up...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  setMfaPhoneNumber('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {mfaSetupMethod === 'totp' && mfaSetupData?.qrCodeUrl && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <img src={mfaSetupData.qrCodeUrl} alt="QR Code" className="mx-auto border border-gray-200 dark:border-gray-700 rounded" />
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
                    A verification code has been sent to your phone number.
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
                    setMfaPhoneNumber('');
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

      {/* Upgrade Preview Modal */}
      {upgradePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Upgrade Preview</h2>
              <button
                onClick={() => setUpgradePreview(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                disabled={isUpgrading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Current vs New Tier */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Plan</p>
                  <p className="text-xl font-bold">{tierLabels[upgradePreview.preview.currentTier] || upgradePreview.preview.currentTier}</p>
                </div>
                <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">New Plan</p>
                  <p className="text-xl font-bold">{tierLabels[upgradePreview.preview.newTier] || upgradePreview.preview.newTier}</p>
                </div>
              </div>

              {/* Price Difference */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Monthly Price Difference</span>
                  <span className={`text-xl font-bold ${upgradePreview.preview.priceDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {upgradePreview.preview.priceDifference >= 0 ? '+' : ''}${upgradePreview.preview.priceDifference.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* New Limits */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">New Limits</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Words/Month</p>
                    <p className="text-lg font-bold">{upgradePreview.preview.newLimits.monthlyWordLimit.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">API Calls/Month</p>
                    <p className="text-lg font-bold">{upgradePreview.preview.newLimits.monthlyApiCallLimit.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Storage</p>
                    <p className="text-lg font-bold">{(upgradePreview.preview.newLimits.storageLimit / 1024 / 1024).toFixed(0)} MB</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setUpgradePreview(null)}
                  className="btn btn-outline"
                  disabled={isUpgrading}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsUpgrading(true);
                    try {
                      await apiClient.updateSubscription(upgradePreview.tier);
                      setUpgradePreview(null);
                      window.location.reload();
                    } catch (error) {
                      console.error('Failed to upgrade subscription:', error);
                      alert('Failed to upgrade subscription. Please try again.');
                      setIsUpgrading(false);
                    }
                  }}
                  disabled={isUpgrading}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    <>
                      Confirm Upgrade
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone - Account Deletion */}
      <div className="card animate-slide-up border-2 border-red-200 dark:border-red-900/50">
        <div className="p-6 border-b border-red-200/50 dark:border-red-900/30 bg-gradient-to-r from-red-50/30 to-transparent dark:from-red-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Danger Zone</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete Account</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </button>
            ) : (
              <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                      Are you absolutely sure?
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                      This will permanently delete your account, all projects, data, and subscriptions. 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                
                {/* Only show password field if user might have a password (not OAuth-only) */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    {user?.email ? 'Enter your password to confirm' : 'Confirm account deletion'}
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="input w-full"
                    placeholder={user?.email ? "Enter your password" : "Type DELETE to confirm"}
                    autoComplete="current-password"
                  />
                  {!user?.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      OAuth users: Type "DELETE" to confirm
                    </p>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                    }}
                    className="btn btn-outline flex-1"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('This will permanently delete your account. Are you absolutely sure?')) {
                        return;
                      }
                      
                      setIsDeleting(true);
                      try {
                        await apiClient.deleteAccount(deletePassword || undefined);
                        // Clear local storage and redirect to login
                        localStorage.clear();
                        window.location.href = '/login';
                      } catch (error: any) {
                        console.error('Failed to delete account:', error);
                        alert(error?.error || error?.message || 'Failed to delete account. Please try again.');
                        setIsDeleting(false);
                      }
                    }}
                    disabled={isDeleting}
                    className="btn bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 flex-1 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Yes, Delete My Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
