# Fontes: autor + permissão de edição (#73)

## Goal

Fontes de scraping continuam compartilhadas entre todos os usuários (todo
mundo lê a lista inteira), mas cada uma mostra quem adicionou, e só o autor
pode editar ou remover a própria fonte.

## Schema

```sql
alter table scraping_sources
  add column created_by       uuid references auth.users(id),
  add column created_by_email text;
```

Guardamos o e-mail direto na linha (em vez de fazer join com `auth.users`) —
mais simples que expor uma view `security definer` só pra resolver
`id → email`, e o e-mail de quem adicionou uma fonte não precisa acompanhar
trocas de e-mail da conta.

### RLS

```sql
create policy "sources_authenticated_update" on scraping_sources
  for update to authenticated
  using (created_by = auth.uid() or created_by is null)
  with check (created_by = auth.uid() or created_by is null);

create policy "sources_authenticated_delete" on scraping_sources
  for delete to authenticated
  using (created_by = auth.uid() or created_by is null);
```

**Fontes legadas** (as ~45 sources seedadas antes desta feature) não têm
`created_by` — ficam com `null`. Tratamos `created_by is null` como editável
por qualquer usuário autenticado (em vez de travado para sempre), senão
ninguém mais conseguiria editar/desativar essas fontes depois que o dono
original migrar para uma conta logada.

## Front-end

- `ScrapingSource` ganha `created_by?: string | null` e
  `created_by_email?: string | null`.
- `useAddSource` (agora usa `useAuth()`) grava `created_by`/`created_by_email`
  a partir da sessão atual.
- `SourceCard`: mostra "adicionado por {email}" quando `created_by_email`
  existe; só renderiza os botões Editar/Excluir quando
  `!source.created_by || source.created_by === user?.id`.

## Fora de escopo

Não há reivindicação de posse (uma fonte legada editada não passa a ter
`created_by` setado) — fica simples de propósito.
