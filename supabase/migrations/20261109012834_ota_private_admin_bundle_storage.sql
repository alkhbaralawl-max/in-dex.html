-- Private OTA storage for the admin app. No admin ZIP or manifest is public.
create table if not exists public.ota_publish_keys (
  id text primary key check (id = 'admin'),
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default now()
);
alter table public.ota_publish_keys enable row level security;
revoke all on table public.ota_publish_keys from public, anon, authenticated;
grant select on table public.ota_publish_keys to service_role;
drop policy if exists ota_publish_keys_service_role_only on public.ota_publish_keys;
create policy ota_publish_keys_service_role_only
  on public.ota_publish_keys
  for select
  to service_role
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ota-admin', 'ota-admin', false, 52428800, array['application/zip', 'application/json'])
on conflict (id) do update
set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/zip', 'application/json'];

-- The production publisher token hash is provisioned out-of-band and must never be committed.
