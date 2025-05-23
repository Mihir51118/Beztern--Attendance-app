// src/components/UserNavigation.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Calendar, MapPin, Settings } from 'lucide-react';

const UserNavigation = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!userProfile) return null;

  return (
    <nav className="bg-white shadow-md p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800">
            {userProfile.role === 'admin' ? 'Admin Panel' : 'Employee Portal'}
          </h2>
          
          {userProfile.role === 'user' && (
            <div className="flex space-x-2">
              <Link
                to="/attendance"
                className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Attendance
              </Link>
              <Link
                to="/shop-visit"
                className="flex items-center px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Shop Visit
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-gray-600">
            {userProfile.full_name} ({userProfile.role})
          </span>
          <Link
            to="/profile"
            className="flex items-center px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default UserNavigation;
