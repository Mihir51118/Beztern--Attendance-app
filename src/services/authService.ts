import { supabase } from '../lib/supabase';
import { generateOTP, hashPassword, verifyPassword } from '../utils/auth';
import type { RegisterFormData, LoginFormData } from '../lib/validation';

export const registerUser = async (data: RegisterFormData) => {
  const { email, phone, username, fullName, password } = data;
  
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: fullName,
        phone
      }
    }
  });

  if (authError) throw new Error(authError.message);

  // Generate OTP codes
  const emailOTP = generateOTP();
  const phoneOTP = generateOTP();

  // Store verification codes
  const { error: otpError } = await supabase
    .from('verification_codes')
    .insert([
      {
        user_id: authData.user?.id,
        code: emailOTP,
        type: 'email',
        expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      },
      {
        user_id: authData.user?.id,
        code: phoneOTP,
        type: 'phone',
        expires_at: new Date(Date.now() + 30 * 60 * 1000)
      }
    ]);

  if (otpError) throw new Error(otpError.message);

  // Send verification codes
  await Promise.all([
    sendEmailOTP(email, emailOTP),
    sendPhoneOTP(phone, phoneOTP)
  ]);

  return authData.user;
};

export const loginUser = async ({ identifier, password }: LoginFormData) => {
  // Check if identifier is an email
  if (identifier.includes('@')) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password
    });
    if (error) throw new Error('Invalid credentials');
    return data;
  }

  // Check if identifier is a phone number
  const phoneRegex = /^\+?[\d\s-]+$/;
  if (phoneRegex.test(identifier)) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', identifier)
      .single();

    if (userError || !userData) throw new Error('Invalid credentials');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password
    });
    if (error) throw new Error('Invalid credentials');
    return data;
  }

  // Assume identifier is a username
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('username', identifier)
    .single();

  if (userError || !userData) throw new Error('Invalid credentials');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password
  });
  if (error) throw new Error('Invalid credentials');
  return data;
};

export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/attendance`
    }
  });

  if (error) throw new Error(error.message);
  return data;
};

export const checkAuthStatus = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw new Error('Not authenticated');
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not found');
  }

  // Get additional user data from the users table
  const { data: userData, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error('Failed to fetch user profile');
  }

  return { ...user, ...userData };
};

export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};

export const requestPasswordReset = async (identifier: string) => {
  // If identifier is an email, use Supabase's built-in reset
  if (identifier.includes('@')) {
    const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw new Error(error.message);
    return true;
  }

  // For phone or username, find the associated email
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('email')
    .or(`phone.eq.${identifier},username.eq.${identifier}`)
    .single();

  if (userError || !userData) throw new Error('User not found');

  const { error } = await supabase.auth.resetPasswordForEmail(userData.email, {
    redirectTo: `${window.location.origin}/reset-password`
  });

  if (error) throw new Error(error.message);
  return true;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw new Error(error.message);
  return true;
};

export const verifyOTP = async (code: string, type: 'email' | 'phone') => {
  const { data: verificationData, error: verificationError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('code', code)
    .eq('type', type)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (verificationError || !verificationData) {
    throw new Error('Invalid or expired verification code');
  }

  // Update user verification status
  const updateData = type === 'email' 
    ? { email_verified: true }
    : { phone_verified: true };

  const { error: updateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', verificationData.user_id);

  if (updateError) {
    throw new Error('Failed to verify ' + type);
  }

  // Delete used verification code
  await supabase
    .from('verification_codes')
    .delete()
    .eq('id', verificationData.id);

  return true;
};

// Helper functions for sending notifications
const sendEmailOTP = async (email: string, code: string) => {
  // In a real application, implement email sending logic
  console.log(`Sending email OTP ${code} to ${email}`);
};

const sendPhoneOTP = async (phone: string, code: string) => {
  // In a real application, implement SMS sending logic
  console.log(`Sending SMS OTP ${code} to ${phone}`);
};