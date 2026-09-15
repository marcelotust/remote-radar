# RLS: migrar políticas de anon para authenticated (#72)

## Goal

Agora que existe login (#71), fechar o acesso direto via `anon key`: só
sessões autenticadas conseguem ler/escrever `jobs`, `scraping_sources`,
`scoring_keywords`, `scoring_settings`.

## Escopo

- Trocar `to anon` por `to authenticated` nas policies dessas quatro tabelas
  em `supabase/schema.sql`.
- Nova migration (`0006_rls_authenticated.sql`) que dropa as policies `_anon_*`
  existentes e recria como `_authenticated_*`.
- `companies` **não** é tocada aqui — a tabela inteira é removida em #76.
- O scraper (`scraper/db.ts`) já usa `SUPABASE_SERVICE_ROLE_KEY`, que bypassa
  RLS por completo — nenhuma mudança necessária lá.

## Por que não há testes novos

O fake do Supabase usado nos testes (`src/lib/__mocks__/supabase.ts`) não
simula roles/RLS — ele sempre concede acesso total, então essa camada de
segurança só é observável contra o Postgres real. A suíte existente serve como
regressão (garante que nenhuma query do app mudou de formato).

## Passo manual no Supabase

Rodar `supabase/migrations/0006_rls_authenticated.sql` no SQL editor. Depois
disso, a `anon key` deixa de conseguir ler/escrever essas tabelas — só faz
sentido aplicar **depois** que o login (#71) já estiver funcionando em
produção, senão a home fica sem dados pra ninguém.
