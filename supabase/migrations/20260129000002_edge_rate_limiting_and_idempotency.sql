-- Edge Function rate limiting + idempotency (contact notifications)
-- Prevents runaway Edge Function invocations (bots / double-submits).

CREATE TABLE IF NOT EXISTS public.edge_idempotency_keys (
  key TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  ip TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'started', -- started | sent
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.edge_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage (service role bypasses RLS for Edge Functions).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'edge_idempotency_keys'
      AND policyname = 'edge_idempotency_keys_admin'
  ) THEN
    CREATE POLICY "edge_idempotency_keys_admin"
    ON public.edge_idempotency_keys
    FOR ALL
    USING (public.is_admin((select auth.uid())))
    WITH CHECK (public.is_admin((select auth.uid())));
  END IF;
END $$;

-- Helpful indexes for rate limit queries
CREATE INDEX IF NOT EXISTS idx_edge_idem_route_created_at
  ON public.edge_idempotency_keys(route, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_idem_route_ip_created_at
  ON public.edge_idempotency_keys(route, ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_idem_route_email_created_at
  ON public.edge_idempotency_keys(route, email, created_at DESC);

-- Keep updated_at in sync
DROP TRIGGER IF EXISTS update_edge_idempotency_keys_updated_at ON public.edge_idempotency_keys;
CREATE TRIGGER update_edge_idempotency_keys_updated_at
BEFORE UPDATE ON public.edge_idempotency_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

