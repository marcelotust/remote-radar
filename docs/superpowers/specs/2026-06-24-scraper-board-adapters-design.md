# Scraper: adapters para job boards remotos

Issue: #23 (follow-up de #17)

## Objetivo

Adicionar adapters per-source para job boards remotos, seguindo o padrão
existente do `weworkremotely.ts`: `parse(html)` puro + jsdom, registrados em
`scraper/adapters/index.ts`. Critério de aceite: **≥3 boards extraindo vagas
reais** (`inserted > 0`) num run, cada adapter com teste unitário contra fixture
salvo.

## Contexto da arquitetura (já existente)

- `Adapter` (`scraper/adapters/types.ts`): `{ host, readySelector, parse(html) }`.
  `parse` é puro (sem rede, sem async) e retorna `RawJob[]`
  (`title, company, url, location, description`).
- O pipeline (`scraper/pipeline.ts`) sempre renderiza a URL da fonte via
  Playwright (`renderPage`, `waitUntil: 'domcontentloaded'` +
  `waitForSelector(readySelector)`) e então chama `adapter.parse(html)`. **Não há
  mudança no pipeline nesta issue.**
- `resolveAdapter(url)` (`index.ts`) casa o host (ignorando `www.`) contra o array
  `adapters`, caindo no `generic` (JSON-LD) quando não há match.
- As fontes ativas vivem em `scraping_sources` (seed em `supabase/seed.sql`).

## Decisões

- **APIs via `parse(html)`**: para fontes com API JSON (Remotive, RemoteOK), a
  URL da fonte aponta para o endpoint da API. O Playwright carrega o JSON dentro
  de um `<pre>`; o adapter faz `document.querySelector('pre')` + `JSON.parse`.
  Sem mudança no contrato `Adapter`.
- **Captura de fixtures via Playwright**: o HTML real foi capturado com o mesmo
  caminho de render do scraper (chromium). Os valores de teste abaixo vêm dessa
  captura real.
- **4 boards** (margem sobre o mínimo de 3). As duas APIs sozinhas já satisfazem
  o critério; EU Remote Jobs e Working Nomads são margem.
- **Fixtures pequenos** (2 entradas cada), no estilo do `weworkremotely.html`.

## Os 4 adapters

Cada adapter mora em seu arquivo em `scraper/adapters/`, exporta uma função
`parse<Nome>(html): RawJob[]` e um objeto `Adapter`. `host` é o hostname sem
`www.`.

### 1. Remotive (API) — `remotive.ts`

- **host**: `remotive.com`
- **Fonte (seed)**: `https://remotive.io` → `https://remotive.com/api/remote-jobs`
- **readySelector**: `pre`
- **parse**: `JSON.parse(querySelector('pre').textContent)` → objeto com `.jobs[]`.
  Para cada job:
  - `title` ← `job.title`
  - `company` ← `job.company_name`
  - `url` ← `job.url`
  - `location` ← `job.candidate_required_location || null`
  - `description` ← `job.description || null`
  - Pular entradas sem `title`/`company_name`/`url`.
- **Dados reais de teste** (2 primeiras):
  - `Mid/Senior AI Cinematic Video Editor` / `EverAI` /
    `https://remotive.com/remote-jobs/artificial-intelligence/mid-senior-ai-cinematic-video-editor-2090887` / `Worldwide`
  - `Senior Independent AI Engineer / Architect` / `A.Team` /
    `https://remotive.com/remote-jobs/software-development/senior-independent-ai-engineer-architect-1919266` / `Americas, Europe, Israel`

### 2. RemoteOK (API) — `remoteok.ts`

- **host**: `remoteok.com`
- **Fonte (seed)**: `https://remoteok.com` → `https://remoteok.com/api`
- **readySelector**: `pre`
- **parse**: `JSON.parse(querySelector('pre').textContent)` → **array**. O primeiro
  elemento é um aviso legal (`{ legal: ... }`, sem `position`) e deve ser pulado.
  Filtrar por presença de `position`. Para cada job restante:
  - `title` ← `job.position`
  - `company` ← `job.company`
  - `url` ← `job.url`
  - `location` ← `job.location || null`
  - `description` ← `job.description || null`
  - Pular entradas sem `position`/`company`/`url`.
- **Dados reais de teste**: o `[0]` (legal) não tem `position`; os 2 seguintes:
  - `Freelance Website Copywriter Content Strategist` / `N4 Studio` /
    `https://remoteOK.com/remote-jobs/remote-freelance-website-copywriter-content-strategist-n4-studior-1133968` /
    `Sydney, Sydney, New South Wales, Australia`
  - `Biology Research Expert` / `24-MAG` /
    `https://remoteOK.com/remote-jobs/remote-biology-research-expert-65-95-hour-24-mag-1133980` /
    `New York, New York, New York, United States`
  - Nota: a URL real da API usa `remoteOK.com` (case misto) — preservar como vem,
    sem normalizar.

### 3. EU Remote Jobs (HTML) — `euremotejobs.ts`

