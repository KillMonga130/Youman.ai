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
  const isCyberpunk = settings.cyberpunkTheme;

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
    <div className={`min-h-screen flex items-center justify-center px-4 relative overflow-hidden ${
      isCyberpunk ? 'bg-black' : 'bg-white dark:bg-black'
    }`}>
      {isCyberpunk && (
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            background: `radial-gradient(circle at 20% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
                          radial-gradient(circle at 80% 80%, rgba(0, 255, 255, 0.1) 0%, transparent 50%)`
          }} />
        </div>
      )}
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          {!logoError && (
            <div className="flex justify-center mb-4">
              <img 
                src="/images/logo-1.png" 
                alt="Youman.ai Logo" 
                className={`h-16 w-auto object-contain ${
                  isCyberpunk ? 'glow-cyan' : ''
                }`}
                onError={() => setLogoError(true)}
              />
            </div>
          )}
          <h1 className={`text-4xl font-bold text-gradient mb-2 ${
            isCyberpunk 
              ? 'text-glow-white font-sans' 
              : 'font-serif tracking-wide'
          }`}>Youman.ai</h1>
          <p className={`mt-2 text-sm ${
            isCyberpunk 
              ? 'text-cyan-400/80 font-mono' 
              : 'text-gray-600 dark:text-gray-400 font-sans tracking-widest uppercase'
          }`}>
            {isLogin ? 'SIGN IN TO YOUR ACCOUNT' : 'CREATE A NEW ACCOUNT'}
          </p>
        </div>

        <div className="card p-8">
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
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
              className="w-full"
              disabled={loginMutation.isPending || registerMutation.isPending || isOAuthLoading}
              leftIcon={isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            >
              {loginMutation.isPending || registerMutation.isPending
                ? 'Please wait...'
                : isLogin
                ? 'Sign In'
                : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${isCyberpunk ? 'bg-black text-cyan-400' : 'bg-white dark:bg-black text-gray-500 dark:text-gray-400'}`}>
                  Or continue with
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
              className={`text-sm hover:underline ${
                isCyberpunk 
                  ? 'text-cyan-400 hover:text-cyan-300 font-mono' 
                  : 'text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 font-sans tracking-wide'
              }`}
            >
              {isLogin ? "DON'T HAVE AN ACCOUNT? SIGN UP" : 'ALREADY HAVE AN ACCOUNT? SIGN IN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

