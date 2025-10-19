-- Seed data for local development
-- Create 3 demo users with distinct locations

-- NOTE: In production, users are created via Supabase Auth
-- For local dev, you can create test users in Supabase dashboard

-- Example seed data after creating users:
-- Replace UUIDs with actual user IDs from auth.users

-- Demo user 1: San Francisco
-- insert into public.profiles (user_id, username, display_name, bio, sex, pronouns)
-- values (
--   'USER_ID_1',
--   'alice_sf',
--   'Alice',
--   'Love hiking and coffee',
--   'female',
--   'she/her'
-- );

-- insert into public.sightings (user_id, lat, lng, accuracy_m)
-- values (
--   'USER_ID_1',
--   37.7749,
--   -122.4194,
--   10
-- );

-- Demo user 2: Oakland
-- insert into public.profiles (user_id, username, display_name, bio, sex, pronouns)
-- values (
--   'USER_ID_2',
--   'bob_oak',
--   'Bob',
--   'Tech enthusiast',
--   'male',
--   'he/him'
-- );

-- insert into public.sightings (user_id, lat, lng, accuracy_m)
-- values (
--   'USER_ID_2',
--   37.8044,
--   -122.2712,
--   15
-- );

-- Demo user 3: Berkeley
-- insert into public.profiles (user_id, username, display_name, bio, sex, pronouns)
-- values (
--   'USER_ID_3',
--   'charlie_berk',
--   'Charlie',
--   'Student and artist',
--   'nonbinary',
--   'they/them'
-- );

-- insert into public.sightings (user_id, lat, lng, accuracy_m)
-- values (
--   'USER_ID_3',
--   37.8715,
--   -122.2730,
--   12
-- );

-- Instructions:
-- 1. Create users via Supabase Auth (email/password)
-- 2. Get their user IDs from auth.users table
-- 3. Uncomment and update the insert statements above
-- 4. Run this SQL in Supabase SQL Editor
