# GitHub Issues adapter (frontendbr/vagas, backend-br/vagas)

**Issue:** #24 (sub-issue de #29) · **Data:** 2026-06-24

## Problema

As fontes `github.com/frontendbr/vagas` e `github.com/backend-br/vagas` não são job
boards HTML — são repositórios cujas **issues abertas** são as vagas. O pipeline atual
(`renderPage` via Playwright + `adapter.parse(html)`) não as raspa: precisam da
**GitHub Issues API** (fetch JSON paginado com auth), não de renderização de página.

## Abordagem escolhida

**`fetch` opcional no Adapter.** Estende a interface `Adapter` com um método `fetch`
opcional. No pipeline, se o adapter define `fetch`, ele é usado; caso contrário usa
`renderPage` como hoje. O `parse` permanece **puro** (recebe string, sem rede/async),
mantendo a testabilidade contra fixture exigida pelo critério de aceite.

Alternativas descartadas:

- **"source kind" separado** — caminho/registro paralelo; mais boilerplate, sem ganho.
- **Playwright na URL da API** — injeção de header de auth capenga, paginação
  impossível num único load, e sobe browser à toa.

## Design

### 1. Interface (`scraper/adapters/types.ts`)

```ts
export interface FetchContext {
  httpGet: (
    url: string,
    headers?: Record<string, string>
  ) => Promise<{ status: number; body: string }>
}

export interface Adapter {
  host: string
  readySelector?: string // opcional; só adapters HTML usam
  fetch?(url: string, ctx: FetchContext): Promise<string> // opcional; ausente ⇒ renderPage
  parse(content: string): RawJob[]
}
```

### 2. Pipeline (`scraper/pipeline.ts`)

`PipelineDeps` ganha `httpGet` (mesma assinatura de `FetchContext.httpGet`). No loop:

```ts
const content = adapter.fetch
  ? await adapter.fetch(source.url, { httpGet: deps.httpGet })
  : await deps.renderPage(source.url, adapter.readySelector!)
const rows = adapter.parse(content).map(/* scoreJob + source_url, igual a hoje */)
```

O resto do pipeline (scoring, upsert, recordSourceRun, summary) não muda.

### 3. Adapter GitHub (`scraper/adapters/github.ts`)

Duas funções — impura (rede) e pura (parse):

**`fetchGithubIssues(url, httpGet): Promise<string>`**

- Deriva `owner/repo` do path da URL (`github.com/frontendbr/vagas` → `frontendbr/vagas`).
- Loop de páginas:
  `https://api.github.com/repos/{owner}/{repo}/issues?state=open&labels=Remoto&per_page=100&page=N`
- Headers: `Accept: application/vnd.github+json`, `User-Agent: remote-radar-scraper`,
  e `Authorization: Bearer ${GITHUB_TOKEN}` **se** `process.env.GITHUB_TOKEN` existir.
- Para quando uma página retorna `< 100` itens (última página).
- Concatena os arrays e retorna `JSON.stringify(allIssues)`.
- Lança erro se `status >= 400` (cai no tratamento de erro por-fonte do pipeline).

**`parseGithubIssues(json): RawJob[]`** (pura)

- `JSON.parse`; se não for array, retorna `[]`.
- Para cada issue:
  - Pula se tiver `pull_request` (PRs aparecem no endpoint de issues).
  - `{ title, company } = extractTitleAndCompany(issue.title)` (ver §4).
  - `url` = `issue.html_url`.
  - `location` = `'Remoto'` (já filtrado por label).
  - `description` = `issue.body?.trim()` truncado a 5000 chars; `null` se vazio.
  - Pula se `title` ou `url` ficarem vazios.

### 4. Extração título/empresa (`extractTitleAndCompany`, pura e testada)

1. Remove prefixo de modalidade: `^\s*\[[^\]]*\]\s*`
   (ex.: `[Remoto] `, `[100% Remoto] `).
2. Procura o **último** separador dentre `[' na ', ' - ', ' – ', ' @ ']`.
   O texto antes = `title`, o texto depois (trim) = `company`.
3. Se nenhum separador casar: `title` = string inteira (sem bracket),
   `company` = `'—'` (placeholder de empresa desconhecida — a vaga ainda é válida).

Exemplos:
| Título bruto | title | company |
| --- | --- | --- |
| `[Remoto] Product Owner na BotCity` | `Product Owner` | `BotCity` |
| `[Remoto] Fullstack Developer (React + Angular) \| Sênior na Sensedia` | `Fullstack Developer (React + Angular) \| Sênior` | `Sensedia` |
| `[Remoto] Full-Stack Sênior - Igma` | `Full-Stack Sênior` | `Igma` |
| `[Remoto] Vaga sem empresa clara` | `Vaga sem empresa clara` | `—` |

### 5. Registro e wiring

- `scraper/adapters/index.ts`: importa e adiciona `github` ao array `adapters`.
  `resolveAdapter('https://github.com/...')` casa por `host === 'github.com'`.
- `scraper/run.ts`: adiciona `httpGet` ao `runScrape({...})` usando o `fetch` global
  do Node 24:

```ts
httpGet: async (url, headers) => {
  const res = await fetch(url, { headers })
  return { status: res.status, body: await res.text() }
}
```

## Testes

- **`scraper/adapters/github.spec.ts`** — `parseGithubIssues` contra
  `__fixtures__/github-issues.json` (mistura de modalidades de separador, uma issue com
  `pull_request`, uma sem empresa parseável, uma com body vazio). Verifica
  extração título/empresa, skip de PR, `location='Remoto'`, body→description.
  **(critério de aceite)**
- **`scraper/adapters/index.spec.ts`** — `resolveAdapter` para URLs github.com → github.
- **`scraper/pipeline.spec.ts`** — caso com adapter que define `fetch`: usa `httpGet`
  mockado (não `renderPage`) e produz linhas.

## Critérios de aceite (issue #24)

- [x] Vagas das duas listas inseridas no Supabase com `url` = link da issue
      (dedup por URL já garantido por `upsertJobs` → `onConflict: 'url'`).
- [x] Teste unitário do parser de issues contra fixture JSON.

## Fora de escopo

- Cadastro/ativação das fontes em `scraping_sources` (já existem como ativas no run #17).
- Filtros de modalidade além de `Remoto` (ex.: `Exterior`/`Híbrido`).
- Paralelismo/timeout do pipeline (issue #27).
