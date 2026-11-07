-- Server-owned virtual games, sports bets, and administrative money movement.
create table if not exists public.active_game_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete restrict,
  game_id text not null,
  stake numeric(14,2) not null check(stake>0),
  state jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  status text not null default 'active' check(status in ('active','completed','cancelled')),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(user_id,idempotency_key)
);
create unique index if not exists one_active_game_per_user_idx
  on public.active_game_rounds(user_id) where status='active';
create index if not exists active_game_user_status_idx
  on public.active_game_rounds(user_id,status,updated_at desc);
alter table public.active_game_rounds enable row level security;
revoke all on table public.active_game_rounds from public,anon,authenticated;
grant all on table public.active_game_rounds to service_role;

create or replace function public.start_active_virtual_game(
  p_user_id uuid,p_game_id text,p_stake numeric,p_state jsonb,p_idempotency_key text
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  w public.wallets%rowtype;
  u_status text;
  v_min numeric(14,2);
  v_max numeric(14,2);
  v_id uuid;
  v_before numeric(14,2);
  v_after numeric(14,2);
begin
  if p_user_id is null or p_game_id not in ('apple','crash','rocket') or p_stake is null or p_stake<=0
     or p_idempotency_key is null or length(p_idempotency_key)<12 or length(p_idempotency_key)>100 then
    raise exception 'invalid_active_game_request' using errcode='22023';
  end if;
  select id into v_id from public.active_game_rounds
    where user_id=p_user_id and idempotency_key=p_idempotency_key;
  if v_id is not null then
    select balance into v_after from public.wallets where user_id=p_user_id;
    return jsonb_build_object('round_id',v_id,'balance',v_after,'duplicate',true);
  end if;
  select status into u_status from public.app_users where id=p_user_id;
  if u_status is distinct from 'active' then raise exception 'account_unavailable'; end if;
  select min_virtual_stake,max_virtual_stake into v_min,v_max from public.app_settings where singleton;
  if p_stake<coalesce(v_min,1) or (coalesce(v_max,0)>0 and p_stake>v_max) then
    raise exception 'stake_out_of_range';
  end if;
  select * into w from public.wallets where user_id=p_user_id for update;
  if not found or w.balance<p_stake then raise exception 'insufficient_virtual_balance'; end if;
  if exists(select 1 from public.active_game_rounds where user_id=p_user_id and status='active') then
    raise exception 'active_game_exists';
  end if;
  v_before:=w.balance;
  v_after:=round(v_before-p_stake,2);
  insert into public.active_game_rounds(user_id,game_id,stake,state,idempotency_key)
    values(p_user_id,p_game_id,p_stake,coalesce(p_state,'{}'::jsonb),p_idempotency_key)
    returning id into v_id;
  update public.wallets set balance=v_after,wagered=wagered+p_stake,updated_at=now()
    where user_id=p_user_id;
  insert into public.wallet_ledger(user_id,event_type,amount_delta,balance_before,balance_after,
    reference_type,reference_id,idempotency_key,metadata)
  values(p_user_id,'game_stake',-p_stake,v_before,v_after,'active_game',v_id::text,
    p_idempotency_key||':stake',jsonb_build_object('game_id',p_game_id));
  insert into public.audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id,details)
    values(p_user_id,p_user_id,'game.started','active_game',v_id::text,
      jsonb_build_object('game_id',p_game_id,'stake',p_stake));
  return jsonb_build_object('round_id',v_id,'balance',v_after,'duplicate',false);
end;
$$;

