-- Allowlist + magic-link auth (#71).
-- Run this in the Supabase SQL editor of the existing project (idempotent).
-- After applying: enable the Email provider under Authentication → Providers
-- (Email OTP / magic link, no password), then add yourself:
--   insert into allowed_users (email) values ('marcelotust@gmail.com');

create table if not exists allowed_users (
  email      text primary key,
  created_at timestamptz default now()
);

alter table allowed_users enable row level security;

create or replace function is_email_allowed(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from allowed_users where email = lower(check_email)
  );
$$;

grant execute on function is_email_allowed(text) to anon, authenticated;
