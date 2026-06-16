-- ==========================================
-- ROWONE CINEMA - SUPABASE SCHEMA INITIALIZATION
-- ==========================================
-- Execute this script inside your Supabase SQL Editor to bootstrap
-- your tables, triggers, storage buckets, RLS security policies,
-- and the studio activation RPC function.

-- 1. PROFILES TABLE
-- Create a profile matching each authenticated user on signup.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('individual', 'studio')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Allow public read access to profiles" ON public.profiles
  FOR SELECT USING (true);

-- Insert policies
CREATE POLICY "Allow users to insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Update policies 
CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);


-- 2. INDIVIDUALS TABLE
-- Details for standard audience/cinephile users.
CREATE TABLE IF NOT EXISTS public.individuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  phone_number TEXT,
  home_address_street TEXT,
  home_address_city TEXT,
  home_address_country TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.individuals ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Allow public read access to individuals" ON public.individuals
  FOR SELECT USING (true);

-- Insert/Update policies
CREATE POLICY "Allow users to manage their own individual details" ON public.individuals
  FOR ALL USING (auth.uid() = user_id);


-- 3. STUDIOS TABLE
-- Details for film production studios.
CREATE TABLE IF NOT EXISTS public.studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  studio_name TEXT NOT NULL,
  logo_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false, -- Defaults to false per specifications
  studio_phone TEXT,
  studio_address_street TEXT,
  studio_address_city TEXT,
  studio_address_country TEXT,
  website_url TEXT,
  studio_bio TEXT,
  studio_type TEXT,
  primary_contact_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Allow public read access to studios" ON public.studios
  FOR SELECT USING (true);

-- Insert/Update policies
CREATE POLICY "Allow owners to manage their own studio organization" ON public.studios
  FOR ALL USING (auth.uid() = owner_user_id);


-- 4. STUDIO_PAYMENTS TABLE
-- Tracks the $49.99 filmmaking registration fee transactions.
CREATE TABLE IF NOT EXISTS public.studio_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 49.99,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  payment_reference TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.studio_payments ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Allow studios to inspect their own payment receipts" ON public.studio_payments
  FOR SELECT USING (auth.uid() = studio_id);

-- Insert policies
CREATE POLICY "Allow studios to write payments for registration" ON public.studio_payments
  FOR INSERT WITH CHECK (auth.uid() = studio_id);


-- 5. FUNCTION & RPC: activate_studio
-- Activates the studio (marks is_verified to true) after verification payment clears successfully.
CREATE OR REPLACE FUNCTION public.activate_studio(studio_id UUID, payment_reference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to update tables securely
AS $$
DECLARE
  payment_record_status TEXT;
  payment_exists BOOLEAN := false;
BEGIN
  -- Check if a successful payment transaction matching reference exists
  SELECT status, TRUE INTO payment_record_status, payment_exists
  FROM public.studio_payments
  WHERE public.studio_payments.studio_id = activate_studio.studio_id 
    AND public.studio_payments.payment_reference = activate_studio.payment_reference
  LIMIT 1;

  IF payment_exists AND payment_record_status = 'success' THEN
    -- Update studio to verified status
    UPDATE public.studios
    SET is_verified = TRUE
    WHERE owner_user_id = activate_studio.studio_id;
    
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'A valid verification payment reference was not found or has failed.';
    RETURN FALSE;
  END IF;
END;
$$;


-- 6. TRIGGER FOR AUTOMATIC USER PROFILE PROVISIONING (OPTIONAL BUT RECOMMENDED)
-- Automatically provisions a row in profiles when an auth user registers.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, account_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'account_type', 'individual')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users inserts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 7. STORAGE BUCKETS
-- Setup requested public buckets for uploads
-- Run the following queries to initialize Supabase storage containers.
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-logos', 'studio-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage buckets (profile-photos)
CREATE POLICY "Allow public read on profile-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "Allow users to upload on profile-photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

-- RLS policies for storage buckets (studio-logos)
CREATE POLICY "Allow public read on studio-logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'studio-logos');

CREATE POLICY "Allow users to upload on studio-logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'studio-logos' AND auth.role() = 'authenticated');


-- ==========================================
-- 8. UPLOADED_CONTENT & ANALYTICS TABLES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.uploaded_content (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'reel')),
  creator_id TEXT,
  original_video_url TEXT,
  share_url TEXT NOT NULL,
  qr_code_url TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  views INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  qr_scans INTEGER DEFAULT 0,
  shares_by_platform JSONB DEFAULT '{"whatsapp": 0, "facebook": 0, "x": 0, "telegram": 0, "email": 0, "copy": 0}'::jsonb,
  referring_sources JSONB DEFAULT '{}'::jsonb,
  unique_visitors JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS for uploaded_content
ALTER TABLE public.uploaded_content ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Allow public read access to uploaded_content" ON public.uploaded_content
  FOR SELECT USING (true);

-- Insert/Update policies
CREATE POLICY "Allow anyone to upsert uploaded_content" ON public.uploaded_content
  FOR ALL USING (true);

