
CREATE TYPE public.report_target AS ENUM ('event', 'photo');
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'dismissed');

ALTER TABLE public.events ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  event_id uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  status public.report_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX idx_reports_event ON public.reports(event_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reporter views own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "host views reports" ON public.reports
  FOR SELECT USING (public.can_manage_event(event_id, auth.uid()));

CREATE POLICY "host updates reports" ON public.reports
  FOR UPDATE USING (public.can_manage_event(event_id, auth.uid()));