- **host**: `euremotejobs.com`
- **Fonte (seed)**: `https://euremotejobs.com` → `https://euremotejobs.com/jobs/`
- **readySelector**: `a.job-card-link`
- **parse**: para cada `a.job-card-link`:
  - `url` ← `a.getAttribute('href')` (já absoluto, ex.: `https://euremotejobs.com/job/...`)
  - `title` ← texto de `.job-title` (dentro do anchor)
  - `company` ← texto de `.company-name`
  - `location` ← texto de `.meta-location` (colapsar whitespace) ou `null`
  - `description` ← `null`
  - Pular entradas sem `title`/`company`/`url`.
- **Dados reais de teste** (2 primeiros):
  - `Software Development Engineer in Test` / `Kodify Media Group` /
    `https://euremotejobs.com/job/kodify-media-group-europe-full-time-software-development-engineer-in-test/` / `Europe`
  - `Head of Engineering` / `Lemon.io` /
    `https://euremotejobs.com/job/lemon-io-europe-latam-central-america-flexible-schedule-full-time-head-of-engineering/` / `Costa Rica, Europe, LATAM`

### 4. Working Nomads (HTML) — `workingnomads.ts`

- **host**: `workingnomads.com`
- **Fonte (seed)**: `https://www.workingnomads.com` → `https://www.workingnomads.com/jobs`
- **readySelector**: `a.job-desktop[href^="/jobs/"]`
- **parse**: `BASE = 'https://www.workingnomads.com'`. Para cada
  `a.job-desktop[href^="/jobs/"]`:
  - `url` ← `BASE + href` (href é relativo, ex.: `/jobs/...`)
  - `title` ← texto do primeiro `h4` dentro do anchor
  - `company` ← texto de `.company` (colapsar whitespace)
  - `location` ← `null`
  - `description` ← `null`
  - Pular entradas sem `title`/`company`/`url`.
- **Dados reais de teste** (2 primeiros):
  - `Senior DevOps Engineer` / `Lemon.io` /
    `https://www.workingnomads.com/jobs/senior-devops-engineer-lemonio-1685353`
  - `Senior Google Ads Account Manager - Remote (Work From Home)` / `StubGroup` /
    `https://www.workingnomads.com/jobs/senior-google-ads-account-manager-remote-work-from-home-stubgroup-1677142`

## Registro e fontes

- **`index.ts`**: importar e adicionar os 4 adapters ao array `adapters`.
- **`index.spec.ts`**: a asserção atual de que `resolveAdapter('https://remoteok.com')`
  cai no genérico (`*`) passa a resolver `remoteok.com` — atualizar essa asserção
  (e, opcionalmente, adicionar asserções para os novos hosts). Manter o caso de
  fallback usando um host realmente desconhecido (ex.: `https://example.com`).
- **`supabase/seed.sql`**: ajustar as 4 URLs das fontes (linhas existentes de
  Remote OK, Remotive, EU Remote Jobs, Working Nomads) para as URLs de
  listagem/API acima. Labels inalterados.

## Fixtures e testes

- Para cada adapter, um fixture pequeno em
  `scraper/adapters/__fixtures__/<nome>.html` com **2 entradas**, construído a
  partir da captura real:
  - APIs (Remotive, RemoteOK): `<html><body><pre>{...json com 2 jobs...}</pre></body></html>`.
    Para RemoteOK incluir também o elemento `[0]` legal (sem `position`) para
    exercitar o filtro.
  - HTML (EU Remote Jobs, Working Nomads): HTML mínimo com 2 elementos de
    listagem (anchors + filhos necessários) e 1 anchor "ruído" sem os campos
    para exercitar o skip.
- Para cada adapter, `scraper/adapters/<nome>.spec.ts` (`// @vitest-environment node`),
  no molde do `weworkremotely.spec.ts`:
  - Afirma `adapter.host`.
  - Afirma a extração das 2 entradas (objetos `RawJob` completos) e o skip do
    ruído/legal.

## Critérios de aceite

- [ ] 4 adapters criados (`remotive`, `remoteok`, `euremotejobs`, `workingnomads`),
      cada um com `host`, `readySelector` e `parse(html)` puro.
- [ ] Cada adapter registrado em `resolveAdapter`.
- [ ] Cada adapter com fixture salvo + teste unitário verde.
- [ ] `index.spec.ts` atualizado (remoteok.com agora resolve; fallback usa host
      desconhecido).
- [ ] URLs das 4 fontes ajustadas em `supabase/seed.sql`.
- [ ] Suíte completa, build e lint limpos.

## Verificação real (fora dos testes unitários)

O critério "≥3 boards com `inserted > 0` num run" depende do workflow real contra
o Supabase de produção, fora do escopo dos testes unitários. As duas APIs
(Remotive/RemoteOK) foram validadas como parseáveis a partir de captura real
renderizada; um run do workflow após o merge confirma o critério ponta-a-ponta.

## Fora de escopo

- Os outros 6 boards da issue (#23) (Jobspresso, JustRemote, JS Remotely,
  AI Jobs, Remote Woman, Remote Circle) — ficam para follow-up.
- Mudanças no pipeline, no scoring ou no schema.
- Jobspresso: descartado por carregar listings via AJAX (container vazio no
  HTML renderizado em `domcontentloaded`).
