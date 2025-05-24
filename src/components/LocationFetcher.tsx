// src/components/LocationFetcher.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, AlertTriangle, RefreshCw, Smartphone, Wifi, Clock, Shield } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface LocationFetcherProps {
  onLocationChange: (location: { latitude: number; longitude: number } | null) => void;
  autoFetch?: boolean;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

const LocationFetcher: React.FC<LocationFetcherProps> = ({ 
  onLocationChange, 
  autoFetch = true 
}) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const { showToast } = useToast();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
  }, []);

  // Auto-fetch location on mount
  useEffect(() => {
    if (autoFetch) {
      fetchLocation();
    }
  }, [autoFetch]);

  const getLocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return isMobile
          ? 'Location access denied. Please enable location permissions in your browser settings and refresh the page.'
          : 'Location access denied. Please allow location access and try again.';
      case error.POSITION_UNAVAILABLE:
        return isMobile
          ? 'Location unavailable. Please check your GPS settings and ensure you have a good signal.'
          : 'Location information unavailable. Please check your network connection.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again or check your connection.';
      default:
        return 'An unknown error occurred while getting your location.';
    }
  };

  const fetchLocation = useCallback(() => {
    setLoading(true);
    setError(null);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser. Please use a modern browser.';
      setError(errorMsg);
      setLoading(false);
      showToast(errorMsg, 'error');
      onLocationChange(null);
      return;
    }

    // Check if we're on HTTPS (required for mobile)
    if (isMobile && !window.isSecureContext) {
      const errorMsg = 'Location services require HTTPS on mobile devices. Please use a secure connection.';
      setError(errorMsg);
      setLoading(false);
      showToast(errorMsg, 'error');
      onLocationChange(null);
      return;
    }

    console.log('🔄 Fetching location... (Attempt:', retryCount + 1, ')');
    console.log('📱 Mobile device:', isMobile);
    console.log('🔒 Secure context:', window.isSecureContext);

    // Mobile-optimized geolocation options
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: isMobile ? 20000 : 15000, // Longer timeout for mobile
      maximumAge: isMobile ? 30000 : 60000 // Shorter cache for mobile accuracy
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Location captured successfully:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });

        const newLocation: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };

        setLocation(newLocation);
        onLocationChange({
          latitude: newLocation.latitude,
          longitude: newLocation.longitude
        });
        setLoading(false);
        setRetryCount(0);
        showToast('Location captured successfully!', 'success');
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        const errorMessage = getLocationErrorMessage(error);
        setError(errorMessage);
        setLoading(false);
        setRetryCount(prev => prev + 1);
        onLocationChange(null);
        showToast('Failed to capture location', 'error');
      },
      options
    );
  }, [isMobile, retryCount, showToast, onLocationChange]);

  const handleRetry = () => {
    if (retryCount < 3) {
      fetchLocation();
    } else {
      showToast('Maximum retry attempts reached. Please check your settings and try again later.', 'error');
    }
  };

  const formatAccuracy = (accuracy?: number): string => {
    if (!accuracy) return 'Unknown';
    if (accuracy < 10) return 'Very High';
    if (accuracy < 50) return 'High';
    if (accuracy < 100) return 'Medium';
    return 'Low';
  };

  const getTimeElapsed = (timestamp?: number): string => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="form-group">
      <label className="form-label flex items-center space-x-2">
        <MapPin className="h-4 w-4" />
        <span>Current Location</span>
        {isMobile && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-600">
            <Smartphone className="h-3 w-3 mr-1" />
            Mobile
          </span>
        )}
      </label>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        {loading ? (
          <div className="animate-fadeIn">
            <div className="flex items-center space-x-3 mb-3">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              <div>
                <p className="font-medium text-gray-700">Capturing location...</p>
                <p className="text-sm text-gray-500">
                  {isMobile ? 'Please ensure GPS is enabled' : 'This may take a moment'}
                </p>
              </div>
            </div>
            
            {isMobile && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                <div className="flex items-center">
                  <Smartphone className="h-5 w-5 text-blue-400 mr-2" />
                  <p className="text-sm text-blue-700">
                    For best results on mobile, ensure location services are enabled and you have a good signal.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="animate-fadeIn">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-700 mb-2">Location Error</p>
                <p className="text-sm text-red-600 mb-3">{error}</p>
                
                {isMobile && !window.isSecureContext && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mb-3">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-yellow-400 mr-2" />
                      <p className="text-sm text-yellow-700">
                        <strong>HTTPS Required:</strong> Location services require a secure connection on mobile devices.
                      </p>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleRetry}
                  disabled={retryCount >= 3}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    retryCount >= 3
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>
                    {retryCount >= 3 ? 'Max retries reached' : `Try Again (${3 - retryCount} left)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : location ? (
          <div className="animate-fadeIn">
            <div className="flex items-center space-x-2 text-green-600 mb-3">
              <MapPin className="h-6 w-6" />
              <div>
                <p className="font-medium">Location captured successfully</p>
                <p className="text-sm text-gray-500">
                  Accuracy: {formatAccuracy(location.accuracy)} 
                  {location.timestamp && ` • ${getTimeElapsed(location.timestamp)}`}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Latitude:</span>
                  <span className="font-mono text-gray-900">{location.latitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Longitude:</span>
                  <span className="font-mono text-gray-900">{location.longitude.toFixed(6)}</span>
                </div>
                {location.accuracy && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accuracy:</span>
                    <span className="text-gray-900">±{Math.round(location.accuracy)}m</span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={fetchLocation}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Location</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <button
              onClick={fetchLocation}
              className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <MapPin className="h-5 w-5" />
              <span>Capture Current Location</span>
            </button>
            
            {isMobile && (
              <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-gray-500">
                <Wifi className="h-4 w-4" />
                <span>Requires location permissions & GPS</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationFetcher;
