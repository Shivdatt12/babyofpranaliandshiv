REVOKE ALL ON FUNCTION public.set_name_vote(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_name_vote(uuid, text) TO authenticated;