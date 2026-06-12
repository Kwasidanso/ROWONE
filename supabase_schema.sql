-- =========================================================================
--                     ROWONE SUPABASE DATABASE SCHEMA
-- =========================================================================
-- Run this SQL in your Supabase SQL Editor to provision the required tables,
-- trigger routines, storage buckets, and payment activation functions.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- -------------------------------------------------------------------------
-- Handled as a central identity linked to auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  account_type text not null default 'individual' check (account_type in ('individual', 'studio')),
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by anyone" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Enable insert for registration hook" on public.profiles
  for insert with check (true);

-- -------------------------------------------------------------------------
-- 2. INDIVIDUALS TABLE
-- -------------------------------------------------------------------------
-- Personal details for individual viewers.
create table if not exists public.individuals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  full_name text,
  date_of_birth text,
  age integer,
  is_underage boolean default false,
  pass_status text default 'none',
  created_at timestamptz default now()
);

alter table public.individuals enable row level security;

-- Policies for Individuals
create policy "Individuals are viewable by everyone" on public.individuals
  for select using (true);

create policy "Users can insert their own individual info" on public.individuals
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own individual info" on public.individuals
  for update using (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 3. STUDIOS TABLE
-- -------------------------------------------------------------------------
-- Distributor brand registrations and film studios.
create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade unique,
  studio_name text not null,
  logo_url text,
  is_verified boolean not null default false,
  studio_phone text,
  studio_address_street text,
  studio_address_city text,
  studio_address_country text,
  website_url text,
  studio_bio text,
  studio_type text,
  primary_contact_name text,
  created_at timestamptz default now()
);

alter table public.studios enable row level security;

-- Policies for Studios
create policy "Studios are viewable by everyone" on public.studios
  for select using (true);

create policy "Studio owners can insert their own studio metadata" on public.studios
  for insert with check (auth.uid() = owner_user_id);

create policy "Studio owners can update their own studio metadata" on public.studios
  for update using (auth.uid() = owner_user_id);

-- -------------------------------------------------------------------------
-- 4. STUDIO_PAYMENTS TABLE
-- -------------------------------------------------------------------------
-- Tracks fee collection for commercial licensing.
create table if not exists public.studio_payments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null default 49.99,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  payment_reference text unique,
  created_at timestamptz default now()
);

alter table public.studio_payments enable row level security;

-- Policies for Payments
create policy "Users can view their own payments" on public.studio_payments
  for select using (auth.uid() = studio_id);

create policy "System/Users can record initial payment transactions" on public.studio_payments
  for insert with check (auth.uid() = studio_id);

create policy "System/Users can update their own transaction status" on public.studio_payments
  for update using (auth.uid() = studio_id);

-- -------------------------------------------------------------------------
-- 5. RPC FUNCTION: activate_studio
-- -------------------------------------------------------------------------
-- Triggers verification flag flip upon success of registration billing reference.
create or replace function public.activate_studio(
  studio_id uuid,
  payment_reference text
)
returns void
language plpgsql
security definer
as $$
begin
  -- 1. Assert payment status is successful
  update public.studio_payments
  set status = 'success'
  where studio_payments.studio_id = activate_studio.studio_id
    and studio_payments.payment_reference = activate_studio.payment_reference;

  -- 2. Flip verification flag to true under studios table
  update public.studios
  set is_verified = true
  where owner_user_id = activate_studio.studio_id;
end;
$$;

-- -------------------------------------------------------------------------
-- 6. AUTH SIGNUP TRIGGER HOOK
-- -------------------------------------------------------------------------
-- Automatically inserts a default profile structure when registering in Supabase.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, account_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'account_type', 'individual')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------------
-- 7. STORAGE BUCKET DEFINITIONS
-- -------------------------------------------------------------------------
-- Registers profile-photos & studio-logos within Supabase Storage.
insert into storage.buckets (id, name, public)
values 
  ('profile-photos', 'profile-photos', true),
  ('studio-logos', 'studio-logos', true)
on conflict (id) do nothing;

-- Storage Security Policies
create policy "Allow public read access to profile photo bucket" on storage.objects
  for select using (bucket_id = 'profile-photos');

create policy "Allow authenticated upload key to profile photo bucket" on storage.objects
  for insert with check (bucket_id = 'profile-photos' and auth.role() = 'authenticated');

create policy "Allow public read access to studio logos bucket" on storage.objects
  for select using (bucket_id = 'studio-logos');

create policy "Allow authenticated upload key to studio logos bucket" on storage.objects
  for insert with check (bucket_id = 'studio-logos' and auth.role() = 'authenticated');
