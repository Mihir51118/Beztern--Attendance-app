import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCw } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { nanoid } from 'nanoid';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface SecureCameraProps {
  onCapture: (photo: string, metadata: PhotoMetadata) => void;
  capturedImage: string | null;
  resetImage: () => void;
  label: string;
  requiredResolution?: {
    front: number;
    rear: number;
  };
}

interface PhotoMetadata {
  id: string;
  userId: string;
  timestamp: string;
  cameraType: 'front' | 'rear';
  resolution: string;
  originalSize: number;
  compressedSize: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

const SecureCamera: React.FC<SecureCameraProps> = ({
  onCapture,
  capturedImage,
  resetImage,
  label,
  requiredResolution = { front: 8, rear: 12 }
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const checkCameraCapabilities = async (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    const minResolution = facingMode === 'user' ? requiredResolution.front : requiredResolution.rear;
    
    const maxPixels = capabilities.width?.max! * capabilities.height?.max!;
    const megapixels = maxPixels / (1000000);
    
    if (megapixels < minResolution) {
      showToast(`Camera does not meet minimum ${minResolution}MP requirement`, 'error');
      return false;
    }
    
    return true;
  };

  const initializeCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 3840 },
          height: { ideal: 2160 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!await checkCameraCapabilities(mediaStream)) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setHasPermission(true);
      
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      showToast('Camera access denied or not available', 'error');
    }
  };

  const toggleCamera = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    await initializeCamera();
  };

  const compressImage = async (dataUrl: string): Promise<{ dataUrl: string; size: number }> => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      fileType: 'image/jpeg',
      quality: 0.85
    };

    const compressedBlob = await imageCompression(blob, options);
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      reader.onloadend = () => {
        resolve({
          dataUrl: reader.result as string,
          size: compressedBlob.size
        });
      };
      reader.readAsDataURL(compressedBlob);
    });
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !user) return;
    
    setIsCapturing(true);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      
      ctx.drawImage(videoRef.current, 0, 0);
      const originalDataUrl = canvas.toDataURL('image/jpeg', 1.0);
      
      const { dataUrl: compressedDataUrl, size: compressedSize } = await compressImage(originalDataUrl);
      
      // Get location if available
      let location;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      } catch (error) {
        console.warn('Location not available:', error);
      }

      const metadata: PhotoMetadata = {
        id: nanoid(),
        userId: user.id,
        timestamp: new Date().toISOString(),
        cameraType: facingMode === 'user' ? 'front' : 'rear',
        resolution: `${canvas.width}x${canvas.height}`,
        originalSize: originalDataUrl.length,
        compressedSize,
        location
      };

      // Trigger haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      onCapture(compressedDataUrl, metadata);
    } catch (error) {
      console.error('Error capturing photo:', error);
      showToast('Failed to capture photo', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      {capturedImage ? (
        <div className="relative w-full h-full">
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-cover"
          />
          <button
            onClick={resetImage}
            className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      ) : hasPermission ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <button
            onClick={toggleCamera}
            className="absolute top-4 right-4 bg-white/80 p-3 rounded-full hover:bg-white transition-colors"
          >
            <RotateCw className="w-6 h-6" />
          </button>
          <button
            onClick={capturePhoto}
            disabled={isCapturing}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-blue-500 hover:bg-blue-50 transition-colors"
          >
            {isCapturing && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="animate-ping absolute h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              </span>
            )}
          </button>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={initializeCamera}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-blue-600 transition-colors"
          >
            <Camera className="w-6 h-6" />
            <span>Enable Camera</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SecureCamera;