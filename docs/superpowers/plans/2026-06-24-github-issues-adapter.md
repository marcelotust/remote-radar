# GitHub Issues Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raspar vagas remotas dos repositórios `frontendbr/vagas` e `backend-br/vagas` via GitHub Issues API e inseri-las no Supabase.

**Architecture:** Estende a interface `Adapter` com um método `fetch` opcional. O pipeline usa `adapter.fetch(url, ctx)` quando presente (caminho de API JSON), senão o `renderPage` (Playwright) atual. Um novo adapter `github` busca issues abertas com label `Remoto`, e um parser puro mapeia issues → `RawJob` (testável contra fixture).

**Tech Stack:** TypeScript (ESM, imports com extensão `.ts`), Vitest, Node 24 `fetch` global, Supabase JS.

## Global Constraints

- Imports internos sempre com extensão `.ts` (ESM puro).
- Testes de scraper rodam em ambiente Node: primeira linha do spec `// @vitest-environment node`.
- `parse` do adapter é **puro**: sem rede, sem async.
- Dedup por `url` já é garantido por `upsertJobs` (`onConflict: 'url'`) — não duplicar lógica.
- `RawJob` = `{ title: string; company: string; url: string; location: string | null; description: string | null }`.
- Comando de teste único: `npx vitest run <arquivo>`.

---

### Task 1: Parser puro de issues (`parseGithubIssues` + `extractTitleAndCompany`)

**Files:**

- Modify: `scraper/adapters/types.ts`
- Create: `scraper/adapters/github.ts`
- Create: `scraper/adapters/__fixtures__/github-issues.json`
- Test: `scraper/adapters/github.spec.ts`

**Interfaces:**

- Consumes: `RawJob` de `./types.ts`.
- Produces:
  - `extractTitleAndCompany(rawTitle: string): { title: string; company: string }`
  - `parseGithubIssues(json: string): RawJob[]`
  - Tipo `FetchContext` e `Adapter.fetch?` / `Adapter.readySelector?` (usados nas Tasks 2-3).

- [ ] **Step 1: Estender a interface em `scraper/adapters/types.ts`**

Substituir o bloco `export interface Adapter { ... }` e adicionar `FetchContext`:

```ts
export interface FetchContext {
  httpGet: (
    url: string,
    headers?: Record<string, string>
  ) => Promise<{ status: number; body: string }>
}

export interface Adapter {
  /** Bare hostname (no `www.`), or '*' for the generic fallback. */
  host: string
  /** Selector to wait for before capturing HTML. Required for renderPage adapters. */
  readySelector?: string
  /** Optional API fetch. When present, the pipeline uses it instead of renderPage. */
  fetch?(url: string, ctx: FetchContext): Promise<string>
  /** Pure extraction from fetched content (HTML or JSON). No network, no async. */
  parse(content: string): RawJob[]
}
```

(Manter `export interface RawJob { ... }` inalterado.)

- [ ] **Step 2: Criar a fixture `scraper/adapters/__fixtures__/github-issues.json`**

```json
[
  {
    "title": "[Remoto] Product Owner na BotCity",
    "html_url": "https://github.com/frontendbr/vagas/issues/8511",
    "body": "Vaga de PO totalmente remota."
  },
  {
    "title": "[100% Remoto] Full-Stack Sênior - Igma",
    "html_url": "https://github.com/backend-br/vagas/issues/12293",
    "body": null
  },
  {
    "title": "[Remoto] Vaga sem empresa clara",
    "html_url": "https://github.com/frontendbr/vagas/issues/8400",
    "body": "Descrição qualquer."
  },
  {
    "title": "[Remoto] PR que não é vaga na Foo",
    "html_url": "https://github.com/frontendbr/vagas/pull/8399",
    "body": "ignore me",
    "pull_request": { "url": "https://api.github.com/..." }
  },
  {
    "title": "[Remoto] Fullstack (React) | Sênior na Sensedia",
    "html_url": "https://github.com/frontendbr/vagas/issues/8478",
    "body": ""
  }
]
```

- [ ] **Step 3: Escrever o teste que falha em `scraper/adapters/github.spec.ts`**

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseGithubIssues, extractTitleAndCompany } from './github.ts'

const json = readFileSync(
  fileURLToPath(new URL('./__fixtures__/github-issues.json', import.meta.url)),
  'utf8'
)

