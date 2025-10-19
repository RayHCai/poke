-- PokeDate Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  sex text check (sex in ('male','female','nonbinary','other')),
  pronouns text,
  created_at timestamptz default now()
);

-- Preferences table
create table public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_sex text[] not null default '{male,female,nonbinary,other}',
  max_distance_km numeric not null default 5,
  is_visible boolean not null default true
);

-- Sightings (last known location)
create table public.sightings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m numeric,
  updated_at timestamptz default now()
);

-- Throws
create table public.throws (
  id uuid primary key default gen_random_uuid(),
  thrower_id uuid references auth.users(id) on delete cascade,
  target_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  status text not null default 'pending' check (status in ('pending','hit','miss','expired')),
  unique (thrower_id, target_id)
);

-- Matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  u1 uuid references auth.users(id) on delete cascade,
  u2 uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (u1, u2)
);

-- Blocks
create table public.blocks (
  blocker_id uuid references auth.users(id) on delete cascade,
  blocked_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- Reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete cascade,
  reported_id uuid references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_sightings_location on public.sightings(lat, lng);
create index idx_throws_target on public.throws(target_id, status);
create index idx_matches_u1 on public.matches(u1);
create index idx_matches_u2 on public.matches(u2);
create index idx_blocks_blocked on public.blocks(blocked_id);

-- Row Level Security (RLS) Policies

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.sightings enable row level security;
alter table public.throws enable row level security;
alter table public.matches enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- Profiles: readable by all, writable by owner
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Preferences: readable by all, writable by owner
create policy "Preferences are viewable by everyone"
  on public.preferences for select
  using (true);

create policy "Users can insert their own preferences"
  on public.preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.preferences for update
  using (auth.uid() = user_id);

-- Sightings: only visible users shown, writable by owner
create policy "Visible sightings are viewable"
  on public.sightings for select
  using (
    exists (
      select 1 from public.preferences
      where preferences.user_id = sightings.user_id
      and preferences.is_visible = true
    )
  );

create policy "Users can update their own sighting"
  on public.sightings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sighting location"
  on public.sightings for update
  using (auth.uid() = user_id);

-- Throws: viewable by thrower and target, insertable by thrower
create policy "Throws viewable by participants"
  on public.throws for select
  using (auth.uid() = thrower_id or auth.uid() = target_id);

create policy "Users can throw"
  on public.throws for insert
  with check (auth.uid() = thrower_id);

create policy "Targets can update throw status"
  on public.throws for update
  using (auth.uid() = target_id);

-- Matches: viewable by participants
create policy "Matches viewable by participants"
  on public.matches for select
  using (auth.uid() = u1 or auth.uid() = u2);

create policy "System can insert matches"
  on public.matches for insert
  with check (true); -- Service role will handle this

-- Blocks: viewable and writable by blocker
create policy "Users can view their blocks"
  on public.blocks for select
  using (auth.uid() = blocker_id);

create policy "Users can block others"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "Users can unblock"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- Reports: insertable by anyone
create policy "Users can report others"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, username, display_name)
  values (
    new.id,
    split_part(new.email, '@', 1),
    split_part(new.email, '@', 1)
  );

  insert into public.preferences (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
