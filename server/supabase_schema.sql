-- ==============================================================================
-- PerfLens PostgreSQL Schema for Supabase
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 3. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  websites TEXT[] DEFAULT '{}',
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team TEXT[] DEFAULT '{"You (Owner)"}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);

-- 4. REPORTS TABLE
-- Note: Stores detailed telemetry & audit trees as native PostgreSQL JSONB
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  overall_health_score NUMERIC,
  overall_performance_grade TEXT,
  status TEXT NOT NULL,
  duration NUMERIC NOT NULL,
  
  -- Performance & Analysis Telemetry stored as native JSONB
  scores JSONB DEFAULT NULL,
  vitals JSONB DEFAULT NULL,
  breakdown JSONB DEFAULT NULL,
  bundle_analysis JSONB DEFAULT NULL,
  images JSONB DEFAULT NULL,
  recommendations JSONB DEFAULT NULL,
  resources JSONB DEFAULT NULL,
  page_speed JSONB DEFAULT NULL,
  custom_analysis JSONB DEFAULT NULL,
  analysis_sources JSONB DEFAULT NULL,
  summary JSONB DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  puppeteer JSONB DEFAULT NULL,
  image JSONB DEFAULT NULL,
  css JSONB DEFAULT NULL,
  js JSONB DEFAULT NULL,
  seo JSONB DEFAULT NULL,
  accessibility JSONB DEFAULT NULL,
  recommendation JSONB DEFAULT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_url ON public.reports(url);
CREATE INDEX IF NOT EXISTS idx_reports_owner ON public.reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.reports(created_at DESC);

-- 5. SAVED COMPARISONS TABLE
CREATE TABLE IF NOT EXISTS public.saved_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url1 TEXT NOT NULL,
  url2 TEXT NOT NULL,
  report1_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  report2_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparisons_owner ON public.saved_comparisons(owner_id);

-- 6. GRANT FULL ACCESS TO API ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
