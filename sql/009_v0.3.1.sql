-- ============================================================================
-- v0.3.1 - Add updated_at to chapter_quests
-- ============================================================================

begin;

-- 1) Add column (if not exists)
alter table public.chapter_quests
    add column if not exists updated_at timestamptz;

-- 2) Backfill existing rows
update public.chapter_quests
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

-- 3) Make it not null + default now()
alter table public.chapter_quests
    alter column updated_at set default now();

alter table public.chapter_quests
    alter column updated_at set not null;

-- 4) Trigger function to auto-update updated_at on UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- 5) Create trigger on chapter_quests
drop trigger if exists chapter_quests_set_updated_at on public.chapter_quests;

create trigger chapter_quests_set_updated_at
before update on public.chapter_quests
for each row
execute function public.set_updated_at();

-- 6) Helpful index (optional)
create index if not exists chapter_quests_updated_at_idx
    on public.chapter_quests (updated_at desc);

commit;