describe('extractTitleAndCompany', () => {
  it('splits on " na " preferentially', () => {
    expect(extractTitleAndCompany('[Remoto] Product Owner na BotCity')).toEqual({
      title: 'Product Owner',
      company: 'BotCity',
    })
  })

  it('keeps role text before " na " intact when it contains pipes', () => {
    expect(extractTitleAndCompany('[Remoto] Fullstack (React) | Sênior na Sensedia')).toEqual({
      title: 'Fullstack (React) | Sênior',
      company: 'Sensedia',
    })
  })

  it('falls back to a dash separator when there is no " na "', () => {
    expect(extractTitleAndCompany('[100% Remoto] Full-Stack Sênior - Igma')).toEqual({
      title: 'Full-Stack Sênior',
      company: 'Igma',
    })
  })

  it('uses the em dash placeholder when no separator matches', () => {
    expect(extractTitleAndCompany('[Remoto] Vaga sem empresa clara')).toEqual({
      title: 'Vaga sem empresa clara',
      company: '—',
    })
  })
})

describe('parseGithubIssues', () => {
  it('skips pull requests and maps issues to RawJob', () => {
    const jobs = parseGithubIssues(json)
    expect(jobs).toHaveLength(4)
    expect(jobs[0]).toEqual({
      title: 'Product Owner',
      company: 'BotCity',
      url: 'https://github.com/frontendbr/vagas/issues/8511',
      location: 'Remoto',
      description: 'Vaga de PO totalmente remota.',
    })
    expect(jobs.map((j) => j.url)).not.toContain('https://github.com/frontendbr/vagas/pull/8399')
  })

  it('maps null/empty body to null description', () => {
    const jobs = parseGithubIssues(json)
    expect(jobs[1].description).toBeNull() // body: null
    expect(jobs[3].description).toBeNull() // body: ""
  })

  it('returns [] for non-array / invalid JSON', () => {
    expect(parseGithubIssues('not json')).toEqual([])
    expect(parseGithubIssues('{}')).toEqual([])
  })
})
```

- [ ] **Step 4: Rodar o teste e confirmar que falha**

Run: `npx vitest run scraper/adapters/github.spec.ts`
Expected: FAIL — `github.ts` não existe / `parseGithubIssues` não exportada.

- [ ] **Step 5: Implementar `scraper/adapters/github.ts` (apenas parser nesta task)**

```ts
import type { Adapter, RawJob } from './types.ts'

interface GithubIssue {
  title?: string
  html_url?: string
  body?: string | null
  pull_request?: unknown
}

const NA = ' na '
const FALLBACK_SEPS = [' - ', ' – ', ' @ ']
const DESCRIPTION_MAX = 5000

export const extractTitleAndCompany = (rawTitle: string): { title: string; company: string } => {
  const stripped = rawTitle.replace(/^\s*\[[^\]]*\]\s*/, '').trim()

  let idx = stripped.lastIndexOf(NA)
  let sepLen = NA.length
  if (idx === -1) {
    for (const sep of FALLBACK_SEPS) {
      const i = stripped.lastIndexOf(sep)
      if (i > idx) {
        idx = i
        sepLen = sep.length
      }
    }
  }

  if (idx === -1) return { title: stripped, company: '—' }
  const title = stripped.slice(0, idx).trim()
  const company = stripped.slice(idx + sepLen).trim()
  if (!title || !company) return { title: stripped, company: '—' }
  return { title, company }
}

export const parseGithubIssues = (json: string): RawJob[] => {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []

  const jobs: RawJob[] = []
  for (const item of data as GithubIssue[]) {
    if (item.pull_request) continue
    const rawTitle = item.title?.trim()
    const url = item.html_url?.trim()
    if (!rawTitle || !url) continue
    const { title, company } = extractTitleAndCompany(rawTitle)
    const body = item.body?.trim() ?? ''
    jobs.push({
      title,
      company,
      url,
      location: 'Remoto',
      description: body ? body.slice(0, DESCRIPTION_MAX) : null,
    })
  }
  return jobs
}
```

(Nota: `Adapter` é importado aqui para uso na Task 2; deixe o import já presente.)

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `npx vitest run scraper/adapters/github.spec.ts`
Expected: PASS (7 testes).

- [ ] **Step 7: Commit**

```bash
git add scraper/adapters/types.ts scraper/adapters/github.ts scraper/adapters/github.spec.ts scraper/adapters/__fixtures__/github-issues.json
git commit -m "feat(scraper): parser de GitHub Issues + fetch opcional no Adapter (#24)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Fetch paginado + registro do adapter

**Files:**

- Modify: `scraper/adapters/github.ts`
- Modify: `scraper/adapters/index.ts`
- Test: `scraper/adapters/github.spec.ts` (append)
- Test: `scraper/adapters/index.spec.ts` (append)

**Interfaces:**

- Consumes: `FetchContext` de `./types.ts`; `parseGithubIssues` da Task 1.
- Produces:
  - `fetchGithubIssues(sourceUrl: string, httpGet: FetchContext['httpGet']): Promise<string>`
  - `github: Adapter` (com `host: 'github.com'`, `fetch`, `parse`).

