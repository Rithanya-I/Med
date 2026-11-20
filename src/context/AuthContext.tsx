import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<UserProfile | null>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!headers.has('Content-Type') && init.body) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(input, { ...init, headers });
    },
    []
  );

  const syncProfile = useCallback(async (user: FirebaseUser | null) => {
    if (!user) {
      setProfile(null);
      return null;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to load patient profile');
      }
      const data: UserProfile = await res.json();
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error syncing user profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncProfile(user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [syncProfile]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      setFirebaseUser(result.user);
      const prof = await syncProfile(result.user);
      return prof;
    } catch (err: any) {
      const msg =
        err?.code === 'auth/popup-closed-by-user'
          ? 'Sign-in window was closed before completing.'
          : err?.message || 'Unable to sign in with Google.';
      setAuthError(msg);
      return null;
    }
  }, [syncProfile]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      await syncProfile(auth.currentUser);
    }
  }, [syncProfile]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        authError,
        signInWithGoogle,
        signOutUser,
        refreshProfile,
        authFetch,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
