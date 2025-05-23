import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="page-container animate-fadeIn">
          <h1 className="text-3xl font-bold text-blue-900 mb-6">{title}</h1>
          {children}
        </div>
      </main>
      <footer className="bg-blue-900 text-white py-4 text-center text-sm">
        <p>© 2025 Beztern. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;