// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { supabase } from './lib/supabase';

// Page imports
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyPage from './pages/VerifyPage';
import EmployeeAttendance from './pages/EmployeeAttendance';
import ShopVisit from './pages/ShopVisit';
import AdminDashboard from './pages/admindata'; 
import UserProfile from './pages/UserProfile';
import NotFoundPage from './pages/NotFoundPage';

// Component imports
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';

// Auth callback component
const AuthCallback = () => {
  const [status, setStatus] = React.useState('Processing authentication...');

  React.useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Checking session...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setStatus('Authentication failed. Redirecting to login...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          return;
        }
        
        if (data.session) {
          setStatus('Session found. Checking user role...');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', data.session.user.id)
            .single();
            
          if (profileError) {
            console.error('Profile error:', profileError);
            setStatus('User profile not found. Creating default profile...');
            
            // Create default user profile
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: data.session.user.id,
                email: data.session.user.email,
                full_name: data.session.user.user_metadata?.full_name || '',
                role: 'user' // Default role
              });
              
            if (!insertError) {
              setTimeout(() => {
                window.location.href = '/attendance';
              }, 1500);
            }
            return;
          }

          console.log('User role found:', profile?.role);
          setStatus(`Welcome ${profile?.full_name || 'User'}! Redirecting...`);
          
          setTimeout(() => {
            if (profile?.role === 'admin') {
              console.log('Redirecting admin to dashboard');
              window.location.href = '/admin-dashboard';
            } else {
              console.log('Redirecting user to attendance');
              window.location.href = '/attendance';
            }
          }, 1000);
        } else {
          setStatus('No session found. Redirecting to login...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('Authentication error. Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    };
    
    handleAuthCallback();
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-900 to-black">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mb-4"></div>
      <p className="text-red-100 font-medium">{status}</p>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-gradient-to-br from-red-950 via-black to-red-950">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              
              {/* Auth callback route */}
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Admin-only routes */}
              <Route
                path="/admin-dashboard"
                element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                }
              />

              {/* User-only routes (employees) */}
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute>
                    <EmployeeAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shop-visit"
                element={
                  <ProtectedRoute>
                    <ShopVisit />
                  </ProtectedRoute>
                }
              />
              
              {/* Profile accessible to both users and admins */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />

              {/* Fallback routes */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
