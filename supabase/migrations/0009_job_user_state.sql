-- Vagas: status/lido por usuário (#74).
-- jobs.status/jobs.read continuam existindo por enquanto — não dropar ainda,
-- rode 0010 só depois de logar e (se quiser preservar seu histórico atual)
-- rodar o backfill abaixo.

create table if not exists job_user_state (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id),
  job_id     uuid not null references jobs(id) on delete cascade,
  status     text not null default 'none'
             check (status in ('none', 'applied', 'dismissed')),
  read       boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id, job_id)
);

alter table job_user_state enable row level security;

create policy "job_user_state_own_read"   on job_user_state for select to authenticated using (user_id = auth.uid());
create policy "job_user_state_own_insert" on job_user_state for insert to authenticated with check (user_id = auth.uid());
create policy "job_user_state_own_update" on job_user_state for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Backfill opcional: depois do seu primeiro login, pegue seu id em
-- Authentication → Users no painel do Supabase e rode (trocando o uuid):
--
-- insert into job_user_state (user_id, job_id, status, read)
-- select '<seu-user-id>', id, status, read
-- from jobs
-- where status <> 'none' or read = true
-- on conflict (user_id, job_id) do nothing;
