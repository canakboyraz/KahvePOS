/**
 * Supabase Configuration - KahvePOS
 */

const SUPABASE_URL = 'https://rnibcfiwsleobsdlfqfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaWJjZml3c2xlb2JzZGxmcWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTkxNzcsImV4cCI6MjA4NTg5NTE3N30.kG5BZV_JnEuVwE_AyXS7LxQSq6GJoPTzY86k7oZYVg0';

// Supabase client'ı başlat (CDN versiyonu için)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global erişim için
window.supabase = supabaseClient;

console.log('🗄️ Supabase initialized for KahvePOS');
