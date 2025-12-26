-- v0.1.0 — Unique instance_code per session
-- AFTER session_id backfill

create unique index if not exists adventures_session_instance_code_uniq
on public.adventures (session_id, instance_code)
where session_id is not null
  and instance_code is not null
  and instance_code <> '';