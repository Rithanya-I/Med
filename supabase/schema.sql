-- ==========================================================
-- MediSlot AI - Supabase PostgreSQL Schema & Initial Migration
-- ==========================================================

-- 1. Users / Patients table
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  med_id TEXT NOT NULL DEFAULT '#8841-P',
  insurance_provider TEXT NOT NULL DEFAULT 'Aetna / BlueCross Verified',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Medical Specialties catalog
CREATE TABLE IF NOT EXISTS public.specialties (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  services_summary TEXT NOT NULL,
  doctor_count INTEGER NOT NULL DEFAULT 0,
  category_tag TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  next_open_slot TEXT NOT NULL DEFAULT 'Today, 2:30 PM',
  icon_name TEXT NOT NULL DEFAULT 'medical_services'
);

-- 3. Verified Doctors catalog
CREATE TABLE IF NOT EXISTS public.doctors (
  id SERIAL PRIMARY KEY,
  specialty_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  credentials TEXT NOT NULL,
  title TEXT NOT NULL,
  specialty_name TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  clinic_address TEXT NOT NULL,
  distance_miles TEXT NOT NULL,
  rating TEXT NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  years_exp INTEGER NOT NULL DEFAULT 0,
  patients_treated TEXT NOT NULL,
  satisfaction_rate TEXT NOT NULL,
  consultation_fee INTEGER NOT NULL,
  insurance_copay INTEGER NOT NULL,
  next_slot_label TEXT NOT NULL,
  match_percent INTEGER NOT NULL DEFAULT 95,
  bio TEXT NOT NULL,
  education TEXT NOT NULL,
  fellowship TEXT NOT NULL,
  license_number TEXT NOT NULL,
  focus_tags TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  telehealth_available BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Patient Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id SERIAL PRIMARY KEY,
  booking_ref TEXT NOT NULL UNIQUE,
  user_uid TEXT NOT NULL,
  doctor_id INTEGER NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL DEFAULT '',
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  visit_format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  patient_note TEXT NOT NULL DEFAULT '',
  fee_total INTEGER NOT NULL,
  insurance_discount INTEGER NOT NULL,
  patient_due INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Favorite Doctors Bookmarks
CREATE TABLE IF NOT EXISTS public.favorite_doctors (
  id SERIAL PRIMARY KEY,
  user_uid TEXT NOT NULL,
  doctor_id INTEGER NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_doctor UNIQUE (user_uid, doctor_id)
);

-- 6. MediBot AI Conversation Log
CREATE TABLE IF NOT EXISTS public.medibot_messages (
  id SERIAL PRIMARY KEY,
  user_uid TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  recommended_doctor_id INTEGER REFERENCES public.doctors(id) ON DELETE SET NULL,
  recommended_slot TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_uid ON public.users(uid);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors(specialty_slug);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON public.appointments(user_uid);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorite_doctors(user_uid);
CREATE INDEX IF NOT EXISTS idx_medibot_user ON public.medibot_messages(user_uid);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medibot_messages ENABLE ROW LEVEL SECURITY;

-- Public read access for catalog tables
DROP POLICY IF EXISTS "Public can view specialties" ON public.specialties;
CREATE POLICY "Public can view specialties" ON public.specialties
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view doctors" ON public.doctors;
CREATE POLICY "Public can view doctors" ON public.doctors
  FOR SELECT USING (true);

-- Allow backend service role & authenticated users to manage data
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
  FOR ALL USING (auth.uid()::text = uid OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can manage own appointments" ON public.appointments;
CREATE POLICY "Users can manage own appointments" ON public.appointments
  FOR ALL USING (auth.uid()::text = user_uid OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorite_doctors;
CREATE POLICY "Users can manage own favorites" ON public.favorite_doctors
  FOR ALL USING (auth.uid()::text = user_uid OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can manage own chat history" ON public.medibot_messages;
CREATE POLICY "Users can manage own chat history" ON public.medibot_messages
  FOR ALL USING (auth.uid()::text = user_uid OR auth.role() = 'service_role');
