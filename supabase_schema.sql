-- ════════════════════════════════════════════════════════════════════════════
-- Curatr App — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Profiles ──────────────────────────────────────────────────────────────
-- Stores basic user info. `id` matches the Clerk userId string.
create table if not exists profiles (
  id            text primary key,
  email         text,
  name          text,
  avatar_url    text,
  travel_preferences jsonb,
  created_at    timestamptz default now()
);

-- ── 2. Trips ─────────────────────────────────────────────────────────────────
create table if not exists trips (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null references profiles(id) on delete cascade,
  destination    text not null,
  duration       int,
  itinerary_data jsonb,
  status         text default 'upcoming',  -- 'upcoming' | 'past'
  created_at     timestamptz default now()
);

create index if not exists trips_user_id_idx on trips(user_id);

-- ── 3. Friends (optional social) ─────────────────────────────────────────────
create table if not exists friends (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references profiles(id) on delete cascade,
  friend_id  text not null references profiles(id) on delete cascade,
  status     text default 'pending',   -- 'pending' | 'accepted'
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- ── 4. Row-Level Security ─────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table trips    enable row level security;
alter table friends  enable row level security;

-- Open policies (no JWT validation needed since Clerk handles auth externally)
-- You can tighten these later with Clerk JWT templates + Supabase JWT secret.

create policy "profiles: open access"
  on profiles for all using (true) with check (true);

create policy "trips: open access"
  on trips for all using (true) with check (true);

create policy "friends: open access"
  on friends for all using (true) with check (true);
