-- Serialize authentication attempts so concurrent password guesses cannot bypass limits.
create or replace function public.claim_auth_attempt(p_username text,p_ip_hash text)
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  v_by_name bigint;
  v_by_ip bigint;
  v_attempt_id bigint;
begin
  if p_username is null or p_ip_hash is null then
    raise exception 'invalid_auth_attempt' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('username:'||p_username,0));
  perform pg_advisory_xact_lock(hashtextextended('ip:'||p_ip_hash,0));
  select count(*) into v_by_name from public.auth_attempts
    where username_normalized=p_username and succeeded=false and created_at>now()-interval '15 minutes';
  select count(*) into v_by_ip from public.auth_attempts
    where ip_hash=p_ip_hash and succeeded=false and created_at>now()-interval '15 minutes';
  if v_by_name>=8 or v_by_ip>=20 then return null; end if;
  insert into public.auth_attempts(username_normalized,ip_hash,succeeded)
    values(p_username,p_ip_hash,false) returning id into v_attempt_id;
  return v_attempt_id;
end;
$$;
revoke all on function public.claim_auth_attempt(text,text) from public,anon,authenticated;
grant execute on function public.claim_auth_attempt(text,text) to service_role;
