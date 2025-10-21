import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente de Supabase para operaciones del servidor (con service role key)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente de Supabase para operaciones del cliente (con anon key)
export const createSupabaseClient = () => {
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseAnonKey) {
    throw new Error('Missing Supabase anon key');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};