create or replace function public.advance_active_virtual_game(
  p_user_id uuid,p_round_id uuid,p_expected_version bigint,p_new_state jsonb,
  p_finished boolean default false,p_payout numeric default 0,p_outcome jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  g public.active_game_rounds%rowtype;
  w public.wallets%rowtype;
  v_after numeric(14,2);
  v_before numeric(14,2);
  v_round_id uuid;
begin
  if p_user_id is null or p_round_id is null or p_expected_version is null
     or p_payout is null or p_payout<0 then raise exception 'invalid_game_update'; end if;
  select * into g from public.active_game_rounds
    where id=p_round_id and user_id=p_user_id and status='active' for update;
  if not found then raise exception 'active_game_not_found'; end if;
  if g.version<>p_expected_version then raise exception 'game_state_conflict'; end if;
  if not p_finished then
    update public.active_game_rounds set state=coalesce(p_new_state,'{}'::jsonb),
      version=version+1,updated_at=now() where id=g.id;
    return jsonb_build_object('round_id',g.id,'version',g.version+1,'status','active');
  end if;
  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then raise exception 'wallet_not_found'; end if;
  v_before:=w.balance;
  v_after:=round(v_before+p_payout,2);
  update public.wallets set balance=v_after,returned=returned+p_payout,
    rounds=rounds+1,wins=wins+case when p_payout>g.stake then 1 else 0 end,
    losses=losses+case when p_payout<g.stake then 1 else 0 end,updated_at=now()
    where user_id=p_user_id;
  insert into public.game_rounds(user_id,game_id,stake,payout,outcome,idempotency_key,created_at)
    values(p_user_id,g.game_id,g.stake,p_payout,coalesce(p_outcome,'{}'::jsonb),
      'active_game:'||g.id::text,g.created_at) returning id into v_round_id;
  if p_payout>0 then
    insert into public.wallet_ledger(user_id,event_type,amount_delta,balance_before,balance_after,
      reference_type,reference_id,idempotency_key,metadata)
    values(p_user_id,'game_payout',p_payout,v_before,v_after,'game_round',v_round_id::text,
      'active_game:'||g.id::text||':payout',jsonb_build_object('game_id',g.game_id));
  end if;
  update public.active_game_rounds set state=coalesce(p_new_state,'{}'::jsonb),
    status='completed',version=version+1,updated_at=now(),finished_at=now() where id=g.id;
  insert into public.audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id,details)
    values(p_user_id,p_user_id,'game.completed','game_round',v_round_id::text,
      jsonb_build_object('game_id',g.game_id,'stake',g.stake,'payout',p_payout));
  return jsonb_build_object('round_id',g.id,'game_round_id',v_round_id,
    'version',g.version+1,'status','completed','balance',v_after,'payout',p_payout,
    'stake',g.stake,'outcome',coalesce(p_outcome,'{}'::jsonb));
end;
$$;

