-- One-time, server-side import from the legacy Firebase Realtime Database.
-- Snapshot is read-only. Password hashes are moved to legacy_password_hash and removed
-- from customer JSON/archive. New PBKDF2 hashes are created on the customer's next login.
do $$
declare
  v_response record;
  v_root jsonb;
  r record;
  h record;
  u uuid;
  v_legacy_id text;
  v_balance numeric(14,2);
  v_created_ms numeric;
  v_created_at timestamptz;
  v_event_ms numeric;
  v_event_at timestamptz;
  v_stake numeric(14,2);
  v_payout numeric(14,2);
  v_amount numeric(16,2);
  v_after numeric(14,2);
  v_before numeric(14,2);
  v_delta numeric(16,2);
  v_status text;
  v_config jsonb;
  v_settings jsonb;
  v_customer_count integer := 0;
  v_game_count integer := 0;
  v_chat_count integer := 0;
  v_request_count integer := 0;
  v_tx_count integer := 0;
  v_archive_count integer := 0;
begin
  if exists(select 1 from public.app_users) or exists(select 1 from public.legacy_archive) then
    raise exception 'legacy_import_requires_empty_target';
  end if;

  select * into v_response
  from extensions.http_get('https://xtra-f3087-default-rtdb.firebaseio.com/.json');
  if v_response.status <> 200 or v_response.content is null then
    raise exception 'legacy_firebase_export_failed_http_%',v_response.status;
  end if;
  v_root := v_response.content::jsonb;
  if jsonb_typeof(v_root->'users') <> 'object' then
    raise exception 'legacy_users_node_missing_or_invalid';
  end if;
  if (select count(*) from jsonb_each(v_root->'users')) = 0 then
    raise exception 'legacy_users_node_empty';
  end if;

  v_config := coalesce(v_root->'config','{}'::jsonb);
  v_settings := coalesce(v_config->'settings','{}'::jsonb);

  insert into public.app_config(singleton,config,migrated_at,updated_at)
  values(true,v_config,now(),now())
  on conflict(singleton) do update set config=excluded.config,migrated_at=now(),updated_at=now();

  update public.app_settings
  set registration_enabled=coalesce(nullif(v_settings->>'registration','')::boolean,registration_enabled),
      initial_virtual_balance=coalesce(nullif(v_settings->>'initial','')::numeric,initial_virtual_balance),
      new_accounts_start_at_zero=coalesce(nullif(v_settings->>'newZero','')::boolean,new_accounts_start_at_zero),
      min_virtual_stake=coalesce(nullif(v_settings->>'minBet','')::numeric,min_virtual_stake),
      max_virtual_stake=coalesce(nullif(v_settings->>'maxBet','')::numeric,max_virtual_stake)
  where singleton;

  insert into public.legacy_archive(source_path,legacy_key,payload)
  values('config','root',v_config);

  for r in select key,value from jsonb_each(v_root->'users')
  loop
    if r.key !~ '^[a-z0-9_]{3,20}$' then
      raise exception 'legacy_username_invalid';
    end if;
    if coalesce(r.value->>'pw','') !~ '^[a-f0-9]{64}$' then
      raise exception 'legacy_password_hash_invalid_for_user_%',r.key;
    end if;
    v_legacy_id := r.value->>'id';
    if v_legacy_id is null then
      raise exception 'legacy_customer_id_missing_for_user_%',r.key;
    end if;

    v_created_ms := nullif(r.value->>'created','')::numeric;
    v_created_at := case
      when v_created_ms is null then now()
      when v_created_ms > 100000000000 then to_timestamp(v_created_ms/1000.0)
      else to_timestamp(v_created_ms)
    end;

    v_balance := greatest(0,coalesce(nullif(r.value->>'balance','')::numeric,0));

    insert into public.app_users(
      username,username_normalized,legacy_user_id,status,legacy_password_hash,
      profile,customer_data,created_at
    )
    values(
      r.key,lower(r.key),v_legacy_id,
      case when coalesce((r.value->>'closed')::boolean,false) then 'closed' else 'active' end,
      r.value->>'pw',
      jsonb_build_object('legacy_user_id',v_legacy_id),
      r.value-'pw',
      v_created_at
    ) returning id into u;

    insert into public.wallets(
      user_id,balance,registration_bonus,rounds,wins,losses,wagered,returned,updated_at
    )
    values(
      u,
      v_balance,
      greatest(0,coalesce(nullif(r.value->>'regBonus','')::numeric,0)),
      greatest(0,coalesce(nullif(r.value->>'rounds','')::bigint,0)),
      greatest(0,coalesce(nullif(r.value->>'wins','')::bigint,0)),
      greatest(0,coalesce(nullif(r.value->>'losses','')::bigint,0)),
      greatest(0,coalesce(nullif(r.value->>'wagered','')::numeric,0)),
      greatest(0,coalesce(nullif(r.value->>'returned','')::numeric,0)),
      now()
    );

    insert into public.wallet_ledger(
      user_id,event_type,amount_delta,balance_before,balance_after,
      reference_type,reference_id,idempotency_key,metadata,created_at
    )
    values(
      u,'migration',v_balance,0,v_balance,'firebase_snapshot',v_legacy_id,
      'firebase_snapshot:'||r.key,
      jsonb_build_object('legacy_username',r.key,'legacy_created_at',v_created_at),
      now()
    );

    insert into public.legacy_archive(source_path,legacy_key,owner_user_id,payload,source_created_at)
    values('users',r.key,u,r.value-'pw',v_created_at);

    if jsonb_typeof(r.value->'hist')='array' then
      for h in
        select value,ordinality
        from jsonb_array_elements(r.value->'hist') with ordinality
      loop
        v_stake := coalesce(nullif(h.value->>'bet','')::numeric,0);
        v_payout := coalesce(nullif(h.value->>'win','')::numeric,0);
        v_event_ms := nullif(h.value->>'t','')::numeric;
        v_event_at := case
          when v_event_ms is null then v_created_at
          when v_event_ms > 100000000000 then to_timestamp(v_event_ms/1000.0)
          else to_timestamp(v_event_ms)
        end;
        if v_stake > 0 and v_payout >= 0 then
          insert into public.game_rounds(
            user_id,game_id,stake,payout,outcome,idempotency_key,created_at
          )
          values(
            u,coalesce(h.value->>'g','unknown'),v_stake,v_payout,
            jsonb_build_object('legacy_info',h.value->'i','legacy_round',h.value),
            'firebase_hist:'||r.key||':'||h.ordinality,v_event_at
          )
          on conflict(user_id,idempotency_key) do nothing;
          v_game_count := v_game_count+1;
        end if;
      end loop;
    end if;

    v_customer_count := v_customer_count+1;
  end loop;

  -- Preserve every old configuration record in one locked config snapshot.
  -- The config may not yet have matches/pages; missing sections remain absent.
  -- Archive legacy ID mapping without exposing it to browser roles.
  for r in select key,value from jsonb_each(coalesce(v_root->'ids','{}'::jsonb))
  loop
    insert into public.legacy_archive(source_path,legacy_key,payload)
    values('ids',r.key,jsonb_build_object('value',r.value))
    on conflict(source_path,legacy_key) do nothing;
    v_archive_count := v_archive_count+1;
  end loop;

  -- Import old wallet adjustment records as virtual-credit ledger entries.
  -- 'شحن'/'سحب' are retained as historical labels only; no real-money payment is enabled.
  for r in select key,value from jsonb_each(coalesce(v_root->'tx','{}'::jsonb))
  loop
    insert into public.legacy_archive(source_path,legacy_key,owner_user_id,payload,source_created_at)
    select 'tx',r.key,u,r.value,
      case when nullif(r.value->>'t','') is null then null
           when (r.value->>'t')::numeric > 100000000000 then to_timestamp((r.value->>'t')::numeric/1000.0)
           else to_timestamp((r.value->>'t')::numeric) end
    from public.app_users where legacy_user_id=r.value->>'id'
    on conflict(source_path,legacy_key) do nothing;

    select id into u from public.app_users where legacy_user_id=r.value->>'id';
    if u is not null then
      v_amount := nullif(r.value->>'amt','')::numeric;
      v_after := nullif(r.value->>'after','')::numeric;
      if r.value->>'type'='شحن' then v_delta:=v_amount; v_before:=v_after-v_amount;
      elsif r.value->>'type'='سحب' then v_delta:=-v_amount; v_before:=v_after+v_amount;
      else raise exception 'legacy_wallet_event_type_unknown'; end if;
      if v_before < 0 or v_after < 0 or v_amount <= 0 then
        raise exception 'legacy_wallet_event_balance_invalid';
      end if;
      v_event_ms := nullif(r.value->>'t','')::numeric;
      v_event_at := case
        when v_event_ms is null then now()
        when v_event_ms > 100000000000 then to_timestamp(v_event_ms/1000.0)
        else to_timestamp(v_event_ms)
      end;
      insert into public.wallet_ledger(
        user_id,event_type,amount_delta,balance_before,balance_after,
        reference_type,reference_id,idempotency_key,metadata,created_at
      )
      values(
        u,'admin_adjustment',v_delta,v_before,v_after,'firebase_tx',r.key,
        'firebase_tx:'||r.key,
        jsonb_build_object('legacy_type',r.value->>'type','legacy_label',r.value->>'name'),
        v_event_at
      )
      on conflict(user_id,idempotency_key) where idempotency_key is not null do nothing;
      v_tx_count := v_tx_count+1;
    end if;
  end loop;

  -- Preserve chat messages even when the old message is empty or malformed.
  for r in select key,value from jsonb_each(coalesce(v_root->'chat','{}'::jsonb))
  loop
    select id into u from public.app_users where legacy_user_id=r.key;
    for h in select key,value from jsonb_each(case when jsonb_typeof(r.value)='object' then r.value else '{}'::jsonb end)
    loop
      insert into public.legacy_archive(source_path,legacy_key,owner_user_id,payload,source_created_at)
      values(
        'chat/'||r.key,h.key,u,h.value,
        case when nullif(h.value->>'t','') is null then null
             when (h.value->>'t')::numeric > 100000000000 then to_timestamp((h.value->>'t')::numeric/1000.0)
             else to_timestamp((h.value->>'t')::numeric) end
      ) on conflict(source_path,legacy_key) do nothing;

      if u is not null and jsonb_typeof(h.value)='object'
         and length(coalesce(h.value->>'msg','')) between 1 and 2000 then
        insert into public.chat_messages(user_id,sender_role,message,created_at)
        values(
          u,
          case when h.value->>'from'='user' then 'player'
               when h.value->>'from'='admin' then 'admin'
               else 'system' end,
          h.value->>'msg',
          case when nullif(h.value->>'t','') is null then now()
               when (h.value->>'t')::numeric > 100000000000 then to_timestamp((h.value->>'t')::numeric/1000.0)
               else to_timestamp((h.value->>'t')::numeric) end
        );
        v_chat_count := v_chat_count+1;
      end if;
    end loop;
  end loop;

  -- Preserve all payment/request log entries in the private archive.
  -- Only request-type entries are normalized as virtual-credit requests.
  for r in select key,value from jsonb_each(coalesce(v_root->'paylog','{}'::jsonb))
  loop
    select id into u from public.app_users where legacy_user_id=r.value->>'id';
    insert into public.legacy_archive(source_path,legacy_key,owner_user_id,payload,source_created_at)
    values(
      'paylog',r.key,u,r.value,
      case when nullif(r.value->>'t','') is null then null
           when (r.value->>'t')::numeric > 100000000000 then to_timestamp((r.value->>'t')::numeric/1000.0)
           else to_timestamp((r.value->>'t')::numeric) end
    ) on conflict(source_path,legacy_key) do nothing;

    if u is not null and r.value->>'type'='req' then
      v_status := case when r.value->>'status'='approved' then 'approved'
                       when r.value->>'status'='rejected' then 'rejected'
                       else 'pending' end;
      insert into public.virtual_credit_requests(user_id,requested_amount,note,status,reviewed_at,created_at)
      values(
        u,
        nullif(r.value->>'amt','')::numeric,
        r.value::text,
        v_status,
        case when v_status in ('approved','rejected') and nullif(r.value->>'t','') is not null
             then case when (r.value->>'t')::numeric > 100000000000 then to_timestamp((r.value->>'t')::numeric/1000.0)
                       else to_timestamp((r.value->>'t')::numeric) end
             else null end,
        case when nullif(r.value->>'t','') is null then now()
             when (r.value->>'t')::numeric > 100000000000 then to_timestamp((r.value->>'t')::numeric/1000.0)
             else to_timestamp((r.value->>'t')::numeric) end
      );
      v_request_count := v_request_count+1;
    end if;
  end loop;

  insert into public.audit_logs(action,entity_type,entity_id,details)
  values(
    'migration.firebase_snapshot_imported','migration','firebase-root',
    jsonb_build_object(
      'customers',v_customer_count,
      'game_history_rounds',v_game_count,
      'chat_messages_normalized',v_chat_count,
      'virtual_credit_requests',v_request_count,
      'wallet_transactions',v_tx_count,
      'imported_at',now()
    )
  );
end;
$$;