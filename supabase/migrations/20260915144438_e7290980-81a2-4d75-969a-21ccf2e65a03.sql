REVOKE ALL ON FUNCTION public.assign_family_baby_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_family_baby_id() TO service_role;