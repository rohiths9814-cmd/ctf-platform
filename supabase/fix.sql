-- ============================================================
-- XYZ_CTF SCHEMA FIX
-- Run this in Supabase SQL Editor to fix the "Database error saving new user" issue
-- ============================================================

-- Fix 1: Drop and recreate the trigger function to bypass RLS
-- The trigger needs to insert into profiles, but RLS blocks it
-- Using SECURITY DEFINER + SET search_path ensures it runs with elevated privileges

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    'user'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Fix 2: Add missing INSERT policy on profiles table
-- The trigger runs as the function owner (postgres), but we also need
-- a policy for the service role and authenticated inserts
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Fix 3: Recreate join_or_create_team with proper search_path
DROP FUNCTION IF EXISTS join_or_create_team(TEXT);

CREATE OR REPLACE FUNCTION join_or_create_team(team_name_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_team_id UUID;
  member_count INTEGER;
BEGIN
  -- Check if team exists
  SELECT id INTO existing_team_id FROM teams WHERE name = team_name_input;

  IF existing_team_id IS NOT NULL THEN
    -- Check member count (max 3)
    SELECT COUNT(*) INTO member_count FROM profiles WHERE team_id = existing_team_id;
    IF member_count >= 3 THEN
      RETURN json_build_object('success', false, 'message', 'Team is full (max 3 members)');
    END IF;
    -- Join existing team
    UPDATE profiles SET team_id = existing_team_id WHERE id = auth.uid();
    RETURN json_build_object('success', true, 'team_id', existing_team_id, 'message', 'Joined team successfully');
  ELSE
    -- Create new team
    INSERT INTO teams (name) VALUES (team_name_input) RETURNING id INTO existing_team_id;
    UPDATE profiles SET team_id = existing_team_id WHERE id = auth.uid();
    RETURN json_build_object('success', true, 'team_id', existing_team_id, 'message', 'Team created successfully');
  END IF;
END;
$$;

-- Fix 4: Recreate submit_flag with proper search_path
DROP FUNCTION IF EXISTS submit_flag(INTEGER, TEXT);

CREATE OR REPLACE FUNCTION submit_flag(challenge_id_input INTEGER, flag_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  correct_flag TEXT;
  challenge_points INTEGER;
  challenge_status TEXT;
  user_team_id UUID;
  already_solved BOOLEAN;
BEGIN
  SELECT flag, points, status INTO correct_flag, challenge_points, challenge_status
  FROM challenges WHERE id = challenge_id_input;

  IF correct_flag IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Challenge not found');
  END IF;

  IF challenge_status != 'active' THEN
    RETURN json_build_object('success', false, 'message', 'Challenge is not active');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM solves WHERE user_id = auth.uid() AND challenge_id = challenge_id_input
  ) INTO already_solved;

  IF already_solved THEN
    RETURN json_build_object('success', false, 'message', 'You have already solved this challenge');
  END IF;

  IF correct_flag != flag_input THEN
    RETURN json_build_object('success', false, 'message', 'Incorrect flag. Try again.');
  END IF;

  SELECT team_id INTO user_team_id FROM profiles WHERE id = auth.uid();

  INSERT INTO solves (user_id, challenge_id, team_id)
  VALUES (auth.uid(), challenge_id_input, user_team_id);

  RETURN json_build_object(
    'success', true,
    'message', 'Correct! +' || challenge_points || ' points!',
    'points', challenge_points
  );
END;
$$;

-- Fix 5: Recreate all other RPC functions with proper search_path
DROP FUNCTION IF EXISTS get_leaderboard();

CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  total_score BIGINT,
  solve_count BIGINT,
  member_count BIGINT,
  last_solve TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.name AS team_name,
    COALESCE(SUM(c.points), 0)::BIGINT AS total_score,
    COUNT(DISTINCT s.id)::BIGINT AS solve_count,
    (SELECT COUNT(*)::BIGINT FROM profiles p WHERE p.team_id = t.id) AS member_count,
    MAX(s.solved_at) AS last_solve
  FROM teams t
  LEFT JOIN solves s ON s.team_id = t.id
  LEFT JOIN challenges c ON c.id = s.challenge_id
  GROUP BY t.id, t.name
  ORDER BY total_score DESC, last_solve ASC;
END;
$$;

DROP FUNCTION IF EXISTS get_user_stats();

CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_team UUID;
  solved_count INTEGER;
  total_count INTEGER;
  total_pts BIGINT;
  team_rank INTEGER;
BEGIN
  SELECT team_id INTO user_team FROM profiles WHERE id = auth.uid();
  SELECT COUNT(*) INTO solved_count FROM solves WHERE user_id = auth.uid();
  SELECT COUNT(*) INTO total_count FROM challenges WHERE status = 'active';

  SELECT COALESCE(SUM(c.points), 0) INTO total_pts
  FROM solves s JOIN challenges c ON c.id = s.challenge_id
  WHERE s.team_id = user_team;

  WITH ranked AS (
    SELECT t.id, ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(c.points), 0) DESC) AS rn
    FROM teams t
    LEFT JOIN solves s ON s.team_id = t.id
    LEFT JOIN challenges c ON c.id = s.challenge_id
    GROUP BY t.id
  )
  SELECT rn INTO team_rank FROM ranked WHERE id = user_team;

  RETURN json_build_object(
    'solved', solved_count,
    'total', total_count,
    'solve_rate', CASE WHEN total_count > 0 THEN ROUND((solved_count::NUMERIC / total_count) * 100) ELSE 0 END,
    'total_points', total_pts,
    'rank', COALESCE(team_rank, 0)
  );
END;
$$;

DROP FUNCTION IF EXISTS get_categories();

CREATE OR REPLACE FUNCTION get_categories()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(cats)), '[]'::json)
    FROM (
      SELECT
        c.category AS name,
        COUNT(*)::INTEGER AS total,
        COUNT(s.id)::INTEGER AS solved
      FROM challenges c
      LEFT JOIN solves s ON s.challenge_id = c.id AND s.user_id = auth.uid()
      WHERE c.status = 'active'
      GROUP BY c.category
      ORDER BY c.category
    ) cats
  );
END;
$$;

DROP FUNCTION IF EXISTS get_admin_stats();

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'total_teams', (SELECT COUNT(*) FROM teams),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_challenges', (SELECT COUNT(*) FROM challenges),
    'total_solves', (SELECT COUNT(*) FROM solves),
    'total_categories', (SELECT COUNT(DISTINCT category) FROM challenges),
    'avg_score', (
      SELECT COALESCE(ROUND(AVG(team_score)), 0)
      FROM (
        SELECT COALESCE(SUM(c.points), 0) AS team_score
        FROM teams t
        LEFT JOIN solves s ON s.team_id = t.id
        LEFT JOIN challenges c ON c.id = s.challenge_id
        GROUP BY t.id
      ) sub
    )
  );
END;
$$;

-- Done! Now try registering again.
