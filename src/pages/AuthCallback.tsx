// src/pages/AuthCallback.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        setIsProcessing(true);
        
        // Get URL parameters first to check for errors
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          console.error('❌ OAuth error from URL:', error, errorDescription);
          showToast(`Authentication error: ${errorDescription || error}`, 'error');
          navigate('/login');
          return;
        }
        
        // Handle OAuth callback and get session
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('❌ Auth session error:', authError);
          showToast('Authentication failed. Please try again.', 'error');
          navigate('/login');
          return;
        }
        
        if (!authData.session) {
          console.log('❌ No session found after OAuth');
          showToast('No session found. Please try logging in again.', 'error');
          navigate('/login');
          return;
        }
        
        const user = authData.session.user;
        console.log('✅ Session found for user:', user.email);
        
        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, full_name, username, active')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          showToast('Error fetching user profile', 'error');
          navigate('/login');
          return;
        }
          
        // Create profile if doesn't exist
        if (!profile) {
          console.log('📝 Creating new user profile...');
          
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              username: user.user_metadata?.preferred_username || user.email?.split('@')[0] || '',
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
              role: 'user',
              active: true,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (insertError) {
            console.error('❌ Profile creation error:', insertError);
            showToast('Error creating user profile', 'error');
            navigate('/login');
            return;
          }
          
          console.log('✅ Profile created successfully:', newProfile);
          showToast('Welcome! Your account has been created.', 'success');
          navigate('/attendance');
          return;
        }
        
        // Check if account is active
        if (!profile.active) {
          console.log('❌ Account is deactivated');
          showToast('Your account has been deactivated. Please contact admin.', 'error');
          await supabase.auth.signOut();
          navigate('/login');
          return;
        }
        
        // Handle existing user
        const displayName = profile.username || profile.full_name || user.email;
        console.log('✅ Existing profile found:', displayName);
        showToast(`Welcome back, ${displayName}!`, 'success');
        
        // Route based on role
        if (profile.role === 'admin') {
          console.log('👑 Admin user detected, redirecting to admin dashboard');
          navigate('/admin-dashboard');
        } else {
          console.log('👤 Regular user detected, redirecting to attendance');
          navigate('/attendance');
        }
        
      } catch (err) {
        console.error('❌ Auth callback error:', err);
        showToast('Authentication failed. Please try again.', 'error');
        navigate('/login');
      } finally {
        setIsProcessing(false);
      }
    };
    
    // Run immediately, no delay needed
    handleAuthCallback();
  }, [navigate, showToast]);
  
  if (!isProcessing) {
    return null; // Don't show anything after processing
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white/80"></div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Completing Sign In</h2>
            <p className="text-blue-200">Please wait while we set up your account...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
