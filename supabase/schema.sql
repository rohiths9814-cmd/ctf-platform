-- ============================================================
-- XYZ_CTF DATABASE SCHEMA
-- Run this ENTIRE file in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ─── TEAMS ───────────────────────────────────────────────────
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── PROFILES (extends auth.users) ──────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── CHALLENGES ──────────────────────────────────────────────
CREATE TABLE challenges (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  points INTEGER DEFAULT 100,
  flag TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── SOLVES ──────────────────────────────────────────────────
CREATE TABLE solves (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id),
  solved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- ─── ANNOUNCEMENTS ──────────────────────────────────────────
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  type TEXT DEFAULT 'info' CHECK (type IN ('broadcast', 'alert', 'info')),
  message TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- VIEWS (hide sensitive data like flags from regular users)
-- ============================================================

CREATE VIEW challenges_public AS
SELECT id, title, description, category, difficulty, points, status, created_at
FROM challenges;

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- ─── Auto-create profile on signup ──────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Join or create team during registration ────────────────
CREATE OR REPLACE FUNCTION join_or_create_team(team_name_input TEXT)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Submit flag (secure — flag never exposed to client) ────
CREATE OR REPLACE FUNCTION submit_flag(challenge_id_input INTEGER, flag_input TEXT)
RETURNS JSON AS $$
DECLARE
  correct_flag TEXT;
  challenge_points INTEGER;
  challenge_status TEXT;
  user_team_id UUID;
  already_solved BOOLEAN;
BEGIN
  -- Get challenge info
  SELECT flag, points, status INTO correct_flag, challenge_points, challenge_status
  FROM challenges
  WHERE id = challenge_id_input;

  IF correct_flag IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Challenge not found');
  END IF;

  IF challenge_status != 'active' THEN
    RETURN json_build_object('success', false, 'message', 'Challenge is not active');
  END IF;

  -- Check if already solved by this user
  SELECT EXISTS(
    SELECT 1 FROM solves WHERE user_id = auth.uid() AND challenge_id = challenge_id_input
  ) INTO already_solved;

  IF already_solved THEN
    RETURN json_build_object('success', false, 'message', 'You have already solved this challenge');
  END IF;

  -- Verify flag
  IF correct_flag != flag_input THEN
    RETURN json_build_object('success', false, 'message', 'Incorrect flag. Try again.');
  END IF;

  -- Get user team
  SELECT team_id INTO user_team_id FROM profiles WHERE id = auth.uid();

  -- Record solve
  INSERT INTO solves (user_id, challenge_id, team_id)
  VALUES (auth.uid(), challenge_id_input, user_team_id);

  RETURN json_build_object(
    'success', true,
    'message', 'Correct! +' || challenge_points || ' points!',
    'points', challenge_points
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Get leaderboard (team rankings) ────────────────────────
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  total_score BIGINT,
  solve_count BIGINT,
  member_count BIGINT,
  last_solve TIMESTAMPTZ
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Get user challenge stats ───────────────────────────────
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS JSON AS $$
DECLARE
  user_team UUID;
  solved_count INTEGER;
  total_count INTEGER;
  total_pts BIGINT;
  team_rank INTEGER;
BEGIN
  SELECT team_id INTO user_team FROM profiles WHERE id = auth.uid();

  -- User's personal solves
  SELECT COUNT(*) INTO solved_count FROM solves WHERE user_id = auth.uid();

  -- Total active challenges
  SELECT COUNT(*) INTO total_count FROM challenges WHERE status = 'active';

  -- Team's total points
  SELECT COALESCE(SUM(c.points), 0) INTO total_pts
  FROM solves s JOIN challenges c ON c.id = s.challenge_id
  WHERE s.team_id = user_team;

  -- Team rank
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Get challenge categories with user progress ────────────
CREATE OR REPLACE FUNCTION get_categories()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(cats))
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Admin stats ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE solves ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ────────────────────────────────────────────────
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- ─── Teams ───────────────────────────────────────────────────
CREATE POLICY "Anyone can view teams"
  ON teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT TO authenticated WITH CHECK (true);

-- ─── Challenges ──────────────────────────────────────────────
-- Regular users: can only see active challenges (no flag column via view)
CREATE POLICY "Users can view active challenges"
  ON challenges FOR SELECT TO authenticated
  USING (status = 'active' OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Admins: full CRUD
CREATE POLICY "Admins can insert challenges"
  ON challenges FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update challenges"
  ON challenges FOR UPDATE TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete challenges"
  ON challenges FOR DELETE TO authenticated
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── Solves ──────────────────────────────────────────────────
CREATE POLICY "Anyone can view solves"
  ON solves FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own solves"
  ON solves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ─── Announcements ──────────────────────────────────────────
CREATE POLICY "Anyone can view announcements"
  ON announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- SEED DATA: Create an admin user after running this schema
-- Then go to Supabase Auth → Users and sign up with your email.
-- After signup, run this to make yourself admin:
--
-- UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL@example.com';
--
-- ============================================================
