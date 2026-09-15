# Vagas: status/lido por usuário (#74)

## Goal

Vagas continuam sendo uma lista única raspada e compartilhada entre todos os
usuários, mas cada um marca aplicada/descartada/lida de forma independente.

## Schema

Nova tabela `job_user_state` (`user_id`, `job_id`, `status`, `read`, unique
`(user_id, job_id)`), RLS restrita a `user_id = auth.uid()`.

`jobs.status`/`jobs.read` ficam **vestigiais** por enquanto — não são
dropadas na mesma migration que cria `job_user_state` (0009), porque não há
como saber de antemão o `auth.users.id` do usuário atual pra fazer o backfill
do histórico existente. 0009 inclui um snippet comentado de backfill pra
rodar manualmente depois do primeiro login; 0010 (separada) dropa as colunas
— só deve ser aplicada depois do backfill, se ele importar.

## Front-end

- `useJobs`: busca `jobs` + `job_user_state` (filtrado por `user_id`) em
  paralelo, mescla no resultado (`status`/`read` sempre vêm de
  `job_user_state`, com fallback `'none'`/`false` quando não há linha).
  `enabled: !!user`.
- `useUpdateJobStatus` / `useToggleJobRead`: trocam o `update` em `jobs` por
  um `upsert` em `job_user_state` (`onConflict: 'user_id,job_id'`). O padrão
  de optimistic update + rollback na cache de `useJobs` não muda.
- Fake do Supabase: novo `upsert()` no `QueryBuilder` (insere ou faz merge
  parcial das colunas do payload na linha em conflito, igual ao Postgres real
  com `on conflict do update set <colunas do payload>`).

## Fora de escopo

Relevância/score por usuário é a #75 (issue separada).
