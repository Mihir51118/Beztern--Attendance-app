// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, UserCheck, Lock, AtSign, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ identifier?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Check for verification status from signup flow
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const verificationStatus = params.get('verified');
    
    if (verificationStatus === 'pending') {
      showToast('Please check your email to verify your account before logging in.', 'info');
    } else if (verificationStatus === 'success') {
      showToast('Email verified successfully! You can now log in.', 'success');
    }
  }, [location, showToast]);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking for existing session...");
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          console.log("Active session found for user:", data.session.user.id);
          
          // Check user role and redirect accordingly
          const { data: userData, error } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', data.session.user.id)
            .single();
          
          if (error) {
            console.error('Error fetching user role:', error);
            showToast('Failed to retrieve user role', 'error');
            navigate('/attendance');
            return;
          }
          
          console.log("User data from profiles:", userData);
          
          // Redirect based on role
          if (userData && userData.role === 'admin') {
            console.log("Admin user detected, redirecting to admin dashboard");
            showToast(`Welcome back, Admin ${userData.full_name || ''}!`, 'success');
            navigate('/admin-dashboard');
          } else {
            console.log("Regular user detected, redirecting to attendance");
            showToast(`Welcome back, ${userData?.full_name || ''}!`, 'success');
            navigate('/attendance');
          }
        } else {
          console.log("No active session found");
        }
      } catch (err) {
        console.error("Session check error:", err);
      }
    };
    
    checkSession();
  }, [showToast, navigate]);

  const validateForm = (): boolean => {
    const errors: { identifier?: string; password?: string } = {};
    
    if (!identifier.trim()) {
      errors.identifier = 'Email, phone number, or username is required';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Function to find email from username or phone
  const findUserEmail = async (identifier: string): Promise<string | null> => {
    try {
      // Check if it's already an email
      const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
      if (isEmail) {
        return identifier;
      }

      // Look up user by username or phone in profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('email')
        .or(`username.eq.${identifier},phone.eq.${identifier}`)
        .maybeSingle();

      if (error) {
        console.error('Error looking up user:', error);
        return null;
      }

      if (profile && profile.email) {
        console.log('Found user email for identifier:', identifier);
        return profile.email;
      }

      return null;
    } catch (error) {
      console.error('Error in findUserEmail:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      console.log(`Attempting login with identifier: ${identifier}`);
      
      // Find the actual email for the identifier
      const email = await findUserEmail(identifier.trim());
      
      if (!email) {
        showToast('User not found. Please check your credentials.', 'error');
        setLoading(false);
        return;
      }

      console.log(`Found email for identifier: ${email}`);
      
      // Authenticate with Supabase using the found email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
        options: {
          persistSession: rememberMe
        }
      });
      
      if (error) {
        console.error('Authentication error:', error);
        if (error.message.includes('Invalid login')) {
          showToast('Invalid credentials. Please check your password.', 'error');
        } else if (error.message.includes('Email not confirmed')) {
          showToast('Please verify your email before logging in. Check your inbox.', 'error');
        } else {
          showToast(error.message || 'Authentication failed', 'error');
        }
        return;
      }
      
      if (data.user) {
        console.log("Authentication successful for user ID:", data.user.id);
        
        // Fetch user role from profiles table
        const { data: userData, error: roleError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user.id)
          .single();
        
        if (roleError) {
          console.error('Error fetching user role:', roleError);
          showToast('Login successful but profile data unavailable', 'warning');
          navigate('/attendance');
          return;
        }
        
        // Show success message with user's name
        showToast(`Welcome, ${userData?.full_name || 'User'}!`, 'success');
        
        // Add delay to ensure toast is shown before redirect
        setTimeout(() => {
          if (userData && userData.role === 'admin') {
            console.log("Redirecting admin to admin dashboard");
            navigate('/admin-dashboard');
          } else {
            console.log("Redirecting user to attendance");
            navigate('/attendance');
          }
        }, 800);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showToast('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      
      if (error) throw error;
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      showToast('Failed to sign in with Google', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-white rounded-full p-3">
            <UserCheck className="h-12 w-12 text-blue-900" />
          </div>
        </div>
        <h1 className="mt-6 text-center text-3xl font-extrabold text-white">Beztern</h1>
        <h2 className="mt-2 text-center text-xl text-blue-200">Employee Management System</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* identifier */}
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                Email, Phone, or Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    formErrors.identifier ? 'border-red-500' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Enter your email, phone, or username"
                />
              </div>
              {formErrors.identifier && (
                <p className="mt-1 text-sm text-red-600">{formErrors.identifier}</p>
              )}
            </div>

            {/* password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2 border ${
                    formErrors.password ? 'border-red-500' : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Enter your password"
                />
                <div 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>

            {/* Remember me and forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm font-medium text-blue-900 hover:text-blue-800">
                Forgot password?
              </Link>
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </span>
              ) : (
                <span className="flex items-center">
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign in
                </span>
              )}
            </button>

            {/* divider */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg 
                className="h-5 w-5 mr-2" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                  fill="#4285F4"
                />
              </svg>
              Sign in with Google
            </button>

            {/* signup */}
            <p className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-blue-900 hover:text-blue-800">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
