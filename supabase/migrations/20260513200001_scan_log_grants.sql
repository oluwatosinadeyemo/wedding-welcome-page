-- Grant anon role permission to insert and read scan_log
-- (RLS policies alone don't grant privileges — role grants are also required)
GRANT INSERT ON public.scan_log TO anon;
GRANT SELECT ON public.scan_log TO anon;
