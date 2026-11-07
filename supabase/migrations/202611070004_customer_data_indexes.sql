create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_user_id,created_at desc);
create index if not exists audit_logs_target_created_idx on public.audit_logs(target_user_id,created_at desc);
create index if not exists chat_messages_user_created_idx on public.chat_messages(user_id,created_at desc);
create index if not exists virtual_credit_requests_reviewer_idx on public.virtual_credit_requests(reviewed_by,reviewed_at desc);
create index if not exists virtual_credit_requests_user_created_idx on public.virtual_credit_requests(user_id,created_at desc);