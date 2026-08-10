
REVOKE ALL ON FUNCTION public.my_family_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_family_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_family_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_family_by_code(text) TO authenticated;
