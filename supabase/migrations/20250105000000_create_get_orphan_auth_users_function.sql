CREATE OR REPLACE FUNCTION get_orphan_auth_users()
RETURNS TABLE (id uuid)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT u.id
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE p.user_id IS NULL;
$$;