create or replace function public.place_virtual_sports_bet(
  p_user_id uuid,p_match_id text,p_market_id text,p_option_id text,
  p_stake numeric,p_idempotency_key text
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  m public.matches%rowtype;
  w public.wallets%rowtype;
  market jsonb;
  opt jsonb;
  team1 text;
  team2 text;
  v_base_odds numeric(10,4);
  v_factor numeric(10,4);
  v_odds numeric(10,4);
  v_balance numeric(14,2);
  v_min numeric(14,2);
  v_max numeric(14,2);
  v_bet_id uuid;
begin
  if p_user_id is null or p_match_id is null or p_market_id is null or p_option_id is null
     or p_stake is null or p_stake<=0 or p_idempotency_key is null then
    raise exception 'invalid_sports_bet';
  end if;
  select id into v_bet_id from public.sports_bets
    where user_id=p_user_id and idempotency_key=p_idempotency_key;
  if v_bet_id is not null then
    select balance into v_balance from public.wallets where user_id=p_user_id;
    return jsonb_build_object('bet_id',v_bet_id,'balance',v_balance,'duplicate',true);
  end if;
  select * into m from public.matches where id=p_match_id for update;
  if not found or m.status<>'open' or (m.kickoff_at is not null and m.kickoff_at<=now()) then
    raise exception 'match_closed';
  end if;
  market:=m.payload->'markets'->p_market_id;
  if market is null or coalesce(market->>'status','open')<>'open' then raise exception 'market_closed'; end if;
  opt:=market->'options'->p_option_id;
  if opt is null then raise exception 'option_not_found'; end if;
  v_base_odds:=coalesce(nullif(opt->>'odds','')::numeric,0);
  v_factor:=coalesce(nullif(m.payload->>'profitPercent','')::numeric,100);
  v_odds:=round(v_base_odds*v_factor/100,4);
  if v_base_odds<1.01 or v_base_odds>1000 or v_factor<10 or v_factor>500 or v_odds<1.01 or v_odds>5000 then
    raise exception 'invalid_market_odds';
  end if;
  select min_virtual_stake,max_virtual_stake into v_min,v_max from public.app_settings where singleton;
  if p_stake<coalesce(v_min,1) or (coalesce(v_max,0)>0 and p_stake>v_max) then raise exception 'stake_out_of_range'; end if;
  select * into w from public.wallets where user_id=p_user_id for update;
  if not found or w.balance<p_stake then raise exception 'insufficient_virtual_balance'; end if;
  if (select status from public.app_users where id=p_user_id)<>'active' then raise exception 'account_unavailable'; end if;
  v_balance:=round(w.balance-p_stake,2);
  team1:=coalesce(m.payload->'team1'->>'name','الفريق الأول');
  team2:=coalesce(m.payload->'team2'->>'name','الفريق الثاني');
  insert into public.sports_bets(user_id,match_id,market_id,option_id,match_snapshot,stake,odds,status,payout,idempotency_key)
  values(p_user_id,p_match_id,p_market_id,p_option_id,
    jsonb_build_object('title',m.payload->>'title','team1',team1,'team2',team2,
      'market_title',market->>'title','option_label',opt->>'label','base_odds',v_base_odds,
      'profit_percent',v_factor,'kickoff_at',m.kickoff_at),
    p_stake,v_odds,'pending',0,p_idempotency_key)
  returning id into v_bet_id;
  update public.wallets set balance=v_balance,wagered=wagered+p_stake,updated_at=now() where user_id=p_user_id;
  insert into public.wallet_ledger(user_id,event_type,amount_delta,balance_before,balance_after,
    reference_type,reference_id,idempotency_key,metadata)
  values(p_user_id,'sports_stake',-p_stake,w.balance,v_balance,'sports_bet',v_bet_id::text,
    p_idempotency_key||':stake',jsonb_build_object('match_id',p_match_id,'market_id',p_market_id,'option_id',p_option_id));
  insert into public.audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id,details)
  values(p_user_id,p_user_id,'sports_bet.placed','sports_bet',v_bet_id::text,
    jsonb_build_object('match_id',p_match_id,'market_id',p_market_id,'stake',p_stake,'odds',v_odds));
  return jsonb_build_object('bet_id',v_bet_id,'balance',v_balance,'odds',v_odds,'duplicate',false);
end;
$$;

