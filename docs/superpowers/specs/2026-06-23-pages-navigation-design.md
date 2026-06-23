# Páginas e navegação — Home, Inbox, Empresas, Fontes e Settings

Issue: #19

## Objetivo

Reorganizar a estrutura de páginas e navegação do app em rotas distintas, cada
uma com responsabilidade clara e item de navegação próprio. Hoje a
`DashboardPage` (`/`) é o feed de vagas e a `WishlistPage` (`/wishlist`) junta
Empresas e Fontes de scraping no mesmo grid. A proposta organiza tudo em cinco
páginas: Home, Inbox, Empresas, Fontes de scraping e Settings.

## Escopo decidido

- **Settings**: apenas o _shell_ estrutural (página + duas seções com controles
  inertes). A funcionalidade de score vem em #43 e a de tema em #44.
- **Home**: mínimo dos critérios de aceite (contadores + destaques), sem extras.

## Arquitetura

### Layout route

Hoje cada página repete `<NavBar/>` + wrapper `min-h-screen bg-brand-bg
text-white`. Com cinco páginas isso vira duplicação. Introduzir um componente
`Layout` (`src/components/Layout/Layout.tsx`) que renderiza `NavBar` + `<Outlet/>`
dentro do wrapper compartilhado. As páginas passam a renderizar apenas seu
conteúdo.

### Rotas (`src/App.tsx`)

Rotas aninhadas sob o layout route:

| Path                | Página                                 |
| ------------------- | -------------------------------------- |
| `/`                 | `HomePage`                             |
| `/inbox`            | `InboxPage` (conteúdo atual do feed)   |
| `/companies`        | `CompaniesPage`                        |
| `/scraping-sources` | `ScrapingSourcesPage`                  |
| `/settings`         | `SettingsPage` (shell)                 |
| `/wishlist`         | `<Navigate to="/companies" replace />` |
| `*`                 | `<Navigate to="/" replace />`          |

### NavBar

Links: **Home** (`/` com `end`), **Inbox** (`/inbox`), **Empresas**
(`/companies`), **Fontes** (`/scraping-sources`), **Settings** (`/settings`).
Marcação de item ativo via `NavLink` (classe `text-brand-green`). `flex-wrap`
para acomodar os cinco links.

## Páginas

### Inbox (`InboxPage`)

Renomear, mantendo a lógica idêntica:

- `src/pages/DashboardPage.tsx` → `src/pages/InboxPage.tsx`
- `src/pages/DashboardPage.spec.tsx` → `src/pages/InboxPage.spec.tsx`
- `src/pages/dashboardFilters.ts` → `src/pages/inboxFilters.ts`
- `src/pages/dashboardFilters.spec.ts` → `src/pages/inboxFilters.spec.ts`

Remover o `<NavBar/>` e o wrapper externo (migram para o `Layout`). `FilterBar`,
paginação, split-view e `BottomSheet` permanecem na página.

### Empresas (`CompaniesPage`) e Fontes (`ScrapingSourcesPage`)

Dividir as duas `<section>` da `WishlistPage` em duas páginas full-width
(`max-w-5xl mx-auto`):

- **CompaniesPage**: lista de `CompanyCard` + botão "+ Adicionar empresa"
  (abre `AddCompanyModal` via `setCompanyModalOpen`) + `AddCompanyModal`.
- **ScrapingSourcesPage**: lista de `SourceCard` + `RunScraperButton` + botão
  "+ Adicionar fonte" (abre `AddSourceModal` via `setSourceModalOpen`) +
  `AddSourceModal`.

Remover `src/pages/WishlistPage.tsx` e `src/pages/WishlistPage.spec.tsx`.

### Home (`HomePage`) — mínimo dos critérios

Usa `useJobs`. Conteúdo:

- **Contadores de resumo**:
  - Vagas novas no último dia: `scraped_at` dentro das últimas 24h.
  - Total de não lidas: `read === false`.
- **Destaques**: top vagas por `relevance_score` (desc), cada item linkando
  para `/inbox`.

### Settings (`SettingsPage`) — shell estrutural

Página com duas seções, ambas com controles inertes e uma nota de que a
funcionalidade chega nas issues correspondentes:

- **Cálculo de score** — área para editar palavras-chave positivas/negativas
  (UI; persistência em #43).
- **Tema** — seletor Claro / Escuro / Sistema (infra em #44).

## Testes

- Specs de renderização novos: `HomePage`, `CompaniesPage`,
  `ScrapingSourcesPage`, `SettingsPage`.
- Navegação: `NavBar` exibe os cinco links e marca o item ativo corretamente.
- Redirect: `/wishlist` redireciona para `/companies`.
- Renomear specs do Inbox/filters; manter cobertura existente.

## Critérios de aceite

- [ ] Home em `/` exibe resumo (vagas novas no último dia, não lidas) e destaque
      das vagas com maior score.
- [ ] Inbox em `/inbox` com o feed de vagas (atual `DashboardPage`).
- [ ] Empresas em `/companies` e Fontes em `/scraping-sources`.
- [ ] Settings em `/settings` com as áreas de score (UI, ver #43) e tema
      (seletor, ver #44).
- [ ] `NavBar` reflete as cinco páginas e marca o item ativo.
- [ ] Cada página mantém seu modal de adicionar e o botão correspondente.
- [ ] `/wishlist` redireciona para `/companies`.
- [ ] Testes atualizados/adicionados passando.

## Fora de escopo

- Funcionalidade de score em Settings (#43).
- Tema claro + troca/persistência de tema (#44).
- Layout de alta densidade do feed (#9).
- Métricas/insights extras na Home.
