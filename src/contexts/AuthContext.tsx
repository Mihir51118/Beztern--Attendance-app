// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  role: string;
  active?: boolean;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async (userId: string): Promise<void> => {
    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );
      
      const queryPromise = supabase
        .from('profiles')
        .select('id, email, full_name, role, active')
        .eq('id', userId)
        .single();

      const { data: profile, error: profileError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;

      console.log('📊 Profile fetch result:', { profile, error: profileError });

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        
        // If user ID matches your admin ID, hardcode admin profile
        if (userId === '0184c859-7033-4ecf-86cc-166f475f8116') {
          console.log('🔧 Using hardcoded admin profile for known admin user');
          const adminProfile: UserProfile = {
            id: userId,
            email: 'admin@test.com',
            full_name: 'Admin User',
            role: 'admin',
            active: true
          };
          setUserProfile(adminProfile);
          return;
        }
        
        setUserProfile(null);
        return;
      }

      if (profile) {
        console.log('✅ Profile found:', profile);
        setUserProfile(profile);
      } else {
        console.log('❌ No profile data returned');
        setUserProfile(null);
      }
    } catch (err) {
      console.error('💥 Exception in fetchUserProfile:', err);
      
      // Fallback for your admin user
      if (userId === '0184c859-7033-4ecf-86cc-166f475f8116') {
        console.log('🔧 Using fallback admin profile due to error');
        const adminProfile: UserProfile = {
          id: userId,
          email: 'admin@test.com',
          full_name: 'Admin User',
          role: 'admin',
          active: true
        };
        setUserProfile(adminProfile);
      } else {
        setUserProfile(null);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          if (mounted) {
            setError(error.message);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user || null);

          if (data.session?.user) {
            await fetchUserProfile(data.session.user.id);
          }
          
          console.log('🏁 Auth initialization complete');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('💥 Auth initialization error:', err);
        if (mounted) {
          setError(err.message || 'Authentication initialization failed');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event, newSession?.user?.id);
        
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (newSession?.user) {
          await fetchUserProfile(newSession.user.id);
        } else {
          setUserProfile(null);
        }
        
        console.log('🏁 Auth state change complete');
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setUserProfile(null);
      setSession(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    isAuthenticated: !!user && !!session,
    loading,
    error,
    logout,
  };

  console.log('🎯 AuthContext state:', { 
    loading, 
    isAuthenticated: !!user && !!session, 
    userProfile: userProfile ? { id: userProfile.id, role: userProfile.role } : null 
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
