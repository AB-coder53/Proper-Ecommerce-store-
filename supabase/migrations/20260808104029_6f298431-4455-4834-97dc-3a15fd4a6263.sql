CREATE TABLE public.prelaunch_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  city TEXT,
  products TEXT[] NOT NULL DEFAULT '{}',
  preferred_size TEXT,
  preferred_color TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  whatsapp_optin BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  discount_code TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.prelaunch_leads TO service_role;

ALTER TABLE public.prelaunch_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX prelaunch_leads_created_at_idx ON public.prelaunch_leads (created_at DESC);