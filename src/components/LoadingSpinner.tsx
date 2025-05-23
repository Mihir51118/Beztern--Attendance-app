import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-12 h-12 text-blue-900 animate-spin" />
    </div>
  );
};

export default LoadingSpinner;