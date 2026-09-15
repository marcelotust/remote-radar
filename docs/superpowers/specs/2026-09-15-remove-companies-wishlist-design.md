# Remover Empresas/Wishlist (#76)

## Goal

A wishlist de empresas parou de ser usada — remover por completo (front-end +
banco) para simplificar o modelo de dados antes das mudanças de
multiusuário (#73/#74/#75), que tocam `useJobs`/`enrichJobs` bastante.

## Removido

- Front-end: `CompaniesPage`, `AddCompanyModal`, `CompanyCard`,
  `RemoteBrazilBadge`, `useCompanies`, `useCompanyMutations`.
- `Job.is_wishlist_company` / `Job.wishlist_remote_brazil` (calculados em
  `enrichJobs` via cruzamento com `companies`).
- `FilterState.wishlistOnly` + o toggle correspondente na `FilterBar`.
- Rotas `/companies` e o redirect de `/wishlist`; link "Empresas" na `NavBar`.
- `Company` / `RemoteBrazilStatus` em `src/types/index.ts`.
- Tabela `companies` (`supabase/migrations/0007_drop_companies.sql`) e as
  policies RLS associadas; seed em `supabase/seed.sql`.

## Fora de escopo

`job.company` (nome da empresa que abriu a vaga) **não** é afetado — é um
campo normal do `Job`, usado por `NetworkingButton`/`dorkUrl` e pela listagem;
só a feature de wishlist (lista de empresas favoritas + status "remoto pro
Brasil") sai.
