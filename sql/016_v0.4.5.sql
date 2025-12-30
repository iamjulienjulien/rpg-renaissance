-- 001_user_contexts.sql

create table if not exists public.user_contexts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users (id) on delete cascade,

    context_self text null,
    context_family text null,
    context_home text null,
    context_routine text null,
    context_challenges text null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_user_contexts_updated_at on public.user_contexts;

create trigger trg_user_contexts_updated_at
before update on public.user_contexts
for each row
execute function public.set_updated_at();

-- RLS
alter table public.user_contexts enable row level security;

drop policy if exists "user_contexts_select_own" on public.user_contexts;
drop policy if exists "user_contexts_insert_own" on public.user_contexts;
drop policy if exists "user_contexts_update_own" on public.user_contexts;
drop policy if exists "user_contexts_delete_own" on public.user_contexts;

create policy "user_contexts_select_own"
on public.user_contexts
for select
to authenticated
using (user_id = auth.uid());

create policy "user_contexts_insert_own"
on public.user_contexts
for insert
to authenticated
with check (user_id = auth.uid());

create policy "user_contexts_update_own"
on public.user_contexts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "user_contexts_delete_own"
on public.user_contexts
for delete
to authenticated
using (user_id = auth.uid());