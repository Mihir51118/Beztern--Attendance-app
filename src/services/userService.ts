import { supabase } from '../lib/supabase';

export async function fetchFilteredUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'admin');  // ← only this filter

  if (error) {
    console.error('Error fetching users:', error.message);
    return [];
  }
  return data || [];
}
