CREATE TABLE public.name_ideas (
  id uuid PRIMARY KEY,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name_key text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  votes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (family_id, name_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.name_ideas TO authenticated;
GRANT ALL ON public.name_ideas TO service_role;

ALTER TABLE public.name_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family name ideas" ON public.name_ideas FOR ALL TO authenticated
  USING (family_id = public.my_family_id())
  WITH CHECK (family_id = public.my_family_id());

CREATE TRIGGER t_name_ideas BEFORE UPDATE ON public.name_ideas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.set_name_vote(_id uuid, _vote text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _vote IS NULL OR _vote = '' THEN
    UPDATE public.name_ideas
       SET votes = votes - auth.uid()::text
     WHERE id = _id AND family_id = public.my_family_id();
  ELSE
    UPDATE public.name_ideas
       SET votes = jsonb_set(coalesce(votes, '{}'::jsonb), array[auth.uid()::text], to_jsonb(_vote), true)
     WHERE id = _id AND family_id = public.my_family_id();
  END IF;
END; $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.name_ideas;