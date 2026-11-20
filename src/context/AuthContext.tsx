import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { isFrontendSupabaseConfigured, supabaseClient } from '../lib/supabase-client';
import { UserProfile } from '../types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  supabaseUser: any | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  isSupabaseConfigured: boolean;
  signInWithGoogle: () => Promise<UserProfile | null>;
  signInWithSupabaseEmail: (email: string, pass: string) => Promise<UserProfile | null>;
  signUpWithSupabaseEmail: (email: string, pass: string, name?: string) => Promise<UserProfile | null>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    // 1. Check Supabase session first if client is available
    if (supabaseClient) {
      try {
        const { data } = await supabaseClient.auth.getSession();
        if (data?.session?.access_token) {
          return data.session.access_token;
        }
      } catch {
        // Fall through
      }
    }
    // 2. Check Firebase
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken();
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      const token = await getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!headers.has('Content-Type') && init.body) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(input, { ...init, headers });
    },
    [getAuthToken]
  );

  const syncProfile = useCallback(async (token: string | null) => {
    if (!token) {
      setProfile(null);
      return null;
    }
    try {
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

  // Sync Supabase Auth session if configured
  useEffect(() => {
    if (!supabaseClient) return;

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        setFirebaseUser({
          uid: session.user.id,
          email: session.user.email || '',
          displayName:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0] ||
            'Patient',
          photoURL: session.user.user_metadata?.avatar_url || '',
          getIdToken: async () => session.access_token,
        } as any);
        syncProfile(session.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        setFirebaseUser({
          uid: session.user.id,
          email: session.user.email || '',
          displayName:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0] ||
            'Patient',
          photoURL: session.user.user_metadata?.avatar_url || '',
          getIdToken: async () => session.access_token,
        } as any);
        await syncProfile(session.access_token);
      } else if (!auth.currentUser) {
        setSupabaseUser(null);
        setFirebaseUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  // Sync Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        const token = await user.getIdToken();
        await syncProfile(token);
      } else if (!supabaseUser) {
        setFirebaseUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [supabaseUser, syncProfile]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      setFirebaseUser(result.user);
      const token = await result.user.getIdToken();
      const prof = await syncProfile(token);
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

  const signInWithSupabaseEmail = useCallback(
    async (email: string, pass: string) => {
      setAuthError(null);
      if (!supabaseClient) {
        setAuthError('Supabase is not configured yet. Check your .env file.');
        return null;
      }
      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;
        if (data.session) {
          setSupabaseUser(data.user);
          return await syncProfile(data.session.access_token);
        }
        return null;
      } catch (err: any) {
        const msg = err?.message || 'Failed to sign in with Supabase.';
        setAuthError(msg);
        return null;
      }
    },
    [syncProfile]
  );

  const signUpWithSupabaseEmail = useCallback(
    async (email: string, pass: string, fullName?: string) => {
      setAuthError(null);
      if (!supabaseClient) {
        setAuthError('Supabase is not configured yet. Check your .env file.');
        return null;
      }
      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              full_name: fullName || email.split('@')[0],
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          setSupabaseUser(data.user);
          return await syncProfile(data.session.access_token);
        }
        return null;
      } catch (err: any) {
        const msg = err?.message || 'Failed to sign up with Supabase.';
        setAuthError(msg);
        return null;
      }
    },
    [syncProfile]
  );

  const signOutUser = useCallback(async () => {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch {
        // Ignore
      }
    }
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
    setSupabaseUser(null);
    setFirebaseUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = await getAuthToken();
    if (token) {
      await syncProfile(token);
    }
  }, [getAuthToken, syncProfile]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        supabaseUser,
        profile,
        loading,
        authError,
        isSupabaseConfigured: isFrontendSupabaseConfigured,
        signInWithGoogle,
        signInWithSupabaseEmail,
        signUpWithSupabaseEmail,
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