- [ ] **Step 1: Escrever testes que falham (append em `scraper/adapters/github.spec.ts`)**

Adicionar o import e os blocos:

```ts
import { fetchGithubIssues, github } from './github.ts'

describe('fetchGithubIssues', () => {
  it('derives owner/repo, paginates, and concatenates issues', async () => {
    const pages: Record<string, string> = {
      'page=1': JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ id: i }))),
      'page=2': JSON.stringify([{ id: 100 }]),
    }
    const calls: string[] = []
    const httpGet = async (url: string) => {
      calls.push(url)
      const key = url.includes('page=2') ? 'page=2' : 'page=1'
      return { status: 200, body: pages[key] }
    }
    const result = await fetchGithubIssues('https://github.com/frontendbr/vagas', httpGet)
    const arr = JSON.parse(result)
    expect(arr).toHaveLength(101)
    expect(calls[0]).toContain('/repos/frontendbr/vagas/issues')
    expect(calls[0]).toContain('labels=Remoto')
    expect(calls).toHaveLength(2)
  })

  it('throws on HTTP error status', async () => {
    const httpGet = async () => ({ status: 403, body: 'rate limited' })
    await expect(fetchGithubIssues('https://github.com/backend-br/vagas', httpGet)).rejects.toThrow(
      /403/
    )
  })

  it('exposes a github adapter with fetch + parse for host github.com', () => {
    expect(github.host).toBe('github.com')
    expect(typeof github.fetch).toBe('function')
    expect(typeof github.parse).toBe('function')
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run scraper/adapters/github.spec.ts`
Expected: FAIL — `fetchGithubIssues` / `github` não exportados.

- [ ] **Step 3: Implementar fetch + adapter (append em `scraper/adapters/github.ts`)**

Trocar o import topo do arquivo para incluir `FetchContext`:

```ts
import type { Adapter, FetchContext, RawJob } from './types.ts'
```

Adicionar ao final do arquivo:

```ts
const PER_PAGE = 100

const repoFromUrl = (sourceUrl: string): string => {
  const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean)
  if (parts.length < 2) throw new Error(`cannot derive owner/repo from ${sourceUrl}`)
  return `${parts[0]}/${parts[1]}`
}

export const fetchGithubIssues = async (
  sourceUrl: string,
  httpGet: FetchContext['httpGet']
): Promise<string> => {
  const repo = repoFromUrl(sourceUrl)
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'remote-radar-scraper',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const all: unknown[] = []
  for (let page = 1; ; page += 1) {
    const url = `https://api.github.com/repos/${repo}/issues?state=open&labels=Remoto&per_page=${PER_PAGE}&page=${page}`
    const { status, body } = await httpGet(url, headers)
    if (status >= 400) {
      throw new Error(`GitHub API ${status} for ${repo} page ${page}`)
    }
    const parsed = JSON.parse(body) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) break
    all.push(...parsed)
    if (parsed.length < PER_PAGE) break
  }
  return JSON.stringify(all)
}

export const github: Adapter = {
  host: 'github.com',
  fetch: (url, ctx) => fetchGithubIssues(url, ctx.httpGet),
  parse: parseGithubIssues,
}
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npx vitest run scraper/adapters/github.spec.ts`
Expected: PASS (10 testes).

- [ ] **Step 5: Registrar o adapter em `scraper/adapters/index.ts`**

Adicionar o import junto aos outros e incluir `github` no array:

```ts
import { github } from './github.ts'
```

```ts
const adapters: Adapter[] = [
  weworkremotely,
  remotive,
  remoteok,
  euremotejobs,
  workingnomads,
  github,
]
```

- [ ] **Step 6: Escrever teste de resolução (append em `scraper/adapters/index.spec.ts`)**

```ts
import { github } from './github.ts'

it('resolves github.com sources to the github adapter', () => {
  expect(resolveAdapter('https://github.com/frontendbr/vagas')).toBe(github)
  expect(resolveAdapter('https://github.com/backend-br/vagas')).toBe(github)
})
```

(Se `resolveAdapter` ainda não estiver importado no arquivo, adicionar `import { resolveAdapter } from './index.ts'`.)

- [ ] **Step 7: Rodar e confirmar passa**

Run: `npx vitest run scraper/adapters/index.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add scraper/adapters/github.ts scraper/adapters/github.spec.ts scraper/adapters/index.ts scraper/adapters/index.spec.ts
git commit -m "feat(scraper): fetch paginado de GitHub Issues + registro do adapter (#24)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Branch de fetch no pipeline

**Files:**

- Modify: `scraper/pipeline.ts`
- Test: `scraper/pipeline.spec.ts`

**Interfaces:**

