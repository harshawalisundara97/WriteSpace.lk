-- Audit log is admin-only — TASK-ADMIN-008 finding.
-- is_admin() is true for ANY admin_users row (staff included), so staff could
-- read the full audit trail. Restrict reads to role = 'admin'.
create or replace function is_admin_role() returns boolean as $$
  select exists (select 1 from admin_users where id = auth.uid() and role = 'admin');
$$ language sql stable security definer set search_path = public;

drop policy if exists admin_read_audit on audit_logs;
create policy admin_read_audit on audit_logs for select using (is_admin_role());
