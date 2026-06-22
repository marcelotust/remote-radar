# Design — Popular fontes de scraping (issue #12)

Data: 2026-06-22
Issue: https://github.com/marcelotust/remote-radar/issues/12

## Objetivo

Popular o app com uma lista curada de ~44 job boards / fontes de scraping, além
das 2 fontes já existentes (Lever Jobs, Greenhouse).

## Decisões (definidas no brainstorming)

1. **Sem campo `category`** — lista plana. As categorias da issue são usadas
   apenas para ordenar/comentar a lista no código e no seed; não entram no tipo
   `ScrapingSource` nem no schema do banco.
2. **Destino dos dados** — inserir no Supabase de produção (via client anon, que
   tem permissão de insert em `scraping_sources`), e manter `supabase/seed.sql`
   e `src/data/mockData.ts` (test seed) em sincronia com a mesma lista.
3. **Manter** as 2 fontes existentes (Lever Jobs, Greenhouse).
4. **`is_active: true`** para todas as novas fontes.

## Escopo

- `supabase/seed.sql` — substituir o bloco de `scraping_sources` pela lista
  completa (mantendo as 2 atuais), com `on conflict (url) do nothing`.
- `src/data/mockData.ts` — `MOCK_SOURCES` recebe a lista completa (ordenada por
  categoria, com comentários de seção para legibilidade).
- Produção — inserir as novas fontes no Supabase (idempotente, dedup por URL).
- Testes — ajustar asserts que dependem da contagem de fontes:
  - `src/hooks/useSources.spec.tsx` (`toHaveLength(2)` → nova contagem).
  - Revisar `WishlistPage.spec.tsx` e quaisquer outros que contem sources.

## Fora de escopo

- Agrupamento/exibição por categoria na UI.
- Campo `category` em tipo/schema.
- Mudanças em `AddSourceModal` / `SourceCard` / `WishlistPage` (a lista plana já
  é renderizada).
- Scraper que consome as fontes.

## Componentes afetados

| Arquivo                         | Mudança                             |
| ------------------------------- | ----------------------------------- |
| `src/data/mockData.ts`          | `MOCK_SOURCES` com a lista completa |
| `supabase/seed.sql`             | bloco de sources atualizado         |
| `src/hooks/useSources.spec.tsx` | contagem esperada                   |
| Supabase (prod)                 | insert idempotente das novas fontes |

## Validação

- `npm run test:run`, `npm run lint`, `npm run build` verdes.
- Conferir no app (`/wishlist`) que a lista de fontes aparece, lendo do Supabase.

## Entrega

Branch `feat/seed-scraping-sources` → PR fechando a issue #12.

```
Closes #12
```
