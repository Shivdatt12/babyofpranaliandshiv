DROP POLICY IF EXISTS "family lifetime records" ON public.lifetime_records;
CREATE POLICY "family lifetime records"
ON public.lifetime_records
FOR ALL
TO authenticated
USING (family_id = public.my_family_id())
WITH CHECK (
  family_id = public.my_family_id()
  AND EXISTS (
    SELECT 1
    FROM public.babies b
    WHERE b.id = lifetime_records.baby_id
      AND b.family_id = lifetime_records.family_id
  )
);

DROP POLICY IF EXISTS "family medical documents" ON public.medical_documents;
CREATE POLICY "family medical documents"
ON public.medical_documents
FOR ALL
TO authenticated
USING (family_id = public.my_family_id())
WITH CHECK (
  family_id = public.my_family_id()
  AND EXISTS (
    SELECT 1
    FROM public.babies b
    WHERE b.id = medical_documents.baby_id
      AND b.family_id = medical_documents.family_id
  )
);