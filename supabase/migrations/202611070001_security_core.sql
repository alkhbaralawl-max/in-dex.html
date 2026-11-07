-- Rukn Al-Gharb secure backend foundation. All app tables are server-only.
create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  singleton boolean primary key default true check (singleton),
  registration_enabled boolean not null default true,
  initial_virtual_balance numeric(14,2) not null default 100000,
  new_accounts_start_at_zero boolean not null default false,
  min_virtual_stake numeric(14,2) not null default 1,
  max_virtual_stake numeric(14,2) not null default 0
);
insert into public.app_settings(singleton) values (true) on conflict do nothing;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_normalized text not null unique check (username_normalized ~ '^[a-z0-9_]{3,20}$'),
  display_name text,
  role text not null default 'player' check (role in ('player','admin')),
  status text not null default 'active' check (status in ('active','closed','locked')),
  password_hash text,
  legacy_password_hash text,
  profile jsonb not null default '{}'::jsonb,
  customer_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  check (password_hash is not null or legacy_password_hash is not null)
);
create table if not exists public.wallets (
  user_id uuid primary key references public.app_users(id) on delete restrict,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  registration_bonus numeric(14,2) not null default 0,
  rounds bigint not null default 0,
  wins bigint not null default 0,
  losses bigint not null default 0,
  wagered numeric(16,2) not null default 0,
  returned numeric(16,2) not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique, csrf_token text not null, created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(), expires_at timestamptz not null, revoked_at timestamptz,
  ip_hash text, user_agent text
);
create index if not exists app_sessions_user_idx on public.app_sessions(user_id, expires_at) where revoked_at is null;

