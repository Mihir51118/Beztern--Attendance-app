// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Make sure the URL includes the protocol (https://)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vijhxaaxwlxyppyxxoco.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY in environment variables');
  // Provide a fallback instead of throwing an error in production
  // This prevents the app from crashing if env vars aren't set
}

// Add additional options to the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

// Add a simple function to test the connection
export const testSupabaseConnection = async () => {
  try {
    // A simple query to test connection
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact' }).limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Error testing Supabase connection:', err);
    return false;
  }
};
