// src/components/AdminProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, userProfile, loading, isAuthenticated } = useAuth();

  console.log('🛡️ AdminProtectedRoute Check:', {
    loading,
    isAuthenticated,
    userProfile,
    userRole: userProfile?.role
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-red-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mb-4"></div>
        <p className="text-red-100 font-medium ml-4">Checking admin access...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    console.log('🚫 Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!userProfile) {
    console.log('🚫 No user profile found, redirecting to attendance');
    return <Navigate to="/attendance" replace />;
  }

  if (userProfile.role !== 'admin') {
    console.log('🚫 User is not admin, redirecting to attendance. Role:', userProfile.role);
    return <Navigate to="/attendance" replace />;
  }

  console.log('✅ Admin access granted');
  return <>{children}</>;
};

export default AdminProtectedRoute;
