
-- families
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- parent profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  display_name text NOT NULL DEFAULT 'Parent',
  role text NOT NULL DEFAULT 'Mother' CHECK (role IN ('Mother','Father')),
  emoji text NOT NULL DEFAULT '👩',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.my_family_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- shared baby profile (one per family)
CREATE TABLE public.babies (
  family_id uuid PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.family_settings (
  family_id uuid PRIMARY KEY REFERENCES public.families(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.entries (
  id uuid PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  at timestamptz NOT NULL,
  type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entries_family_at_idx ON public.entries (family_id, at DESC);

CREATE TABLE public.medicines (
  id uuid PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vaccines (
  id uuid PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.milestones (
  id uuid PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.babies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT ALL ON public.families TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.babies TO service_role;
GRANT ALL ON public.family_settings TO service_role;
GRANT ALL ON public.entries TO service_role;
GRANT ALL ON public.medicines TO service_role;
GRANT ALL ON public.appointments TO service_role;
GRANT ALL ON public.vaccines TO service_role;
GRANT ALL ON public.milestones TO service_role;

-- RLS
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own family readable" ON public.families FOR SELECT TO authenticated
  USING (id = public.my_family_id() OR created_by = auth.uid());
CREATE POLICY "create own family" ON public.families FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (family_id IS NOT NULL AND family_id = public.my_family_id()));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "family babies" ON public.babies FOR ALL TO authenticated
  USING (family_id = public.my_family_id()) WITH CHECK (family_id = public.my_family_id());
CREATE POLICY "family settings" ON public.family_settings FOR ALL TO authenticated
  USING (family_id = public.my_family_id()) WITH CHECK (family_id = public.my_family_id());
CREATE POLICY "family entries" ON public.entries FOR ALL TO authenticated
  USING (family_id = public.my_family_id()) WITH CHECK (family_id = public.my_family_id());
CREATE POLICY "family medicines" ON public.medicines FOR ALL TO authenticated
  USING (family_id = public.my_family_id()) WITH CHECK (family_id = public.my_family_id());
CREATE POLICY "family appointments" ON public.appointments FOR ALL TO authenticated
  USING (family_id = public.my_family_id()) WITH CHECK (family_id = public.my_family_id());
CREATE POLICY "family vaccines" ON public.vaccines FOR ALL TO authenticated
  USING (family_id = public.my_family_id()) WITH CHECK (family_id = public.my_family_id());
CREATE POLICY "family milestones" ON public.milestones FOR ALL TO authenticated
  USING (family_id = public.my_family_id()) WITH CHECK (family_id = public.my_family_id());

-- join a family by invite code (bypasses the families SELECT policy safely)
CREATE OR REPLACE FUNCTION public.join_family_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fid uuid;
BEGIN
  SELECT id INTO fid FROM public.families WHERE invite_code = upper(trim(_code));
  IF fid IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  UPDATE public.profiles SET family_id = fid, updated_at = now() WHERE id = auth.uid();
  RETURN fid;
END; $$;
GRANT EXECUTE ON FUNCTION public.join_family_by_code(text) TO authenticated;

-- updated_at triggers
CREATE TRIGGER t_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_babies BEFORE UPDATE ON public.babies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_settings BEFORE UPDATE ON public.family_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_entries BEFORE UPDATE ON public.entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_medicines BEFORE UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_vaccines BEFORE UPDATE ON public.vaccines FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_milestones BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- realtime
ALTER TABLE public.babies REPLICA IDENTITY FULL;
ALTER TABLE public.family_settings REPLICA IDENTITY FULL;
ALTER TABLE public.entries REPLICA IDENTITY FULL;
ALTER TABLE public.medicines REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.vaccines REPLICA IDENTITY FULL;
ALTER TABLE public.milestones REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.babies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vaccines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