create or replace function public.admin_adjust_virtual_balance(
  p_actor_user_id uuid,p_target_user_id uuid,p_delta numeric,p_reason text,p_idempotency_key text
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  w public.wallets%rowtype;
  v_after numeric(14,2);
  v_existing bigint;
begin
  if p_actor_user_id is null or p_target_user_id is null or p_delta is null or p_delta=0
     or p_idempotency_key is null then raise exception 'invalid_admin_adjustment'; end if;
  if not exists(select 1 from public.app_users where id=p_actor_user_id and role='admin' and status='active') then
    raise exception 'admin_required';
  end if;
  if exists(select 1 from public.wallet_ledger where user_id=p_target_user_id and idempotency_key=p_idempotency_key) then
    select balance into v_after from public.wallets where user_id=p_target_user_id;
    return jsonb_build_object('balance',v_after,'duplicate',true);
  end if;
  select * into w from public.wallets where user_id=p_target_user_id for update;
  if not found then raise exception 'wallet_not_found'; end if;
  v_after:=round(w.balance+p_delta,2);
  if v_after<0 then raise exception 'insufficient_virtual_balance'; end if;
  update public.wallets set balance=v_after,updated_at=now() where user_id=p_target_user_id;
  insert into public.wallet_ledger(user_id,event_type,amount_delta,balance_before,balance_after,
    reference_type,reference_id,idempotency_key,metadata)
  values(p_target_user_id,'admin_adjustment',p_delta,w.balance,v_after,'admin_adjustment',
    p_actor_user_id::text,p_idempotency_key,jsonb_build_object('reason',left(coalesce(p_reason,''),500)));
  insert into public.audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id,details)
  values(p_actor_user_id,p_target_user_id,'wallet.adjusted','wallet',p_target_user_id::text,
    jsonb_build_object('delta',p_delta,'balance_before',w.balance,'balance_after',v_after,'reason',left(coalesce(p_reason,''),500)));
  return jsonb_build_object('balance',v_after,'duplicate',false);
end;
$$;

create or replace function public.admin_set_user_status(
  p_actor_user_id uuid,p_target_user_id uuid,p_status text
) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.app_users where id=p_actor_user_id and role='admin' and status='active') then
    raise exception 'admin_required';
  end if;
  if p_status not in ('active','closed','locked') then raise exception 'invalid_status'; end if;
  update public.app_users set status=p_status where id=p_target_user_id;
  if not found then raise exception 'user_not_found'; end if;
  update public.app_sessions set revoked_at=now()
    where user_id=p_target_user_id and revoked_at is null and p_status<>'active';
  insert into public.audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id,details)
  values(p_actor_user_id,p_target_user_id,'user.status_changed','user',p_target_user_id::text,jsonb_build_object('status',p_status));
  return true;
end;
$$;

create or replace function public.admin_save_match(
  p_actor_user_id uuid,p_match_id text,p_payload jsonb,p_status text,p_kickoff_at timestamptz
) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.app_users where id=p_actor_user_id and role='admin' and status='active') then
    raise exception 'admin_required';
  end if;
  if p_match_id is null or length(p_match_id)>120 or jsonb_typeof(p_payload)<>'object'
     or p_status not in ('open','closed','settled','cancelled') then raise exception 'invalid_match'; end if;
  insert into public.matches(id,payload,status,kickoff_at,updated_at)
  values(p_match_id,p_payload,p_status,p_kickoff_at,now())
  on conflict(id) do update set payload=excluded.payload,status=excluded.status,
    kickoff_at=excluded.kickoff_at,updated_at=now();
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(p_actor_user_id,'match.saved','match',p_match_id,jsonb_build_object('status',p_status,'kickoff_at',p_kickoff_at));
  return true;
end;
$$;

