import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase config from environment variables
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://znqluvthvecdegtnozfg.supabase.co';
// Provide a placeholder anon key if none is found to avoid breaking local initiation
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucWx1dnRodmVjZGVndG5vemZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODg4ODg4ODgsImV4cCI6MTk4ODg4ODg4OH0.dummy-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
