// src/pages/ShopVisit.tsx
import React, { useState } from 'react';
import { Check, Store, Mail, User, HelpCircle } from 'lucide-react';
import Layout from '../components/Layout';
import CameraComponent from '../components/Camera';
import LocationFetcher from '../components/LocationFetcher';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

const ShopVisit: React.FC = () => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [shopName, setShopName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [ownerEmail, setOwnerEmail] = useState<string>('');
  const [visitSuccessful, setVisitSuccessful] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{
    photo?: string;
    location?: string;
    shopName?: string;
    ownerName?: string;
    ownerEmail?: string;
    visitSuccessful?: string;
  }>({});
  
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();

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
      const fileName = `shop_visit_${user.id}_${Date.now()}.jpg`;
      const filePath = `shop-visits/${user.id}/${fileName}`;
      
      console.log('Uploading shop visit image to Supabase Storage...');
      
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

      console.log('Shop visit image uploaded successfully:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Error uploading shop visit image:', error);
      showToast('Failed to upload image', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: {
      photo?: string;
      location?: string;
      shopName?: string;
      ownerName?: string;
      ownerEmail?: string;
      visitSuccessful?: string;
    } = {};
    
    if (!photo) {
      errors.photo = 'Please take a photo of the shop';
    }
    
    if (!location) {
      errors.location = 'Please capture your current location';
    }
    
    if (!shopName.trim()) {
      errors.shopName = 'Shop name is required';
    }
    
    if (!ownerName.trim()) {
      errors.ownerName = 'Shop owner name is required';
    }
    
    if (!ownerEmail.trim()) {
      errors.ownerEmail = 'Shop owner email is required';
    } else if (!/\S+@\S+\.\S+/.test(ownerEmail)) {
      errors.ownerEmail = 'Please enter a valid email address';
    }
    
    if (!visitSuccessful) {
      errors.visitSuccessful = 'Please select an option';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    setLoading(true);
    
    try {
      console.log('Submitting shop visit data...');
      
      let photoUrl = photo;
      
      // Upload image to Supabase Storage if it's a base64 image
      if (photo && photo.startsWith('data:image/')) {
        console.log('Uploading base64 image to storage...');
        photoUrl = await uploadImageToStorage(photo);
        
        if (!photoUrl) {
          throw new Error('Failed to upload image');
        }
      }
      
      // Save shop visit data to Supabase
      const { data, error } = await supabase
        .from('shop_visits')
        .insert({
          user_id: user.id,
          shop_name: shopName,
          location: `Lat: ${location?.latitude}, Lng: ${location?.longitude}`,
          coordinates: location,
          photos: photoUrl ? [photoUrl] : [],
          notes: `Employee: ${getDisplayName()}. Owner: ${ownerName} (${ownerEmail}). Visit successful: ${visitSuccessful}. Additional notes: ${notes}`,
          visit_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Shop visit saved successfully:', data);
      showToast('Shop visit data submitted successfully!', 'success');
      
      // Reset form
      setPhoto(null);
      setLocation(null);
      setShopName('');
      setOwnerName('');
      setOwnerEmail('');
      setVisitSuccessful('');
      setNotes('');
    } catch (error) {
      console.error('Error submitting shop visit:', error);
      showToast('Failed to submit shop visit data', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Shop Visit Verification">
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
            label="Take a photo of the shop"
          />
          {formErrors.photo && <p className="error-message">{formErrors.photo}</p>}
          
          <LocationFetcher onLocationChange={setLocation} />
          {formErrors.location && <p className="error-message">{formErrors.location}</p>}
          
          <div className="form-group">
            <label htmlFor="shopName" className="form-label">Shop Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Store className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="shopName"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className={`input-field pl-10 ${formErrors.shopName ? 'border-red-500' : ''}`}
                placeholder="Enter shop name"
              />
            </div>
            {formErrors.shopName && <p className="error-message">{formErrors.shopName}</p>}
          </div>
          
          <div className="form-group">
            <label htmlFor="ownerName" className="form-label">Shop Owner Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="ownerName"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className={`input-field pl-10 ${formErrors.ownerName ? 'border-red-500' : ''}`}
                placeholder="Enter shop owner name"
              />
            </div>
            {formErrors.ownerName && <p className="error-message">{formErrors.ownerName}</p>}
          </div>
          
          <div className="form-group">
            <label htmlFor="ownerEmail" className="form-label">Shop Owner Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="ownerEmail"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className={`input-field pl-10 ${formErrors.ownerEmail ? 'border-red-500' : ''}`}
                placeholder="Enter shop owner email"
              />
            </div>
            {formErrors.ownerEmail && <p className="error-message">{formErrors.ownerEmail}</p>}
          </div>
          
          <div className="form-group">
            <label className="form-label flex items-center space-x-1">
              <HelpCircle className="h-4 w-4 text-gray-500" />
              <span>Was the visit successful?</span>
            </label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center">
                <input
                  id="yes"
                  name="visitSuccessful"
                  type="radio"
                  value="yes"
                  checked={visitSuccessful === 'yes'}
                  onChange={() => setVisitSuccessful('yes')}
                  className="h-4 w-4 text-blue-900 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="yes" className="ml-3 block text-sm font-medium text-gray-700">
                  Yes - Visit was successful
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="no"
                  name="visitSuccessful"
                  type="radio"
                  value="no"
                  checked={visitSuccessful === 'no'}
                  onChange={() => setVisitSuccessful('no')}
                  className="h-4 w-4 text-blue-900 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="no" className="ml-3 block text-sm font-medium text-gray-700">
                  No - Visit was not successful
                </label>
              </div>
            </div>
            {formErrors.visitSuccessful && <p className="error-message">{formErrors.visitSuccessful}</p>}
          </div>
          
          <div className="form-group">
            <label htmlFor="notes" className="form-label">Additional Notes (Optional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              placeholder="Any additional notes about the visit, products discussed, follow-up required, etc..."
              rows={4}
            />
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
                <span>Submit Shop Visit</span>
              </span>
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default ShopVisit;
