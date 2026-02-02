import { useState, useCallback } from 'react';
import { useAuthStore } from '@dardocs/editor';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { signIn, signUp, signInWithOkta, error, loading, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        if (mode === 'signup') {
          await signUp(name, email, password);
        } else {
          await signIn(email, password);
        }
      } catch {
        // error is set in the store
      }
    },
    [mode, name, email, password, signIn, signUp]
  );

  const toggleMode = useCallback(() => {
    clearError();
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
  }, [clearError]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">DarDocs</h1>
        <p className="auth-subtitle">
          {mode === 'signin'
            ? 'Sign in to your workspace'
            : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                className="auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? 'Loading...'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        {mode === 'signin' && (
          <>
            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="auth-okta-btn"
              onClick={signInWithOkta}
              disabled={loading}
            >
              Sign in with Okta
            </button>
          </>
        )}

        <p className="auth-toggle">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" className="auth-toggle-btn" onClick={toggleMode}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="auth-toggle-btn" onClick={toggleMode}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
