import { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, isAllowedEmail, type User } from '../firebase';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && isAllowedEmail(currentUser.email)) {
        setUser(currentUser);
        setError(null);
      } else if (currentUser && !isAllowedEmail(currentUser.email)) {
        setUser(null);
        setError('Access denied. Your email is not authorized.');
        signOut(auth);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const currentUser = result.user;

      if (!isAllowedEmail(currentUser.email)) {
        setError('Access denied. Your email is not authorized.');
        await signOut(auth);
        setUser(null);
      } else {
        setUser(currentUser);
      }
    } catch (err: any) {
      const code = err?.code || '';
      const message = err?.message || 'Unknown error';
      console.error('Sign in error:', err);

      if (code.includes('popup') || code.includes('blocked')) {
        setError('Popup was blocked. Please allow popups for this site and try again.');
      } else if (code.includes('auth/')) {
        setError(`Authentication error (${code}). Please make sure Google Sign-In is enabled in Firebase Console.`);
      } else {
        setError(`Failed to sign in: ${message}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-white">Wealth & Tax Planner</h1>
            <p className="text-sm text-slate-400">Retirement Planning Suite</p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-xs text-slate-400 text-center">
              Sign in with your Google account to access the application.
            </p>
            <p className="text-[10px] text-slate-500 text-center">
              Note: Please allow popups for this site if prompted by your browser.
            </p>

            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.03 2.53-2.18 3.3v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.08z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            Authorized access only. Contact administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
