-- Close HTTP extension to browser-facing roles and add private legacy import storage.
revoke all on all functions in schema extensions from public, anon, authenticated;
revoke usage on schema extensions from public, anon, authenticated;
grant usage on schema extensions to service_role, supabase_admin;

create table if not exists public.app_config (
  singleton boolean primary key default true check(singleton),
  config jsonb not null default '{}'::jsonb,
  migrated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
revoke all on table public.app_config from public, anon, authenticated;
grant all on table public.app_config to service_role;

create table if not exists public.legacy_archive (
  id bigint generated always as identity primary key,
  source_path text not null,
  legacy_key text not null,
  owner_user_id uuid references public.app_users(id) on delete set null,
  payload jsonb not null,
  source_created_at timestamptz,
  imported_at timestamptz not null default now(),
  unique(source_path,legacy_key)
);
create index if not exists legacy_archive_user_idx on public.legacy_archive(owner_user_id,source_path);
create index if not exists legacy_archive_source_idx on public.legacy_archive(source_path,imported_at desc);
alter table public.legacy_archive enable row level security;
revoke all on table public.legacy_archive from public, anon, authenticated;
grant all on table public.legacy_archive to service_role;
