import { useState } from 'react';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLogin, useRegister } from '../api/hooks';
import { useAppStore } from '../store';
import { Button, Input, Alert } from '../components/ui';

export function Login(): JSX.Element {
  const navigate = useNavigate();
  const { setUser, settings } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const isCyberpunk = settings.cyberpunkTheme;

  const loginMutation = useLogin();
  const registerMutation = useRegister();

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
              disabled={loginMutation.isPending || registerMutation.isPending}
              leftIcon={isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            >
              {loginMutation.isPending || registerMutation.isPending
                ? 'Please wait...'
                : isLogin
                ? 'Sign In'
                : 'Sign Up'}
            </Button>
          </form>

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

