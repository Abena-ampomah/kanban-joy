-- Add archive support to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Function to permanently delete old archived tasks (6 months+)
CREATE OR REPLACE FUNCTION public.permanently_delete_old_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.tasks
  WHERE is_archived = true
    AND archived_at < now() - interval '6 months';
END;
$$;

-- Note: In a production environment, you would enable pg_cron and schedule it:
-- SELECT cron.schedule('0 0 * * *', 'SELECT public.permanently_delete_old_tasks()');
