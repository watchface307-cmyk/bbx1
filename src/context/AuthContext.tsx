import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, username: string) => Promise<boolean>;
  guestLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserRole: (role: User['role']) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user profile from database
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUser({
            id: profile.id,
            username: profile.username,
            email: session.user.email || '',
            role: profile.role || 'user',
            joinedDate: profile.created_at
          });
        }
      } else {
        // No authenticated user - create guest user for UI functionality
        setUser({
          id: 'guest-' + crypto.randomUUID(),
          username: 'Guest User',
          email: '',
          role: 'user',
          joinedDate: new Date().toISOString()
        });
      }
      setLoading(false);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // No session - create guest user
        setUser({
          id: 'guest-' + crypto.randomUUID(),
          username: 'Guest User',
          email: '',
          role: 'user',
          joinedDate: new Date().toISOString()
        });
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return !error;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signup = async (email: string, password: string, username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error || !data.user) {
        return false;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username,
          role: 'user'
        });

      return !profileError;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const guestLogin = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      return !error && !!data.user;
    } catch (error) {
      console.error('Guest login error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    // After signout, create a new guest user
    setUser({
      id: 'guest-' + crypto.randomUUID(),
      username: 'Guest User',
      email: '',
      role: 'user',
      joinedDate: new Date().toISOString()
    });
  };

  const updateUserRole = (role: User['role']) => {
    if (user) {
      setUser({ ...user, role });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, guestLogin, logout, updateUserRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}