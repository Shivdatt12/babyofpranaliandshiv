CREATE TABLE public.active_timers (
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('breast','sleep')),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  started_by uuid,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_timers TO authenticated;
GRANT ALL ON public.active_timers TO service_role;

ALTER TABLE public.active_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family active timers" ON public.active_timers
  FOR ALL TO authenticated
  USING (family_id = public.my_family_id())
  WITH CHECK (family_id = public.my_family_id());

CREATE TRIGGER t_active_timers BEFORE UPDATE ON public.active_timers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_timers;

CREATE POLICY "family media read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'family-media' AND (storage.foldername(name))[1] = public.my_family_id()::text);

CREATE POLICY "family media insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'family-media' AND (storage.foldername(name))[1] = public.my_family_id()::text);

CREATE POLICY "family media update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'family-media' AND (storage.foldername(name))[1] = public.my_family_id()::text)
  WITH CHECK (bucket_id = 'family-media' AND (storage.foldername(name))[1] = public.my_family_id()::text);

CREATE POLICY "family media delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'family-media' AND (storage.foldername(name))[1] = public.my_family_id()::text);