-- Standard bookmaker accumulator settlement: multiply winning decimal odds.
-- Void legs are neutral; any lost leg loses the full ticket. A single ticket's maximum
-- return is bounded by the wallets.balance NUMERIC(14,2) range.

CREATE OR REPLACE FUNCTION public.admin_settle_sports_market(p_actor_user_id uuid, p_match_id text, p_market_id text, p_result_option_id text, p_void boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  v_chain_ids uuid[];
  v_chain_id uuid;
  v_chain public.sports_chains%rowtype;
  v_chain_pending integer:=0;
  v_chain_wins integer:=0;
  v_chain_losses integer:=0;
  v_chain_voids integer:=0;
  v_chain_odds numeric:=1;
  v_chain_leg_odds numeric;
  v_chain_legs integer:=0;
  v_chain_completed integer:=0;
  v_chain_lost integer:=0;
  v_chain_one_payout numeric:=0;
  v_chain_payout numeric:=0;
  v_wallet_before numeric(14,2);
  v_wallet_after numeric(14,2);
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

  -- Series settle as one ticket: sum selected odds; any lost leg loses the stake.
  with updated as (
    update public.sports_chain_legs
    set result_status=case when p_void then 'void' when option_id=p_result_option_id then 'won' else 'lost' end
    where match_id=p_match_id and market_id=p_market_id
      and result_status='pending' and processed_at is null
    returning chain_id
  )
  select coalesce(array_agg(distinct chain_id),array[]::uuid[]) into v_chain_ids from updated;

  foreach v_chain_id in array v_chain_ids loop
    select * into v_chain from public.sports_chains where id=v_chain_id for update;
    if not found or v_chain.status<>'active' then continue; end if;

    select
      count(*) filter(where result_status='pending')::integer,
      count(*) filter(where result_status='won')::integer,
      count(*) filter(where result_status='lost')::integer,
      count(*) filter(where result_status='void')::integer
    into v_chain_pending,v_chain_wins,v_chain_losses,v_chain_voids
    from public.sports_chain_legs where chain_id=v_chain_id;

    -- Bookmaker accumulator: multiply decimal odds for winning legs.
    -- Void legs are neutral (1.00), and any lost leg loses the full stake.
    v_chain_odds:=1;
    for v_chain_leg_odds in
      select odds from public.sports_chain_legs
      where chain_id=v_chain_id and result_status='won'
      order by order_no
    loop
      v_chain_odds:=round(v_chain_odds*v_chain_leg_odds,4);
    end loop;

    v_chain_legs:=v_chain_legs+v_chain_wins+v_chain_losses+v_chain_voids;

    if v_chain_losses>0 then
      update public.wallets set
        rounds=rounds+v_chain_wins+v_chain_losses,
        wins=wins+v_chain_wins,
        losses=losses+v_chain_losses,
        updated_at=now()
      where user_id=v_chain.user_id;

      update public.sports_chain_legs set
        actual_stake=v_chain.initial_stake,payout=0,processed_at=now()
      where chain_id=v_chain_id and processed_at is null
        and result_status in ('won','lost');

      update public.sports_chain_legs set
        result_status='skipped',processed_at=now()
      where chain_id=v_chain_id and processed_at is null
        and result_status='pending';

      update public.sports_chains set
        status='lost',current_balance=0,processed_legs=total_legs,
        next_leg_order=total_legs+1,completed_at=now()
      where id=v_chain_id;

      v_chain_lost:=v_chain_lost+1;
      continue;
    end if;

    if v_chain_pending>0 then continue; end if;

    if v_chain_wins=0 then
      v_chain_one_payout:=round(v_chain.initial_stake,2);
    else
      if v_chain_odds<=0 or v_chain.initial_stake > 999999999999.99/v_chain_odds then
        raise exception 'sports_chain_payout_limit_exceeded';
      end if;
      v_chain_one_payout:=round(v_chain.initial_stake*v_chain_odds,2);
      if v_chain_one_payout>999999999999.99 then
        raise exception 'sports_chain_payout_limit_exceeded';
      end if;
    end if;

    select balance into v_wallet_before
      from public.wallets where user_id=v_chain.user_id for update;
    if not found then raise exception 'chain_wallet_unavailable'; end if;
    if v_chain_one_payout>999999999999.99-v_wallet_before then
      raise exception 'sports_chain_payout_limit_exceeded';
    end if;
    v_wallet_after:=round(v_wallet_before+v_chain_one_payout,2);

    update public.wallets set
      balance=v_wallet_after,returned=returned+v_chain_one_payout,
      rounds=rounds+v_chain_wins,wins=wins+v_chain_wins,updated_at=now()
    where user_id=v_chain.user_id;

    update public.sports_chain_legs set
      actual_stake=v_chain.initial_stake,
      payout=case when result_status='won' then round(v_chain.initial_stake*odds,2) else 0 end,
      processed_at=now()
    where chain_id=v_chain_id and processed_at is null
      and result_status in ('won','void');

    update public.sports_chains set
      status='completed',current_balance=v_chain_one_payout,processed_legs=total_legs,
      next_leg_order=total_legs+1,completed_at=now()
    where id=v_chain_id;

    insert into public.wallet_ledger(user_id,event_type,amount_delta,balance_before,balance_after,
      reference_type,reference_id,idempotency_key,metadata)
    values(v_chain.user_id,'sports_chain_payout',v_chain_one_payout,v_wallet_before,v_wallet_after,
      'sports_chain',v_chain_id::text,'sports_chain:'||v_chain_id::text||':payout',
      jsonb_build_object('chain_id',v_chain_id,'legs',v_chain.total_legs,
        'initial_stake',v_chain.initial_stake,'odds_mode','multiply',
        'total_odds',v_chain_odds,'won_legs',v_chain_wins,
        'void_legs',v_chain_voids,'status','completed'));

    v_chain_payout:=v_chain_payout+v_chain_one_payout;
    v_chain_completed:=v_chain_completed+1;
  end loop;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,details)
  values(p_actor_user_id,'sports_market.settled','market',p_match_id||':'||p_market_id,
    jsonb_build_object('void',p_void,'result_option_id',p_result_option_id,
      'single_tickets',v_settled,'single_winners',v_winners,'single_payout',v_total,
      'chain_legs_resolved',v_chain_legs,'chains_completed',v_chain_completed,
      'chains_lost',v_chain_lost,'chain_payout',v_chain_payout));

  return jsonb_build_object(
    'settled',v_settled,'winners',v_winners,'payout',v_total,'void',p_void,
    'chain_legs_resolved',v_chain_legs,'chains_completed',v_chain_completed,
    'chains_lost',v_chain_lost,'chain_payout',v_chain_payout
  );
end;
$function$

