create or replace function public.create_virtual_credit_request(
  p_user_id uuid,p_amount numeric,p_note text
) returns uuid
language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_min numeric(14,2); v_max numeric(14,2);
begin
  if p_user_id is null or p_amount is null or p_amount<=0 or p_amount>10000000 then
    raise exception 'invalid_credit_request' using errcode='22023';
  end if;
  if not exists(select 1 from public.app_users where id=p_user_id and status='active') then
    raise exception 'account_unavailable';
  end if;
  insert into public.virtual_credit_requests(user_id,requested_amount,note)
  values(p_user_id,round(p_amount,2),left(coalesce(p_note,''),500)) returning id into v_id;
  insert into public.audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id)
  values(p_user_id,p_user_id,'virtual_credit.requested','virtual_credit_request',v_id::text);
  return v_id;
end;
$$;

create or replace function public.admin_review_virtual_credit_request(
  p_actor_user_id uuid,p_request_id uuid,p_approve boolean
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
  r public.virtual_credit_requests%rowtype;
  w public.wallets%rowtype;
  v_after numeric(14,2);
  v_event_type text;
begin
  if not exists(select 1 from public.app_users where id=p_actor_user_id and role='admin' and status='active') then
    raise exception 'admin_required';
  end if;
  select * into r from public.virtual_credit_requests where id=p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if r.status<>'pending' then raise exception 'request_already_reviewed'; end if;
  if p_approve then
    select * into w from public.wallets where user_id=r.user_id for update;
    if not found then raise exception 'wallet_not_found'; end if;
    v_after:=round(w.balance+r.requested_amount,2);
    update public.wallets set balance=v_after,returned=returned+r.requested_amount,updated_at=now()
      where user_id=r.user_id;
    v_event_type:='virtual_credit_grant';
    insert into public.wallet_ledger(user_id,event_type,amount_delta,balance_before,balance_after,
      reference_type,reference_id,idempotency_key,metadata)
    values(r.user_id,v_event_type,r.requested_amount,w.balance,v_after,
      'virtual_credit_request',r.id::text,'virtual_credit_request:'||r.id::text,
      jsonb_build_object('approved_by',p_actor_user_id));
  else
    v_after:=null;
  end if;
  update public.virtual_credit_requests set status=case when p_approve then 'approved' else 'rejected' end,
    reviewed_by=p_actor_user_id,reviewed_at=now() where id=r.id;
  insert into public.audit_logs(actor_user_id,target_user_id,action,entity_type,entity_id,details)
  values(p_actor_user_id,r.user_id,'virtual_credit.reviewed','virtual_credit_request',r.id::text,
    jsonb_build_object('approved',p_approve,'amount',r.requested_amount,'balance_after',v_after));
  return jsonb_build_object('request_id',r.id,'status',case when p_approve then 'approved' else 'rejected' end,'balance',v_after);
end;
$$;
revoke all on function public.create_virtual_credit_request(uuid,numeric,text) from public,anon,authenticated;
revoke all on function public.admin_review_virtual_credit_request(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.create_virtual_credit_request(uuid,numeric,text) to service_role;
grant execute on function public.admin_review_virtual_credit_request(uuid,uuid,boolean) to service_role;