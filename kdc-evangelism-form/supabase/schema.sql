-- ============================================================
-- KDC EVANGELISM PORTAL — DATABASE SCHEMA (v2 — Hardened)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- TABLE: profiles (must be created BEFORE is_admin function)
-- ============================================================
CREATE TABLE
IF NOT EXISTS profiles
(
  id           UUID REFERENCES auth.users
(id) ON
DELETE CASCADE PRIMARY KEY,
  full_name    TEXT
NOT NULL,
  -- FIX 2.6: enforce Nigerian 11-digit format at DB level
  phone_number TEXT UNIQUE NOT NULL
    CHECK
(phone_number ~ '^\d{11}$'),
  role         TEXT NOT NULL CHECK
(role IN
('admin', 'member')),
  created_at   TIMESTAMPTZ DEFAULT NOW
()
);

-- ─────────────────────────────────────────────────────────────
-- HELPER: is_admin() — SECURITY DEFINER so it bypasses RLS
-- when called from within other RLS policies
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin
()
RETURNS BOOLEAN AS $$
SELECT EXISTS
(
    SELECT 1
FROM profiles
WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR
SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins read all profiles"
  ON profiles FOR
SELECT
  USING (is_admin());

CREATE POLICY "Admins update profiles"
  ON profiles FOR
UPDATE
  USING (is_admin()
);


-- ============================================================
-- TABLE: converts
-- ============================================================
CREATE TABLE
IF NOT EXISTS converts
(
  id                UUID DEFAULT gen_random_uuid
() PRIMARY KEY,
  full_name         TEXT NOT NULL,
  gender            TEXT NOT NULL CHECK
(gender IN
('Male', 'Female')),

  -- FIX 2.6: enforce 11-digit format on both phone fields
  phone_calling     TEXT CHECK
(phone_calling IS NULL OR phone_calling ~ '^\d{11}$'),
  phone_whatsapp    TEXT CHECK
(phone_whatsapp IS NULL OR phone_whatsapp ~ '^\d{11}$'),

  -- FIX 2.4: prevent future-dated entries
  date_reached      DATE NOT NULL CHECK
(date_reached <= CURRENT_DATE),

  location_address  TEXT NOT NULL
    CHECK
(location_address IN
(
      'Graceland Area',
      'Lens Poly Area',
      'Opposite the Navy Base Area',
      'Navy Base Area',
      'Ga''olomifunfu',
      'Ilemona Area',
      'Holy Trinity Area',
      'Lens University Area'
    )),

  -- FIX 2.2: add missing CHECK constraints for analytics integrity
  salvation_status  TEXT NOT NULL
    CHECK
(salvation_status IN
('Saved Believer', 'Yet to be Saved')),

  occupation        TEXT NOT NULL
    CHECK
(occupation IN
(
      'Student',
      'Lecturer',
      'Navy Personnel/Navy Student',
      'Corp Member',
      'Business Owner',
      'Skilled Worker',
      'Market Trader',
      'Agricultural Farmer',
      'Professional Worker',
      'Civil Servant'
    )),

  level_of_response TEXT NOT NULL CHECK
(level_of_response IN
('High', 'Middle', 'Low')),
  visited_kdc       TEXT NOT NULL CHECK
(visited_kdc IN
('YES', 'NO')),
  remark            TEXT,
  submitted_by      UUID REFERENCES profiles
(id),
  created_at        TIMESTAMPTZ DEFAULT NOW
()
);

ALTER TABLE converts ENABLE ROW LEVEL SECURITY;

-- FIX 2.1: enforce ownership — submitted_by MUST equal the caller's UID
-- This closes the impersonation gap completely
CREATE POLICY "Authenticated users insert converts"
  ON converts FOR
INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND
submitted_by
=
auth
.uid
()
  );

-- Members can SELECT their own submitted records (needed for post-insert .select())
CREATE POLICY "Members select own converts"
  ON converts FOR
SELECT
  USING (submitted_by = auth.uid());

CREATE POLICY "Admins select converts"
  ON converts FOR
SELECT
  USING (is_admin());

CREATE POLICY "Admins update converts"
  ON converts FOR
UPDATE
  USING (is_admin()
);

CREATE POLICY "Admins delete converts"
  ON converts FOR
DELETE
  USING (is_admin
());

-- FIX 2.3: duplicate protection — same phone on the same date is a duplicate
-- Uses partial indexes so NULL values are excluded (PostgreSQL NULLs ≠ NULLs in UNIQUE)
CREATE UNIQUE INDEX
IF NOT EXISTS converts_no_dup_calling
  ON converts
(phone_calling, date_reached)
  WHERE phone_calling IS NOT NULL;

CREATE UNIQUE INDEX
IF NOT EXISTS converts_no_dup_whatsapp
  ON converts
(phone_whatsapp, date_reached)
  WHERE phone_whatsapp IS NOT NULL;


