import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface LocationFetcherProps {
  onLocationChange: (location: { latitude: number; longitude: number } | null) => void;
}

const LocationFetcher: React.FC<LocationFetcherProps> = ({ onLocationChange }) => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      showToast('Geolocation is not supported', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setLocation(newLocation);
        onLocationChange(newLocation);
        setLoading(false);
        showToast('Location captured successfully', 'success');
      },
      (error) => {
        console.error('Error getting location:', error);
        setError('Unable to retrieve your location. Please ensure location services are enabled.');
        setLoading(false);
        onLocationChange(null);
        showToast('Failed to capture location', 'error');
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="form-group">
      <label className="form-label">Current Location</label>
      <div className="bg-white rounded-md border border-gray-300 p-4">
        {location ? (
          <div className="animate-fadeIn">
            <div className="flex items-center space-x-2 text-green-600 mb-2">
              <MapPin className="w-5 h-5" />
              <span className="font-medium">Location captured successfully</span>
            </div>
            <div className="text-sm text-gray-600">
              <p>Latitude: {location.latitude.toFixed(6)}</p>
              <p>Longitude: {location.longitude.toFixed(6)}</p>
            </div>
            <button 
              onClick={fetchLocation}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh location
            </button>
          </div>
        ) : error ? (
          <div className="text-red-500 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p>{error}</p>
              <button 
                onClick={fetchLocation}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={fetchLocation}
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Capturing location...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Capture Current Location</span>
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationFetcher;