import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (data.session) {
          // Check if user exists in profiles - FIXED: Use maybeSingle() instead of single()
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role, full_name')
            .eq('id', data.session.user.id)
            .maybeSingle(); // This prevents 406 errors when no profile exists
            
          if (profileError) {
            console.error('Profile fetch error:', profileError);
            throw profileError;
          }
            
          // Create profile if doesn't exist
          if (!profile) {
            console.log('No profile found, creating new profile...');
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: data.session.user.id,
                email: data.session.user.email,
                full_name: data.session.user.user_metadata?.full_name || '',
                avatar_url: data.session.user.user_metadata?.avatar_url || '',
                role: 'user', // Default role
                active: true
              })
              .select()
              .single();
              
            if (insertError) {
              console.error('Profile creation error:', insertError);
              throw insertError;
            }
            
            console.log('Profile created successfully:', newProfile);
            showToast('Account created successfully', 'success');
            navigate('/attendance');
            return;
          }
          
          // Handle existing user
          console.log('Existing profile found:', profile);
          showToast(`Welcome back, ${profile.full_name || 'User'}!`, 'success');
          
          if (profile.role === 'admin') {
            console.log('Admin user detected, redirecting to admin dashboard');
            navigate('/admin-dashboard');
          } else {
            console.log('Regular user detected, redirecting to attendance');
            navigate('/attendance');
          }
        } else {
          // No session found
          console.log('No session found');
          showToast('Authentication failed', 'error');
          navigate('/login');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        showToast('Authentication error', 'error');
        navigate('/login');
      }
    };
    
    handleAuthCallback();
  }, [navigate, showToast]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-900 to-black">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mb-4"></div>
      <p className="text-red-100 font-medium">Completing authentication...</p>
    </div>
  );
};

export default AuthCallback;
