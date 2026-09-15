ALTER TABLE public.babies
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

UPDATE public.babies SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE public.babies ALTER COLUMN id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS babies_id_key ON public.babies (id);

ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS baby_id uuid REFERENCES public.babies(id) ON DELETE CASCADE;
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS baby_id uuid REFERENCES public.babies(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS baby_id uuid REFERENCES public.babies(id) ON DELETE CASCADE;
ALTER TABLE public.vaccines ADD COLUMN IF NOT EXISTS baby_id uuid REFERENCES public.babies(id) ON DELETE CASCADE;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS baby_id uuid REFERENCES public.babies(id) ON DELETE CASCADE;
ALTER TABLE public.active_timers ADD COLUMN IF NOT EXISTS baby_id uuid REFERENCES public.babies(id) ON DELETE CASCADE;
ALTER TABLE public.name_ideas ADD COLUMN IF NOT EXISTS baby_id uuid REFERENCES public.babies(id) ON DELETE CASCADE;

ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.vaccines ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.entries t SET baby_id = b.id FROM public.babies b WHERE t.family_id = b.family_id AND t.baby_id IS NULL;
UPDATE public.medicines t SET baby_id = b.id FROM public.babies b WHERE t.family_id = b.family_id AND t.baby_id IS NULL;
UPDATE public.appointments t SET baby_id = b.id FROM public.babies b WHERE t.family_id = b.family_id AND t.baby_id IS NULL;
UPDATE public.vaccines t SET baby_id = b.id FROM public.babies b WHERE t.family_id = b.family_id AND t.baby_id IS NULL;
UPDATE public.milestones t SET baby_id = b.id FROM public.babies b WHERE t.family_id = b.family_id AND t.baby_id IS NULL;
UPDATE public.active_timers t SET baby_id = b.id FROM public.babies b WHERE t.family_id = b.family_id AND t.baby_id IS NULL;
UPDATE public.name_ideas t SET baby_id = b.id FROM public.babies b WHERE t.family_id = b.family_id AND t.baby_id IS NULL;

CREATE OR REPLACE FUNCTION public.assign_family_baby_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.baby_id IS NULL THEN
    SELECT id INTO NEW.baby_id FROM public.babies WHERE family_id = NEW.family_id;
  END IF;
  IF NEW.baby_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.babies WHERE id = NEW.baby_id AND family_id = NEW.family_id
  ) THEN
    RAISE EXCEPTION 'Baby does not belong to this family';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_entries_baby_id ON public.entries;
CREATE TRIGGER assign_entries_baby_id BEFORE INSERT OR UPDATE OF family_id, baby_id ON public.entries FOR EACH ROW EXECUTE FUNCTION public.assign_family_baby_id();
DROP TRIGGER IF EXISTS assign_medicines_baby_id ON public.medicines;
CREATE TRIGGER assign_medicines_baby_id BEFORE INSERT OR UPDATE OF family_id, baby_id ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.assign_family_baby_id();
DROP TRIGGER IF EXISTS assign_appointments_baby_id ON public.appointments;
CREATE TRIGGER assign_appointments_baby_id BEFORE INSERT OR UPDATE OF family_id, baby_id ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.assign_family_baby_id();
DROP TRIGGER IF EXISTS assign_vaccines_baby_id ON public.vaccines;
CREATE TRIGGER assign_vaccines_baby_id BEFORE INSERT OR UPDATE OF family_id, baby_id ON public.vaccines FOR EACH ROW EXECUTE FUNCTION public.assign_family_baby_id();
DROP TRIGGER IF EXISTS assign_milestones_baby_id ON public.milestones;
CREATE TRIGGER assign_milestones_baby_id BEFORE INSERT OR UPDATE OF family_id, baby_id ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.assign_family_baby_id();
DROP TRIGGER IF EXISTS assign_active_timers_baby_id ON public.active_timers;
CREATE TRIGGER assign_active_timers_baby_id BEFORE INSERT OR UPDATE OF family_id, baby_id ON public.active_timers FOR EACH ROW EXECUTE FUNCTION public.assign_family_baby_id();
DROP TRIGGER IF EXISTS assign_name_ideas_baby_id ON public.name_ideas;
CREATE TRIGGER assign_name_ideas_baby_id BEFORE INSERT OR UPDATE OF family_id, baby_id ON public.name_ideas FOR EACH ROW EXECUTE FUNCTION public.assign_family_baby_id();

CREATE TABLE public.lifetime_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id uuid NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('health','growth','life_event','important_event')),
  event_type text NOT NULL,
  event_at timestamptz NOT NULL,
  has_time boolean NOT NULL DEFAULT true,
  title text NOT NULL,
  description text,
  notes text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_paths text[] NOT NULL DEFAULT '{}'::text[],
  created_by uuid,
  source text NOT NULL DEFAULT 'parent',
  source_device text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lifetime_records TO authenticated;
GRANT ALL ON public.lifetime_records TO service_role;
ALTER TABLE public.lifetime_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family lifetime records" ON public.lifetime_records
  FOR ALL TO authenticated
  USING (family_id = public.my_family_id())
  WITH CHECK (
    family_id = public.my_family_id()
    AND EXISTS (SELECT 1 FROM public.babies b WHERE b.id = baby_id AND b.family_id = family_id)
  );

CREATE TABLE public.medical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id uuid NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('prescription','lab_report','vaccination_certificate','discharge_summary','doctor_document','medical_photo','other')),
  title text NOT NULL,
  note text,
  document_at timestamptz NOT NULL,
  object_path text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  created_by uuid,
  source text NOT NULL DEFAULT 'parent',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, object_path)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_documents TO authenticated;
GRANT ALL ON public.medical_documents TO service_role;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family medical documents" ON public.medical_documents
  FOR ALL TO authenticated
  USING (family_id = public.my_family_id())
  WITH CHECK (
    family_id = public.my_family_id()
    AND EXISTS (SELECT 1 FROM public.babies b WHERE b.id = baby_id AND b.family_id = family_id)
  );

CREATE TRIGGER t_lifetime_records BEFORE UPDATE ON public.lifetime_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_medical_documents BEFORE UPDATE ON public.medical_documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS entries_family_baby_at_idx ON public.entries (family_id, baby_id, at DESC, id);
CREATE INDEX IF NOT EXISTS medicines_family_baby_idx ON public.medicines (family_id, baby_id);
CREATE INDEX IF NOT EXISTS appointments_family_baby_idx ON public.appointments (family_id, baby_id);
CREATE INDEX IF NOT EXISTS vaccines_family_baby_idx ON public.vaccines (family_id, baby_id);
CREATE INDEX IF NOT EXISTS milestones_family_baby_idx ON public.milestones (family_id, baby_id);
CREATE INDEX lifetime_records_family_baby_at_idx ON public.lifetime_records (family_id, baby_id, event_at DESC, id);
CREATE INDEX lifetime_records_family_category_at_idx ON public.lifetime_records (family_id, category, event_at DESC, id);
CREATE INDEX medical_documents_family_baby_at_idx ON public.medical_documents (family_id, baby_id, document_at DESC, id);
CREATE INDEX medical_documents_family_category_at_idx ON public.medical_documents (family_id, category, document_at DESC, id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.lifetime_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_documents;