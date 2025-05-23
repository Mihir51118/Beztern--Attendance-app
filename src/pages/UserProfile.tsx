import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Camera, User, Upload, Save, Key, Bell, Moon, Sun } from 'lucide-react';

const UserProfile = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    username: '',
    bio: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    darkMode: false,
    language: 'english',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      // Get user preferences
      const { data: prefData, error: prefError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
        
      // Set user data
      setUserData({
        ...user,
        ...profileData
      });
      
      // Set form data
      setFormData({
        full_name: profileData.full_name || '',
        email: user.email || '',
        phone: profileData.phone || '',
        username: profileData.username || '',
        bio: profileData.bio || '',
      });
      
      // Set preference data if available
      if (prefData) {
        setPreferences({
          emailNotifications: prefData.email_notifications ?? true,
          darkMode: prefData.dark_mode ?? false,
          language: prefData.language || 'english',
        });
      }
      
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreferenceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          username: formData.username,
          bio: formData.bio,
          updated_at: new Date()
        })
        .eq('id', userData.id);
        
      if (error) throw error;
      
      // Handle email change if different
      if (formData.email !== userData.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        
        if (emailError) throw emailError;
        showToast('Email updated. Please check your new email for verification.', 'info');
      }
      
      showToast('Profile updated successfully', 'success');
      fetchUserProfile(); // Refresh data
      
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      // First verify current password
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: passwordData.currentPassword
      });
      
      if (signInError) {
        showToast('Current password is incorrect', 'error');
        throw signInError;
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (updateError) throw updateError;
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      showToast('Password updated successfully', 'success');
      
    } catch (error) {
      console.error('Error updating password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceUpdate = async () => {
    try {
      setLoading(true);
      
      // Update or insert preferences
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userData.id,
          email_notifications: preferences.emailNotifications,
          dark_mode: preferences.darkMode,
          language: preferences.language,
          updated_at: new Date()
        });
        
      if (error) throw error;
      
      showToast('Preferences updated successfully', 'success');
      
    } catch (error) {
      console.error('Error updating preferences:', error);
      showToast('Failed to update preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    try {
      setUploadingImage(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `profiles/${fileName}`;
      
      // Upload image to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: urlData.publicUrl,
          updated_at: new Date()
        })
        .eq('id', userData.id);
        
      if (updateError) throw updateError;
      
      showToast('Profile picture updated successfully', 'success');
      fetchUserProfile(); // Refresh to show new image
      
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading && !userData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Your Profile</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-4xl mx-auto">
        {/* Profile Header with Avatar */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-8 text-white">
          <div className="flex flex-col sm:flex-row items-center">
            <div className="relative group mb-4 sm:mb-0">
              <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white flex items-center justify-center">
                {userData?.avatar_url ? (
                  <img 
                    src={userData.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={48} className="text-blue-300" />
                )}
              </div>
              <div 
                className="absolute inset-0 rounded-full bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-white text-center">
                  <Camera size={24} className="mx-auto mb-1" />
                  <span className="text-xs">Change Photo</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
            </div>
            
            <div className="sm:ml-6 text-center sm:text-left">
              <h2 className="text-2xl font-bold">{userData?.full_name || 'Your Name'}</h2>
              <p className="text-blue-200">{userData?.email}</p>
              <p className="text-blue-200 mt-1">
                {userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'Employee'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="p-6">
          <div className="border-b border-gray-200 mb-6">
            <ul className="-mb-px flex space-x-8">
              <li className="border-b-2 border-blue-500 py-2 px-1">
                <button className="flex items-center text-blue-600 font-medium">
                  <User className="h-5 w-5 mr-2" />
                  Profile Information
                </button>
              </li>
            </ul>
          </div>
          
          {/* Profile Form */}
          <form onSubmit={handleProfileUpdate} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1 (234) 567-8900"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
          
          {/* Change Password */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Key className="h-5 w-5 mr-2 text-blue-500" />
              Change Password
            </h3>
            
            <form onSubmit={handlePasswordUpdate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Update Password
                </button>
              </div>
            </form>
          </div>
          
          {/* Preferences */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2 text-blue-500" />
              Preferences
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-500">Receive notifications about account activity</p>
                </div>
                <div className="flex items-center h-5">
                  <input
                    id="emailNotifications"
                    name="emailNotifications"
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={handlePreferenceChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center">
                  <div className="mr-3">
                    {preferences.darkMode ? <Moon className="h-5 w-5 text-blue-500" /> : <Sun className="h-5 w-5 text-blue-500" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Dark Mode</h4>
                    <p className="text-sm text-gray-500">Use dark theme across the application</p>
                  </div>
                </div>
                <div className="flex items-center h-5">
                  <input
                    id="darkMode"
                    name="darkMode"
                    type="checkbox"
                    checked={preferences.darkMode}
                    onChange={handlePreferenceChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Language</h4>
                  <p className="text-sm text-gray-500">Select your preferred language</p>
                </div>
                <select
                  name="language"
                  value={preferences.language}
                  onChange={handlePreferenceChange}
                  className="block w-32 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="english">English</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                  <option value="hindi">Hindi</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handlePreferenceUpdate}
                disabled={loading}
                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
