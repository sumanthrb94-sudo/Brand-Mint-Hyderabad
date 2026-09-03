-- ============================================================================
-- Brand Mint — Auth, client portal and onboarding.
--
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL Editor → New query
-- → paste → Run). It is written to be idempotent: running it twice is safe.
--
-- What it establishes
--   * `profiles`      — one row per auth user, carrying the role (admin|client)
--   * `client_users`  — which auth users may see which client
--   * `invites`       — an admin pre-authorises an email before they ever log in
--   * portal tables   — milestones, deliverables, messages, onboarding_responses
--   * RLS on EVERY table: an admin sees everything, a client sees only rows
--     belonging to a client they are a member of, and anon sees nothing except
--     the public lead-capture insert.
--
-- Read `SETUP-AUTH.md` in the repo root for the dashboard steps that go with it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Profiles — role lives here, NOT in JWT metadata.
--
-- Putting the role in a table (rather than user_metadata) matters: a user can
-- edit their own user_metadata via the client SDK, so a metadata-based role
-- check is trivially bypassable. This table is writable only by admins.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  role        text not null default 'client' check (role in ('admin', 'client')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Membership — maps an auth user to a client record.
-- ---------------------------------------------------------------------------
create table if not exists public.client_users (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

create index if not exists client_users_user_idx   on public.client_users(user_id);
create index if not exists client_users_client_idx on public.client_users(client_id);

-- ---------------------------------------------------------------------------
-- 3. Invites — an admin authorises an email before the person signs in.
--
-- The client signs in with Google using that exact address; a trigger on
-- auth.users then converts the pending invite into a real membership. This is
-- what makes "admin manually adds the client, client just signs in with
-- Google" work without the client ever needing a password.
-- ---------------------------------------------------------------------------
create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  client_id   uuid not null,
  role        text not null default 'client' check (role in ('admin', 'client')),
  invited_by  uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create unique index if not exists invites_email_client_idx
  on public.invites (lower(email), client_id);
create index if not exists invites_email_idx on public.invites (lower(email));

-- ---------------------------------------------------------------------------
-- 4. Helper functions.
--
-- SECURITY DEFINER + a locked-down search_path. These are called from RLS
-- policies; without SECURITY DEFINER the policy on `profiles` would recurse
-- into itself when checking whether the caller is an admin.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.my_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select cu.client_id from public.client_users cu where cu.user_id = auth.uid();
$$;

-- True when the caller is an admin, or a member of the given client.
create or replace function public.can_see_client(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin()
      or (target is not null and exists (
            select 1 from public.client_users cu
            where cu.user_id = auth.uid() and cu.client_id = target
         ));
$$;

grant execute on function public.is_admin()              to authenticated;
grant execute on function public.my_client_ids()         to authenticated;
grant execute on function public.can_see_client(uuid)    to authenticated;

-- ---------------------------------------------------------------------------
-- 5. New-user trigger — create the profile, and honour any pending invite.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv record;
  assigned_role text := 'client';
begin
  -- An invite decides the role; with no invite the user is a plain client
  -- with no memberships, so RLS shows them nothing.
  select * into inv
    from public.invites
   where lower(email) = lower(new.email)
     and accepted_at is null
   order by created_at asc
   limit 1;

  if inv.id is not null then
    assigned_role := inv.role;
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    assigned_role
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  -- Accept every pending invite for this address, not just the first, so one
  -- person can be attached to several clients.
  insert into public.client_users (client_id, user_id, role)
  select i.client_id, new.id, 'owner'
    from public.invites i
   where lower(i.email) = lower(new.email)
     and i.accepted_at is null
  on conflict (client_id, user_id) do nothing;

  update public.invites
     set accepted_at = now()
   where lower(email) = lower(new.email)
     and accepted_at is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. Link the existing business tables to a client id.
--
-- The app historically joined by client NAME (projects.client = 'Verdant
-- Foods'). That is fine for a single admin but useless as a security boundary,
-- so we add a real foreign key and backfill it from the name. The old text
-- column stays so existing admin modules keep rendering.
-- ---------------------------------------------------------------------------
alter table public.projects  add column if not exists client_id uuid;
alter table public.invoices  add column if not exists client_id uuid;
alter table public.leads     add column if not exists client_id uuid;

update public.projects p
   set client_id = c.id
  from public.clients c
 where p.client_id is null and p.client = c.name;

update public.invoices i
   set client_id = c.id
  from public.clients c
 where i.client_id is null and i.client = c.name;

create index if not exists projects_client_idx on public.projects(client_id);
create index if not exists invoices_client_idx on public.invoices(client_id);

-- Clients get a portal-facing status of their own.
alter table public.clients add column if not exists onboarding_status text
  not null default 'not_started'
  check (onboarding_status in ('not_started', 'invited', 'in_progress', 'submitted', 'complete'));
alter table public.clients add column if not exists portal_enabled boolean not null default true;

-- ---------------------------------------------------------------------------
-- 7. Portal tables.
-- ---------------------------------------------------------------------------

-- 7a. Onboarding brief — one row per client, filled in by the CLIENT.
create table if not exists public.onboarding_responses (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null,
  submitted_by  uuid references auth.users(id) on delete set null,
  -- Free-form so the questionnaire can change without a migration.
  answers       jsonb not null default '{}'::jsonb,
  step          integer not null default 0,
  status        text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (client_id)
);

-- 7b. Milestones — the timeline the client watches.
create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid,
  client_id   uuid not null,
  title       text not null,
  detail      text,
  due_date    date,
  position    integer not null default 0,
  status      text not null default 'upcoming'
              check (status in ('upcoming', 'in_progress', 'blocked', 'done')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists milestones_client_idx  on public.milestones(client_id);
create index if not exists milestones_project_idx on public.milestones(project_id);

-- 7c. Deliverables — files the client downloads, approves or sends back.
create table if not exists public.deliverables (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid,
  client_id      uuid not null,
  title          text not null,
  description    text,
  kind           text not null default 'file'
                 check (kind in ('file', 'link', 'preview')),
  url            text,
  storage_path   text,
  version        integer not null default 1,
  status         text not null default 'draft'
                 check (status in ('draft', 'awaiting_review', 'approved', 'revision_requested')),
  -- Client's verdict, written by the client and read by the admin.
  reviewed_by    uuid references auth.users(id) on delete set null,
  reviewed_at    timestamptz,
  revision_note  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists deliverables_client_idx  on public.deliverables(client_id);
create index if not exists deliverables_project_idx on public.deliverables(project_id);

-- 7d. Messages — a thread per client (optionally scoped to a project).
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null,
  project_id   uuid,
  author_id    uuid references auth.users(id) on delete set null,
  author_name  text,
  author_role  text not null default 'client' check (author_role in ('admin', 'client')),
  body         text not null,
  read_by_admin  boolean not null default false,
  read_by_client boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists messages_client_idx on public.messages(client_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 8. Row Level Security.
--
-- Everything below is the actual security boundary. The anon key is published
-- in the client bundle, so these policies are what stop a stranger reading
-- your leads, invoices and bank details.
-- ---------------------------------------------------------------------------

alter table public.profiles             enable row level security;
alter table public.client_users         enable row level security;
alter table public.invites              enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.milestones           enable row level security;
alter table public.deliverables         enable row level security;
alter table public.messages             enable row level security;
alter table public.clients              enable row level security;
alter table public.projects             enable row level security;
alter table public.invoices             enable row level security;
alter table public.leads                enable row level security;
alter table public.content              enable row level security;
alter table public.settings             enable row level security;

-- Drop-then-create so re-running the file doesn't error on existing policies.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('profiles','client_users','invites','onboarding_responses',
                         'milestones','deliverables','messages','clients','projects',
                         'invoices','leads','content','settings')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 8a. profiles — you can read and edit your own; admins manage everyone.
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_admin_write on public.profiles
  for insert to authenticated with check (public.is_admin());
create policy profiles_admin_delete on public.profiles
  for delete to authenticated using (public.is_admin());

-- NOTE: a non-admin can update their own profile row, which includes the
-- `role` column. The trigger below stops that being a privilege escalation.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only an admin may change a role';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_profile_role_trg on public.profiles;
create trigger guard_profile_role_trg
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- 8b. client_users — you may see your own memberships; only admins grant them.
create policy client_users_select on public.client_users
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy client_users_admin_all on public.client_users
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 8c. invites — admin only. A pending invite is consumed by the signup
-- trigger (SECURITY DEFINER), so the invitee never needs to read this table.
create policy invites_admin_all on public.invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 8d. clients — admin sees all; a client sees only the client record they
-- belong to, and may not modify it.
create policy clients_select on public.clients
  for select to authenticated
  using (public.is_admin() or id in (select public.my_client_ids()));
create policy clients_admin_write on public.clients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 8e. projects / invoices — scoped by client_id.
create policy projects_select on public.projects
  for select to authenticated
  using (public.is_admin() or client_id in (select public.my_client_ids()));
create policy projects_admin_write on public.projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy invoices_select on public.invoices
  for select to authenticated
  using (public.is_admin() or client_id in (select public.my_client_ids()));
create policy invoices_admin_write on public.invoices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 8f. leads — the public contact form inserts as anon; only admins read.
create policy leads_anon_insert on public.leads
  for insert to anon, authenticated with check (true);
create policy leads_admin_read on public.leads
  for select to authenticated using (public.is_admin());
create policy leads_admin_write on public.leads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy leads_admin_delete on public.leads
  for delete to authenticated using (public.is_admin());

-- 8g. content + settings — admin only. Settings carries bank details.
create policy content_admin_all on public.content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_admin_all on public.settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 8h. onboarding_responses — the client writes their own brief; admin reads
-- and may amend it.
create policy onboarding_select on public.onboarding_responses
  for select to authenticated using (public.can_see_client(client_id));
create policy onboarding_client_insert on public.onboarding_responses
  for insert to authenticated with check (public.can_see_client(client_id));
create policy onboarding_client_update on public.onboarding_responses
  for update to authenticated
  using (public.can_see_client(client_id))
  with check (public.can_see_client(client_id));
create policy onboarding_admin_delete on public.onboarding_responses
  for delete to authenticated using (public.is_admin());

-- 8i. milestones — client reads, admin writes.
create policy milestones_select on public.milestones
  for select to authenticated using (public.can_see_client(client_id));
create policy milestones_admin_write on public.milestones
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 8j. deliverables — client reads and may record a verdict; admin owns the row.
create policy deliverables_select on public.deliverables
  for select to authenticated
  using (public.is_admin() or (client_id in (select public.my_client_ids()) and status <> 'draft'));
create policy deliverables_client_review on public.deliverables
  for update to authenticated
  using (client_id in (select public.my_client_ids()) and status <> 'draft')
  with check (client_id in (select public.my_client_ids()));
create policy deliverables_admin_write on public.deliverables
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A client may only move a deliverable between review states — never rename
-- it, re-point its URL, or bump its version.
create or replace function public.guard_deliverable_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    if new.status not in ('approved', 'revision_requested') then
      raise exception 'a client may only approve or request a revision';
    end if;
    new.title        := old.title;
    new.description  := old.description;
    new.kind         := old.kind;
    new.url          := old.url;
    new.storage_path := old.storage_path;
    new.version      := old.version;
    new.project_id   := old.project_id;
    new.client_id    := old.client_id;
    new.reviewed_by  := auth.uid();
    new.reviewed_at  := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_deliverable_review_trg on public.deliverables;
create trigger guard_deliverable_review_trg
  before update on public.deliverables
  for each row execute function public.guard_deliverable_review();

-- 8k. messages — both sides read the thread; each may post as themselves.
create policy messages_select on public.messages
  for select to authenticated using (public.can_see_client(client_id));
create policy messages_insert on public.messages
  for insert to authenticated
  with check (public.can_see_client(client_id) and author_id = auth.uid());
create policy messages_update_read on public.messages
  for update to authenticated
  using (public.can_see_client(client_id))
  with check (public.can_see_client(client_id));
create policy messages_admin_delete on public.messages
  for delete to authenticated using (public.is_admin());

-- Stop a client posting a message stamped as coming from the agency.
create or replace function public.guard_message_author()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.author_role := case when public.is_admin() then 'admin' else 'client' end;
  new.author_id   := auth.uid();
  return new;
end;
$$;

drop trigger if exists guard_message_author_trg on public.messages;
create trigger guard_message_author_trg
  before insert on public.messages
  for each row execute function public.guard_message_author();

-- The update policy exists so each side can mark a thread read. Freeze every
-- other column, or a client could rewrite the agency's messages in place.
create or replace function public.guard_message_edit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.id          := old.id;
  new.client_id   := old.client_id;
  new.project_id  := old.project_id;
  new.author_id   := old.author_id;
  new.author_name := old.author_name;
  new.author_role := old.author_role;
  new.body        := old.body;
  new.created_at  := old.created_at;
  if public.is_admin() then
    new.read_by_client := old.read_by_client;
  else
    new.read_by_admin := old.read_by_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_message_edit_trg on public.messages;
create trigger guard_message_edit_trg
  before update on public.messages
  for each row execute function public.guard_message_edit();

-- ---------------------------------------------------------------------------
-- 9. Realtime — so the admin sees a client's approval land without a refresh.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['milestones','deliverables','messages','onboarding_responses']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
             when undefined_object  then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Grants. RLS still applies on top of these.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant insert on public.leads to anon;

-- ============================================================================
-- AFTER RUNNING THIS FILE: promote yourself to admin. Sign in once at
-- /admin.html with your Google account so the row exists, then run:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- See SETUP-AUTH.md for the full checklist.
-- ============================================================================
