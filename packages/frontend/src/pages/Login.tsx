import { useState, useEffect } from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLogin, useRegister } from '../api/hooks';
import { useAppStore } from '../store';
import { Button, Input, Alert } from '../components/ui';
import { apiClient } from '../api/client';

export function Login(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, settings } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const provider = searchParams.get('provider') as 'GOOGLE' | 'GITHUB' | null;
    const state = searchParams.get('state');

    if (code && provider) {
      handleOAuthCallback(provider, code);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (provider: 'GOOGLE' | 'GITHUB', code: string) => {
    try {
      setIsOAuthLoading(true);
      const redirectUri = `${window.location.origin}${window.location.pathname}?provider=${provider}`;
      const result = await apiClient.oauthCallback(provider, code, redirectUri);
      setUser(result.user);
      navigate('/');
    } catch (err: unknown) {
      let errorMessage = 'OAuth authentication failed. Please try again.';
      if (err instanceof Error) {
        try {
          const errorData = JSON.parse(err.message);
          errorMessage = errorData.message || err.message;
        } catch {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsOAuthLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'GOOGLE' | 'GITHUB') => {
    try {
      setIsOAuthLoading(true);
      const redirectUri = `${window.location.origin}${window.location.pathname}?provider=${provider}`;
      const { url } = await apiClient.getOAuthUrl(provider, redirectUri);
      window.location.href = url;
    } catch (err: unknown) {
      let errorMessage = 'Failed to initiate OAuth login. Please try again.';
      if (err instanceof Error) {
        try {
          const errorData = JSON.parse(err.message);
          errorMessage = errorData.message || err.message;
        } catch {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      setIsOAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isLogin) {
        const result = await loginMutation.mutateAsync({ email, password });
        setUser(result.user);
        navigate('/');
      } else {
        const result = await registerMutation.mutateAsync({ email, password, name });
        setUser(result.user);
        // Mark that user just registered so welcome notification can be shown
        sessionStorage.setItem('just-registered', 'true');
        navigate('/');
      }
    } catch (err: unknown) {
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (err instanceof Error) {
        // Try to extract detailed error message
        try {
          const errorData = JSON.parse(err.message);
          if (errorData.details) {
            // Format validation errors
            const details = Object.entries(errorData.details)
              .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
              .join('; ');
            errorMessage = details || errorData.message || errorMessage;
          } else {
            errorMessage = errorData.message || err.message;
          }
        } catch {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950 relative overflow-hidden">
      {/* Spooky background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          {!logoError && (
            <div className="flex justify-center mb-6">
              <img 
                src="/images/logo-1.png" 
                alt="The Necromancer's Quill" 
                className="h-16 w-auto object-contain"
                onError={() => setLogoError(true)}
              />
            </div>
          )}
          <h1 className="text-3xl font-display text-glow-purple mb-2">The Necromancer's Quill</h1>
          <p className="text-sm text-gray-400">
            {isLogin ? 'Enter the crypt to continue your rituals' : 'Bind your soul to begin'}
          </p>
        </div>

        <div className="card p-8 border-primary-900/30 bg-gray-900/80 backdrop-blur-sm">
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                  Soul Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  placeholder="What shall we call you?"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Spirit Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Secret Incantation
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full btn-resurrection"
              disabled={loginMutation.isPending || registerMutation.isPending || isOAuthLoading}
              leftIcon={isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            >
              {loginMutation.isPending || registerMutation.isPending
                ? 'Summoning...'
                : isLogin
                ? 'Enter the Crypt'
                : 'Bind Your Soul'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-500">
                  Or summon via
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthLogin('GOOGLE')}
                disabled={isOAuthLoading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthLogin('GITHUB')}
                disabled={isOAuthLoading}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                </svg>
                GitHub
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              {isLogin ? "No soul bound yet? Create one" : 'Already bound? Enter the crypt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

