-- Financial and audit history is append-only. Corrections must be compensating entries.
create or replace function public.reject_history_mutation()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  raise exception 'append_only_table: %', TG_TABLE_NAME using errcode='55000';
end;
$$;

drop trigger if exists wallet_ledger_append_only on public.wallet_ledger;
create trigger wallet_ledger_append_only
before update or delete on public.wallet_ledger
for each row execute function public.reject_history_mutation();

drop trigger if exists audit_logs_append_only on public.audit_logs;
create trigger audit_logs_append_only
before update or delete on public.audit_logs
for each row execute function public.reject_history_mutation();

revoke all on function public.reject_history_mutation() from public,anon,authenticated;
