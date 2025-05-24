// src/pages/EmployeeAttendance.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Bike } from 'lucide-react';
import Layout from '../components/Layout';
import CameraComponent from '../components/Camera';
import LocationFetcher from '../components/LocationFetcher';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

const EmployeeAttendance: React.FC = () => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [kilometers, setKilometers] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ photo?: string; location?: string; kilometers?: string }>({});
  
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Guard until user is loaded
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4">Loading user info...</p>
      </div>
    );
  }

  // Get display name with priority: username > email > full_name
  const getDisplayName = () => {
    if (userProfile?.username && userProfile.username.trim()) {
      return userProfile.username;
    }
    if (user?.email && user.email.trim()) {
      return user.email;
    }
    if (userProfile?.full_name && userProfile.full_name.trim()) {
      return userProfile.full_name;
    }
    return 'User';
  };

  // Upload image to Supabase Storage
  const uploadImageToStorage = async (base64Image: string): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Convert base64 to blob
      const response = await fetch(base64Image);
      const blob = await response.blob();
      
      // Create unique filename
      const fileName = `attendance_${user.id}_${Date.now()}.jpg`;
      const filePath = `attendance/${user.id}/${fileName}`;
      
      console.log('Uploading image to Supabase Storage...');
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Image uploaded successfully:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Failed to upload image', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: { photo?: string; location?: string; kilometers?: string } = {};
    
    if (!photo) {
      errors.photo = 'Please take a photo';
    }
    
    if (!location) {
      errors.location = 'Please capture your current location';
    }
    
    if (!kilometers.trim()) {
      errors.kilometers = 'Please enter bike kilometer reading';
    } else if (isNaN(Number(kilometers)) || Number(kilometers) < 0) {
      errors.kilometers = 'Please enter a valid kilometer reading';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    setLoading(true);
    
    try {
      console.log('Submitting attendance data...');
      
      let photoUrl = photo;
      
      // Upload image to Supabase Storage if it's a base64 image
      if (photo && photo.startsWith('data:image/')) {
        console.log('Uploading base64 image to storage...');
        photoUrl = await uploadImageToStorage(photo);
        
        if (!photoUrl) {
          throw new Error('Failed to upload image');
        }
      }
      
      // Save attendance data to Supabase
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          type: 'check_in',
          location: `Lat: ${location?.latitude}, Lng: ${location?.longitude}`,
          coordinates: location,
          photo_url: photoUrl,
          notes: `Bike reading: ${kilometers} km. Employee: ${getDisplayName()}`,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Attendance saved successfully:', data);
      showToast('Attendance submitted successfully!', 'success');
      
      // Reset form
      setPhoto(null);
      setLocation(null);
      setKilometers('');
      
      // Navigate to shop visit page
      navigate('/shop-visit');
    } catch (error) {
      console.error('Error submitting attendance:', error);
      showToast('Failed to submit attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Employee Attendance">
      <div className="card animate-fadeIn">
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Employee:</strong> {getDisplayName()}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            ID: {user.id}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <CameraComponent 
            onCapture={(photoData) => setPhoto(photoData)}
            capturedImage={photo}
            resetImage={() => setPhoto(null)}
            label="Take a photo in company uniform with bike"
          />
          {formErrors.photo && <p className="error-message">{formErrors.photo}</p>}
          
          <LocationFetcher onLocationChange={setLocation} />
          {formErrors.location && <p className="error-message">{formErrors.location}</p>}
          
          <div className="form-group">
            <label htmlFor="kilometers" className="form-label">Bike Kilometer Reading</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Bike className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="kilometers"
                type="number"
                min="0"
                step="0.1"
                value={kilometers}
                onChange={(e) => setKilometers(e.target.value)}
                className={`input-field pl-10 ${formErrors.kilometers ? 'border-red-500' : ''}`}
                placeholder="Enter current bike reading (e.g., 1234.5)"
              />
            </div>
            {formErrors.kilometers && <p className="error-message">{formErrors.kilometers}</p>}
          </div>
          
          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full btn btn-primary flex justify-center items-center space-x-2"
          >
            {(loading || uploading) ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{uploading ? 'Uploading Image...' : 'Submitting...'}</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Check className="h-5 w-5" />
                <span>Submit Attendance</span>
              </span>
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default EmployeeAttendance;
