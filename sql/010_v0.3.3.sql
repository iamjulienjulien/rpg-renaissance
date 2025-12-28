-- v0.3.3 - Quest enrichment (urgency + priority)
-- Table: adventure_quests
-- Adds:
--  - urgency  : low | normal | high (default normal)
--  - priority : secondary | main     (default secondary)

begin;

-- 1) Add columns (safe defaults)
alter table public.adventure_quests
    add column if not exists urgency text not null default 'normal',
    add column if not exists priority text not null default 'secondary';

-- 2) Add constraints (idempotent via DO blocks)
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'adventure_quests_urgency_check'
    ) then
        alter table public.adventure_quests
            add constraint adventure_quests_urgency_check
            check (urgency in ('low', 'normal', 'high'));
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'adventure_quests_priority_check'
    ) then
        alter table public.adventure_quests
            add constraint adventure_quests_priority_check
            check (priority in ('secondary', 'main'));
    end if;
end $$;

-- 3) Optional: simple indexes if you plan to sort/filter by these often
-- (You can comment these out if you want to keep it minimal for now.)
create index if not exists adventure_quests_priority_idx on public.adventure_quests (priority);
create index if not exists adventure_quests_urgency_idx on public.adventure_quests (urgency);

commit;