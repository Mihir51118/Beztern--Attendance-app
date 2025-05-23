import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, UserCheck, Store } from 'lucide-react';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <LayoutDashboard className="w-6 h-6" />
          <span className="font-bold text-xl">Beztern</span>
        </div>
        <div className="hidden md:flex items-center space-x-6">
          <NavLink to="/attendance" className={({ isActive }) => 
            `nav-link flex items-center space-x-1 ${isActive ? 'font-semibold' : ''}`
          }>
            <UserCheck className="w-5 h-5" />
            <span>Attendance</span>
          </NavLink>
          <NavLink to="/shop-visit" className={({ isActive }) => 
            `nav-link flex items-center space-x-1 ${isActive ? 'font-semibold' : ''}`
          }>
            <Store className="w-5 h-5" />
            <span>Shop Visit</span>
          </NavLink>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm hidden md:inline-block">Hello, {user?.name || 'User'}</span>
          <button 
            onClick={() => logout()} 
            className="text-white hover:text-red-200 flex items-center space-x-1"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden md:inline-block">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;