create or replace function public.admin_settle_sports_market(
  p_actor_user_id uuid,p_match_id text,p_market_id text,p_result_option_id text,p_void boolean default false
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  m public.matches%rowtype;
  market jsonb;
  b public.sports_bets%rowtype;
  w public.wallets%rowtype;
  v_won boolean;
  v_payout numeric(14,2);
  v_after numeric(14,2);
  v_settled integer:=0;
  v_winners integer:=0;
  v_total numeric(16,2):=0;
begin
  if not exists(select 1 from public.app_users where id=p_actor_user_id and role='admin' and status='active') then
    raise exception 'admin_required';
  end if;
  select * into m from public.matches where id=p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  market:=m.payload->'markets'->p_market_id;
  if market is null then raise exception 'market_not_found'; end if;
  if not p_void and (p_result_option_id is null or market->'options'->p_result_option_id is null) then
    raise exception 'result_option_not_found';
  end if;
  update public.matches set payload=jsonb_set(
    jsonb_set(
      jsonb_set(payload,ARRAY['markets',p_market_id,'status'],to_jsonb(case when p_void then 'cancelled' else 'settled' end),true),
      ARRAY['markets',p_market_id,'resultOptionId'],coalesce(to_jsonb(p_result_option_id),'null'::jsonb),true
    ),
    '{updatedAt}',to_jsonb((extract(epoch from now())*1000)::bigint),true
  ),updated_at=now() where id=p_match_id;

  for b in select * from public.sports_bets
    where match_id=p_match_id and market_id=p_market_id and status='pending'
    order by created_at,id for update
  loop
    select * into w from public.wallets where user_id=b.user_id for update;
    if not found then continue; end if;
    v_won:=not p_void and b.option_id=p_result_option_id;
    v_payout:=case when p_void then b.stake when v_won then round(b.stake*b.odds,2) else 0 end;
    v_after:=round(w.balance+v_payout,2);
    update public.wallets set balance=v_after,
      returned=returned+v_payout,
      rounds=rounds+case when p_void then 0 else 1 end,
      wins=wins+case when v_won then 1 else 0 end,
      losses=losses+case when not p_void and not v_won then 1 else 0 end,
      updated_at=now() where user_id=b.user_id;
    update public.sports_bets set status=case when p_void then 'void' when v_won then 'won' else 'lost' end,
      payout=v_payout,settled_at=now() where id=b.id;
    if v_payout>0 then
      insert into public.wallet_ledger(user_id,event_type,amount_delta,balance_before,balance_after,
        reference_type,reference_id,idempotency_key,metadata)
      values(b.user_id,case when p_void then 'sports_void_refund' else 'sports_payout' end,
        v_payout,w.balance,v_after,'sports_bet',b.id::text,'sports_bet:'||b.id::text||':settlement',
        jsonb_build_object('match_id',p_match_id,'market_id',p_market_id,'status',case when p_void then 'void' when v_won then 'won' else 'lost' end));
    end if;
    v_settled:=v_settled+1;
    if v_won then v_winners:=v_winners+1; end if;
    v_total:=v_total+v_payout;
  end loop;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(p_actor_user_id,'sports_market.settled','market',p_match_id||':'||p_market_id,
    jsonb_build_object('void',p_void,'result_option_id',p_result_option_id,'tickets',v_settled,'winners',v_winners,'payout',v_total));
  return jsonb_build_object('settled',v_settled,'winners',v_winners,'payout',v_total,'void',p_void);
end;
$$;

-- Only the Edge Functions' server key may execute financial or administrative procedures.
revoke all on function public.start_active_virtual_game(uuid,text,numeric,jsonb,text) from public,anon,authenticated;
revoke all on function public.advance_active_virtual_game(uuid,uuid,bigint,jsonb,boolean,numeric,jsonb) from public,anon,authenticated;
revoke all on function public.place_virtual_sports_bet(uuid,text,text,text,numeric,text) from public,anon,authenticated;
revoke all on function public.admin_adjust_virtual_balance(uuid,uuid,numeric,text,text) from public,anon,authenticated;
revoke all on function public.admin_set_user_status(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.admin_save_match(uuid,text,jsonb,text,timestamptz) from public,anon,authenticated;
revoke all on function public.admin_settle_sports_market(uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.start_active_virtual_game(uuid,text,numeric,jsonb,text) to service_role;
grant execute on function public.advance_active_virtual_game(uuid,uuid,bigint,jsonb,boolean,numeric,jsonb) to service_role;
grant execute on function public.place_virtual_sports_bet(uuid,text,text,text,numeric,text) to service_role;
grant execute on function public.admin_adjust_virtual_balance(uuid,uuid,numeric,text,text) to service_role;
grant execute on function public.admin_set_user_status(uuid,uuid,text) to service_role;
grant execute on function public.admin_save_match(uuid,text,jsonb,text,timestamptz) to service_role;
grant execute on function public.admin_settle_sports_market(uuid,text,text,text,boolean) to service_role;
