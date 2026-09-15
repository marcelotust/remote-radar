# Relevância (score) calculada por usuário (#75)

## Goal

Cada usuário vê `relevance_score`/`relevance_level` calculado com as próprias
keywords/limiares, editados em Ajustes — não mais um único config global para
todo mundo.

## Como o "fork" acontece

Não há clonagem explícita: `useReplaceScoringKeywords` e
`useUpdateScoringSettings` só tocam nas linhas do **próprio usuário**
(`user_id = auth.uid()`), nunca nas globais (`user_id is null`). A primeira
vez que alguém salva em Ajustes, isso já cria a linha pessoal — a partir daí
`useScoringConfig` passa a preferir as linhas pessoais às globais.

`useScoringConfig` lê as duas (RLS já limita a `own + global`), separa
client-side por `user_id === meuId` vs `user_id === null`, e usa: próprias
(se houver) → globais (se houver) → `DEFAULT_SCORING_CONFIG` hardcoded.

## RLS

- `select`: `user_id = auth.uid() or user_id is null` (lê a própria + a
  global).
- `insert`/`update`/`delete`: só `user_id = auth.uid()` — a linha global fica
  somente leitura pelo app (ninguém edita o default pelo app; só via SQL
  direto/service role).

## `useAddScoringKeyword`/`useEditScoringKeyword`/`useDeleteScoringKeyword`

Não são usados por nenhuma página hoje — a UI de Ajustes só usa
`useReplaceScoringKeywords` (substitui o bucket inteiro) e
`useUpdateScoringSettings`. Só o `insert` do `useAddScoringKeyword` foi
ajustado (usa `user?.id` em vez de `null` hardcoded); editar/apagar por `id`
continuam como estavam — sujeitos à mesma RLS por usuário se algum dia forem
usados, mas hoje o próprio fake de testes não simula RLS, então seus testes
continuam passando inalterados.