- Consumes: `FetchContext` de `./adapters/types.ts`.
- Produces: `PipelineDeps.httpGet: FetchContext['httpGet']`; pipeline usa `adapter.fetch` quando presente.

- [ ] **Step 1: Atualizar `baseDeps` e adicionar teste que falha (em `scraper/pipeline.spec.ts`)**

Adicionar `httpGet` ao objeto retornado por `baseDeps` (necessário para compilar):

```ts
  httpGet: async () => ({ status: 200, body: '[]' }),
```

Adicionar o teste do branch de fetch dentro do `describe('runScrape', ...)`:

```ts
it('uses adapter.fetch (not renderPage) when the adapter defines fetch', async () => {
  const renderPage = vi.fn(async () => '<html></html>')
  const httpGet = vi.fn(async () => ({
    status: 200,
    body: JSON.stringify([{ id: 1 }]),
  }))
  const fetchAdapter: Adapter = {
    host: 'api',
    fetch: (_url, ctx) => ctx.httpGet('https://api.example/x'),
    parse: () => [
      { title: 'Dev', company: 'C', url: 'https://x/1', location: 'Remoto', description: null },
    ],
  }
  const summary = await runScrape(
    baseDeps({ resolveAdapter: () => fetchAdapter, renderPage, httpGet })
  )
  expect(httpGet).toHaveBeenCalledTimes(1)
  expect(renderPage).not.toHaveBeenCalled()
  expect(summary.inserted).toBe(1)
})
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run scraper/pipeline.spec.ts`
Expected: FAIL — `httpGet` ausente em `PipelineDeps` (erro de tipo) e/ou `renderPage` ainda chamado.

- [ ] **Step 3: Implementar o branch em `scraper/pipeline.ts`**

Adicionar import de `FetchContext`:

```ts
import type { Adapter, RawJob, FetchContext } from './adapters/types.ts'
```

Adicionar `httpGet` ao `PipelineDeps`:

```ts
renderPage: (url: string, readySelector: string) => Promise<string>
httpGet: FetchContext['httpGet']
```

Trocar as duas linhas que fazem render + parse dentro do `try`:

```ts
      const adapter = deps.resolveAdapter(source.url)
      const content = adapter.fetch
        ? await adapter.fetch(source.url, { httpGet: deps.httpGet })
        : await deps.renderPage(source.url, adapter.readySelector!)
      const rows: JobRow[] = adapter.parse(content).map((raw) => {
```

- [ ] **Step 4: Rodar e confirmar passa**

Run: `npx vitest run scraper/pipeline.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/pipeline.ts scraper/pipeline.spec.ts
git commit -m "feat(scraper): pipeline usa adapter.fetch quando presente (#24)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Wiring em `run.ts` e verificação final

**Files:**

- Modify: `scraper/run.ts`

**Interfaces:**

- Consumes: `PipelineDeps.httpGet` (Task 3).

- [ ] **Step 1: Adicionar `httpGet` ao `runScrape({...})` em `scraper/run.ts`**

Dentro do objeto passado a `runScrape`, ao lado de `renderPage`:

```ts
      renderPage: (url, readySelector) => renderPage(browser, url, readySelector),
      httpGet: async (url, headers) => {
        const res = await fetch(url, { headers })
        return { status: res.status, body: await res.text() }
      },
```

- [ ] **Step 2: Type-check + build**

Run: `npm run build`
Expected: PASS (sem erros de TypeScript).

- [ ] **Step 3: Suíte completa**

Run: `npm run test:run`
Expected: PASS (todos os testes, incluindo os novos do scraper).

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add scraper/run.ts
git commit -m "feat(scraper): injeta httpGet (fetch global) no run (#24)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**

- Adapter via GitHub Issues API (não Playwright) → Tasks 1-2. ✓
- "source kind diferente" / fetch JSON em vez de renderPage → Task 3 (branch). ✓
- Paginação + label `Remoto` + `GITHUB_TOKEN` → Task 2. ✓
- URL = link da issue (`html_url`) + dedup por URL (via `upsertJobs` existente) → Task 1 + Global Constraints. ✓
- Teste do parser contra fixture JSON → Task 1. ✓
- Heurística título/empresa com placeholder `—`, location `Remoto`, description truncada/`null` → Task 1. ✓
- Registro/wiring (index + run) → Tasks 2 e 4. ✓

**Placeholder scan:** nenhum TODO/TBD; todo passo tem código/comando concreto. ✓

**Type consistency:** `FetchContext.httpGet` (assinatura `(url, headers?) => Promise<{status, body}>`) usada idêntica em `PipelineDeps.httpGet`, `fetchGithubIssues` e `run.ts`. `extractTitleAndCompany`/`parseGithubIssues`/`fetchGithubIssues`/`github` nomeados consistentemente entre tasks. ✓
