// src/components/Camera.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCw, Download, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface CameraProps {
  onCapture: (photo: string) => void;
  capturedImage: string | null;
  resetImage: () => void;
  label: string;
}

interface CameraPreferences {
  facingMode: 'user' | 'environment';
}

interface PhotoMetadata {
  timestamp: string;
  cameraType: string;
  orientation: number;
  latitude?: number;
  longitude?: number;
  resolution: string;
  filePath: string;
}

const CameraComponent: React.FC<CameraProps> = ({ 
  onCapture, 
  capturedImage, 
  resetImage,
  label
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [orientation, setOrientation] = useState<number>(window.screen?.orientation?.angle || 0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoMetadata, setPhotoMetadata] = useState<PhotoMetadata[]>([]);
  const [switching, setSwitching] = useState<boolean>(false);
  const [capturing, setCapturing] = useState<boolean>(false);
  const { showToast } = useToast();

  useEffect(() => {
    const savedPreferences = localStorage.getItem('cameraPreferences');
    if (savedPreferences) {
      try {
        const prefs: CameraPreferences = JSON.parse(savedPreferences);
        setFacingMode(prefs.facingMode);
      } catch (error) {
        console.error('Error parsing camera preferences:', error);
      }
    }
  }, []);

  useEffect(() => {
    const handleOrientation = () => {
      setOrientation(window.screen?.orientation?.angle || 0);
    };
    
    if (window.screen?.orientation) {
      window.addEventListener('orientationchange', handleOrientation);
      return () => window.removeEventListener('orientationchange', handleOrientation);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const getLocation = async () => {
    try {
      if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve, 
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });
      
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      console.log('📍 Location captured:', position.coords.latitude, position.coords.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const initializeCamera = async (mode: 'user' | 'environment') => {
    try {
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        }
      };

      console.log('🎥 Initializing camera with mode:', mode);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              console.log('📹 Video metadata loaded');
              resolve();
            };
          }
        });
      }
      
      setStream(mediaStream);
      setCameraActive(true);
      return true;
    } catch (error) {
      console.error('❌ Error initializing camera:', error);
      return false;
    }
  };

  const startCamera = async () => {
    try {
      console.log('🚀 Starting camera...');
      await getLocation();
      const success = await initializeCamera(facingMode);
      
      if (success) {
        showToast('Camera started successfully', 'success');
        console.log('✅ Camera started successfully');
      } else {
        throw new Error('Failed to initialize camera');
      }
    } catch (error) {
      showToast('Camera access denied or not available', 'error');
      console.error('❌ Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    console.log('🛑 Stopping camera...');
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
      setCameraActive(false);
    }
  };

  const toggleCamera = async () => {
    if (switching) return;
    
    setSwitching(true);
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    console.log('🔄 Switching camera to:', newFacingMode);

    // Stop current stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const success = await initializeCamera(newFacingMode);
      
      if (success) {
        setFacingMode(newFacingMode);
        localStorage.setItem('cameraPreferences', JSON.stringify({ facingMode: newFacingMode }));
        showToast('Camera switched successfully', 'success');
        console.log('✅ Camera switched to:', newFacingMode);
      } else {
        throw new Error('Failed to switch camera');
      }
    } catch (error) {
      showToast('Failed to switch camera', 'error');
      console.error('❌ Error switching camera:', error);
      // Try to restore previous camera
      await initializeCamera(facingMode);
    } finally {
      setSwitching(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || capturing) return;

    setCapturing(true);
    console.log('📸 Capturing photo...');

    try {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // Set canvas dimensions to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('📐 Canvas dimensions:', canvas.width, 'x', canvas.height);
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to high-quality JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        console.log('✅ Photo captured successfully');
        console.log('📊 Image data length:', dataUrl.length);
        console.log('🔗 Image preview:', dataUrl.substring(0, 50) + '...');
        
        const metadata: PhotoMetadata = {
          timestamp: new Date().toISOString(),
          cameraType: facingMode,
          orientation,
          resolution: `${canvas.width}x${canvas.height}`,
          filePath: `photo_${Date.now()}.jpg`,
        };

        if (location) {
          metadata.latitude = location.latitude;
          metadata.longitude = location.longitude;
        }

        setPhotoMetadata(prev => [...prev, metadata]);
        onCapture(dataUrl);
        stopCamera();
        showToast('Photo captured successfully', 'success');
      } else {
        throw new Error('Failed to get canvas context');
      }
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      showToast('Failed to capture photo', 'error');
    } finally {
      setCapturing(false);
    }
  };

  const exportToCSV = () => {
    try {
      const csvContent = [
        ['Timestamp', 'Camera Type', 'Orientation', 'Latitude', 'Longitude', 'Resolution', 'File Path'],
        ...photoMetadata.map(meta => [
          meta.timestamp,
          meta.cameraType,
          meta.orientation.toString(),
          meta.latitude?.toString() || '',
          meta.longitude?.toString() || '',
          meta.resolution,
          meta.filePath
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `camera-metadata-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Camera metadata exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast('Failed to export metadata', 'error');
    }
  };

  return (
    <div className="form-group">
      <label className="form-label flex items-center space-x-2">
        <Camera className="h-4 w-4" />
        <span>{label}</span>
      </label>
      
      <div className="camera-container relative">
        {capturedImage ? (
          // Photo Preview State
          <div className="relative bg-gray-100 rounded-xl overflow-hidden shadow-lg">
            <img 
              src={capturedImage} 
              alt="Captured photo" 
              className="w-full h-64 object-cover"
              onLoad={() => console.log('✅ Captured image displayed successfully')}
              onError={(e) => {
                console.error('❌ Error displaying captured image');
                console.error('🔗 Image src length:', capturedImage.length);
              }}
            />
            
            {/* Success overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="text-white text-center">
                <Check className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Photo Captured</p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="absolute top-3 right-3 flex gap-2">
              {photoMetadata.length > 0 && (
                <button 
                  onClick={exportToCSV}
                  className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors shadow-lg"
                  title="Export metadata"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={resetImage}
                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                title="Retake photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : cameraActive ? (
          // Camera Active State
          <div className="relative bg-black rounded-xl overflow-hidden shadow-lg">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              muted
              className="w-full h-64 object-cover"
            />
            
            {/* Camera info overlay */}
            <div className="absolute top-3 left-3 bg-black bg-opacity-60 text-white px-3 py-1 rounded-lg text-sm">
              📷 {facingMode === 'user' ? 'Front Camera' : 'Back Camera'}
            </div>
            
            {/* Camera controls */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center space-x-4">
              <button 
                onClick={stopCamera}
                className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                title="Stop camera"
              >
                <X className="w-5 h-5" />
              </button>
              
              <button 
                onClick={capturePhoto}
                disabled={capturing}
                className="bg-blue-500 text-white p-4 rounded-full hover:bg-blue-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                title="Capture photo"
              >
                {capturing ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </button>
              
              <button 
                onClick={toggleCamera}
                disabled={switching}
                className="bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 transition-colors shadow-lg disabled:opacity-50"
                title="Switch camera"
              >
                <RotateCw className={`w-5 h-5 ${switching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        ) : (
          // Default State - Camera Off
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Take a Photo</h3>
            <p className="text-gray-600 mb-6">Click the button below to open your camera and capture a photo</p>
            
            <button 
              onClick={startCamera}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 hover:bg-blue-700 transition-all duration-200 mx-auto font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Camera className="w-5 h-5" />
              <span>Start Camera</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraComponent;