-- ============================================================
-- FIX 2.5: AUDIT TRAIL
-- Logs every INSERT, UPDATE, DELETE on the converts table
-- so admins have full accountability and rollback capability
-- ============================================================
CREATE TABLE
IF NOT EXISTS converts_audit_log
(
  id          UUID DEFAULT gen_random_uuid
() PRIMARY KEY,
  convert_id  UUID NOT NULL,
  action      TEXT NOT NULL CHECK
(action IN
('INSERT', 'UPDATE', 'DELETE')),
  changed_by  UUID,                  -- auth.uid() at time of change
  old_data    JSONB,                  -- NULL for INSERT
  new_data    JSONB,                  -- NULL for DELETE
  changed_at  TIMESTAMPTZ DEFAULT NOW
()
);

-- Admins can read the full audit log; it is insert-only via trigger
ALTER TABLE converts_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log"
  ON converts_audit_log FOR
SELECT
  USING (is_admin());

-- Trigger function — runs as SECURITY DEFINER so it can always write to the log
CREATE OR REPLACE FUNCTION log_convert_change
()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
  INSERT INTO converts_audit_log
    (convert_id, action, changed_by, old_data, new_data)
  VALUES
    (NEW.id, 'INSERT', auth.uid(), NULL, to_jsonb(NEW));

  ELSIF TG_OP = 'UPDATE' THEN
  INSERT INTO converts_audit_log
    (convert_id, action, changed_by, old_data, new_data)
  VALUES
    (NEW.id, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));

  ELSIF TG_OP = 'DELETE' THEN
  INSERT INTO converts_audit_log
    (convert_id, action, changed_by, old_data, new_data)
  VALUES
    (OLD.id, 'DELETE', auth.uid(), to_jsonb(OLD), NULL);
END
IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to converts table
DROP TRIGGER IF EXISTS converts_audit_trigger
ON converts;
CREATE TRIGGER converts_audit_trigger
  AFTER
INSERT OR
UPDATE OR DELETE ON converts
  FOR EACH ROW
EXECUTE FUNCTION log_convert_change
();


-- ============================================================
-- TABLE: pending_admin_actions
-- ============================================================
CREATE TABLE
IF NOT EXISTS pending_admin_actions
(
  id              UUID DEFAULT gen_random_uuid
() PRIMARY KEY,
  action_type     TEXT NOT NULL DEFAULT 'remove_admin',
  target_user_id  UUID REFERENCES profiles
(id) ON
DELETE CASCADE,
  initiated_by    UUID
REFERENCES profiles
(id),
  confirmed_by    UUID REFERENCES profiles
(id),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK
(status IN
('pending', 'completed', 'cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW
()
);


-- ============================================================
-- MIGRATION v3 — Run this on an EXISTING database
-- Adds: ministry_department, minister_name, new locations
-- Safe to run multiple times (uses IF NOT EXISTS / NOT VALID)
-- ============================================================

-- 1. Add ministry_department to profiles (nullable, optional)
ALTER TABLE profiles ADD COLUMN
IF NOT EXISTS ministry_department TEXT;

-- 2. Add minister_name to converts (stores who filled the form)
ALTER TABLE converts ADD COLUMN
IF NOT EXISTS minister_name TEXT;

-- 3. Update location_address constraint to new locations + "Other:" custom
--    First, find and drop the old inline CHECK constraint:
DO $$ 
DECLARE
  cname TEXT;
BEGIN
  SELECT conname
  INTO cname
  FROM pg_constraint
  WHERE conrelid = 'converts'
  ::regclass
    AND contype = 'c'
    AND pg_get_constraintdef
  (oid) LIKE '%location_address%';
  IF cname IS NOT NULL THEN
  EXECUTE format
  ('ALTER TABLE converts DROP CONSTRAINT %I', cname);
END
IF;
END $$;

--    Then add the new constraint (NOT VALID = don't check old rows)
ALTER TABLE converts ADD CONSTRAINT converts_location_address_check CHECK (
  location_address IN (
    '40 Rooms Area',
    'Arab suit/ Health tech Area',
    'Atari/Abuja gate Area',
    'Church Area',
    'Mini campus Area',
    'Obanimomo/ Hallelujah Area',
    'Omo_owo Area',
    'Orita_merin Area',
    'PS Area',
    'Saint Claire Area',
    'Secretariat Area',
    'Tipper Garage Area',
    'Thomade Area'
  ) OR location_address LIKE 'Other:%'
)
NOT VALID;

ALTER TABLE pending_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pending actions"
  ON pending_admin_actions FOR ALL
  USING
(is_admin
());


-- ============================================================
-- FIRST ADMIN SETUP
-- Step 1: In Supabase Dashboard → Authentication → Users → Add User
--         Email: 07070434722@kdc.app  |  Password: Elijah463**
-- Step 2: Copy the generated UUID, then run:
--
-- INSERT INTO profiles (id, full_name, phone_number, role)
-- VALUES ('<PASTE_UUID_HERE>', 'Emmanuel Elijah', '07070434722', 'admin');
--
-- See README.md for the full guide.
-- ============================================================