create table if not exists public.wallet_ledger (
  id bigint generated always as identity primary key, user_id uuid not null references public.app_users(id) on delete restrict,
  event_type text not null, amount_delta numeric(16,2) not null, balance_before numeric(14,2) not null,
  balance_after numeric(14,2) not null check (balance_after >= 0), reference_type text, reference_id text,
  idempotency_key text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create unique index if not exists wallet_ledger_idem_idx on public.wallet_ledger(user_id,idempotency_key) where idempotency_key is not null;
create index if not exists wallet_ledger_user_idx on public.wallet_ledger(user_id,created_at desc);

create table if not exists public.game_rounds (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(id) on delete restrict,
  game_id text not null, stake numeric(14,2) not null check (stake > 0), payout numeric(14,2) not null check (payout >= 0),
  outcome jsonb not null default '{}'::jsonb, idempotency_key text not null, created_at timestamptz not null default now(),
  unique(user_id,idempotency_key)
);
create table if not exists public.matches (
  id text primary key, payload jsonb not null, status text not null default 'open', kickoff_at timestamptz, updated_at timestamptz not null default now()
);
create table if not exists public.sports_bets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(id) on delete restrict,
  match_id text not null references public.matches(id) on delete restrict, market_id text not null, option_id text not null,
  match_snapshot jsonb not null, stake numeric(14,2) not null check (stake > 0), odds numeric(10,4) not null check (odds >= 1.01),
  status text not null default 'pending' check (status in ('pending','won','lost','void')), payout numeric(14,2) not null default 0,
  created_at timestamptz not null default now(), settled_at timestamptz, idempotency_key text not null, unique(user_id,idempotency_key)
);
create index if not exists sports_bets_pending_idx on public.sports_bets(match_id) where status='pending';
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key, user_id uuid not null references public.app_users(id) on delete restrict,
  sender_role text not null check (sender_role in ('player','admin','system')),
  message text not null check (length(message) between 1 and 2000), created_at timestamptz not null default now(), read_at timestamptz
);
create table if not exists public.virtual_credit_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.app_users(id) on delete restrict,
  requested_amount numeric(14,2) not null check (requested_amount > 0), note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.app_users(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, actor_user_id uuid references public.app_users(id) on delete set null,
  target_user_id uuid references public.app_users(id) on delete set null, action text not null,
  entity_type text, entity_id text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create table if not exists public.auth_attempts (
  id bigint generated always as identity primary key, username_normalized text not null, ip_hash text,
  succeeded boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists auth_attempts_name_idx on public.auth_attempts(username_normalized,created_at desc);
create index if not exists auth_attempts_ip_idx on public.auth_attempts(ip_hash,created_at desc);

create or replace function public.create_player_account(p_username text,p_password_hash text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_balance numeric(14,2);
begin
  if p_username is null or p_username !~ '^[a-zA-Z0-9_]{3,20}$' or p_password_hash is null or length(p_password_hash)<40 then
    raise exception 'invalid_registration' using errcode='22023';
  end if;
  if not exists(select 1 from public.app_settings s where s.singleton and s.registration_enabled) then
    raise exception 'registration_closed' using errcode='P0001';
  end if;
  select case when new_accounts_start_at_zero then 0 else initial_virtual_balance end into v_balance from public.app_settings where singleton;
  insert into public.app_users(username,username_normalized,password_hash) values(p_username,lower(p_username),p_password_hash) returning id into v_id;
  insert into public.wallets(user_id,balance,registration_bonus) values(v_id,v_balance,v_balance);
  if v_balance>0 then
    insert into public.wallet_ledger(user_id,event_type,amount_delta,balance_before,balance_after,reference_type,reference_id)
    values(v_id,'registration_bonus',v_balance,0,v_balance,'account',v_id::text);
  end if;
  insert into public.audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id)
  values(v_id,v_id,'account.registered','user',v_id::text);
  return v_id;
end; $$;

-- Server-only transaction. Never expose a client endpoint accepting arbitrary payout values.
create or replace function public.record_virtual_game_round(
  p_user_id uuid,p_game_id text,p_stake numeric,p_payout numeric,p_outcome jsonb,p_idempotency_key text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare w public.wallets%rowtype; v_min numeric(14,2); v_max numeric(14,2); v_before numeric(14,2); v_after numeric(14,2); v_round uuid;
begin
  if p_stake<=0 or p_payout<0 or p_game_id is null or length(p_game_id)>40 or p_idempotency_key is null then
    raise exception 'invalid_game_request' using errcode='22023'; end if;
  select id into v_round from public.game_rounds where user_id=p_user_id and idempotency_key=p_idempotency_key;
  if v_round is not null then select balance into v_after from public.wallets where user_id=p_user_id;
    return jsonb_build_object('round_id',v_round,'balance',v_after,'duplicate',true); end if;
  select min_virtual_stake,max_virtual_stake into v_min,v_max from public.app_settings where singleton;
  if p_stake<coalesce(v_min,1) or (coalesce(v_max,0)>0 and p_stake>v_max) then raise exception 'stake_out_of_range'; end if;
  select * into w from public.wallets where user_id=p_user_id for update;
  if not found or w.balance<p_stake then raise exception 'insufficient_virtual_balance'; end if;
  if (select status from public.app_users where id=p_user_id)<>'active' then raise exception 'account_unavailable'; end if;
  v_before:=w.balance; v_after:=round(v_before-p_stake+p_payout,2);
  insert into public.game_rounds(user_id,game_id,stake,payout,outcome,idempotency_key)
  values(p_user_id,p_game_id,p_stake,p_payout,coalesce(p_outcome,'{}'::jsonb),p_idempotency_key) returning id into v_round;
  update public.wallets set balance=v_after,wagered=wagered+p_stake,returned=returned+p_payout,rounds=rounds+1,
    wins=wins+case when p_payout>p_stake then 1 else 0 end,
    losses=losses+case when p_payout<p_stake then 1 else 0 end,updated_at=now() where user_id=p_user_id;
  insert into public.wallet_ledger(user_id,event_type,amount_delta,balance_before,balance_after,reference_type,reference_id,idempotency_key)
  values(p_user_id,'game_stake',-p_stake,v_before,round(v_before-p_stake,2),'game_round',v_round::text,p_idempotency_key||':stake');
  if p_payout>0 then insert into public.wallet_ledger(user_id,event_type,amount_delta,balance_before,balance_after,reference_type,reference_id,idempotency_key)
    values(p_user_id,'game_payout',p_payout,round(v_before-p_stake,2),v_after,'game_round',v_round::text,p_idempotency_key||':payout'); end if;
  insert into public.audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id,details)
  values(p_user_id,p_user_id,'game.round_recorded','game_round',v_round::text,jsonb_build_object('game_id',p_game_id,'stake',p_stake,'payout',p_payout));
  return jsonb_build_object('round_id',v_round,'balance',v_after,'duplicate',false);
end; $$;

-- Deny direct browser access. The Edge Function uses the server-only secret key.
do $$ declare t text; begin
  foreach t in array array['app_settings','app_users','wallets','app_sessions','wallet_ledger','game_rounds','matches','sports_bets','chat_messages','virtual_credit_requests','audit_logs','auth_attempts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from anon,authenticated',t);
  end loop;
end $$;
grant all on table public.app_settings,public.app_users,public.wallets,public.app_sessions,public.wallet_ledger,public.game_rounds,public.matches,public.sports_bets,public.chat_messages,public.virtual_credit_requests,public.audit_logs,public.auth_attempts to service_role;
grant usage,select on all sequences in schema public to service_role;
revoke all on function public.create_player_account(text,text) from public,anon,authenticated;
revoke all on function public.record_virtual_game_round(uuid,text,numeric,numeric,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_player_account(text,text) to service_role;
grant execute on function public.record_virtual_game_round(uuid,text,numeric,numeric,jsonb,text) to service_role;
