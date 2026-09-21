-- First-party visitor analytics (page views, clicks, referrer/source)
CREATE TABLE IF NOT EXISTS public.site_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'click')),
  path TEXT NOT NULL,
  event_name TEXT,
  target_path TEXT,
  session_id TEXT NOT NULL,
  visitor_id TEXT,
  referrer TEXT,
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  entry_path TEXT,
  campaign_source TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_analytics_events_created_at_idx
  ON public.site_analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS site_analytics_events_event_type_idx
  ON public.site_analytics_events (event_type);

CREATE INDEX IF NOT EXISTS site_analytics_events_path_idx
  ON public.site_analytics_events (path);

CREATE INDEX IF NOT EXISTS site_analytics_events_session_id_idx
  ON public.site_analytics_events (session_id);

CREATE INDEX IF NOT EXISTS site_analytics_events_referrer_host_idx
  ON public.site_analytics_events (referrer_host);

GRANT ALL ON public.site_analytics_events TO service_role;

ALTER TABLE public.site_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.site_analytics_events;
CREATE POLICY "Service role full access"
  ON public.site_analytics_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
