# Scraper board adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 4 adapters de job board (Remotive, RemoteOK, EU Remote Jobs, Working Nomads) ao scraper, cada um com fixture + teste, registrados em `resolveAdapter`, e ajustar as URLs das fontes.

**Architecture:** Cada adapter segue o padrão de `weworkremotely.ts`: função `parse<Nome>(html)` pura (jsdom, sem rede/async) + objeto `Adapter` (`host`, `readySelector`, `parse`). Adapters de API (Remotive/RemoteOK) leem JSON de um `<pre>` renderizado. Sem mudança no pipeline.

**Tech Stack:** TypeScript (ESM, imports com extensão `.ts`), jsdom, Vitest (`// @vitest-environment node`).

## Global Constraints

- `RawJob` = `{ title: string; company: string; url: string; location: string | null; description: string | null }`. Pular qualquer entrada sem `title`/`company`/`url`.
- `Adapter` = `{ host: string; readySelector: string; parse(html: string): RawJob[] }`. `host` é o hostname sem `www.`.
- Imports internos usam extensão `.ts` (ex.: `from './types.ts'`), como no código existente.
- Specs de adapter usam `// @vitest-environment node` e leem o fixture com `readFileSync(fileURLToPath(new URL('./__fixtures__/<nome>.html', import.meta.url)), 'utf8')`, no molde de `weworkremotely.spec.ts`.
- Exports nomeados. Sem dependências novas.
- Rodar um teste único com `npx vitest run <arquivo>`; suíte completa com `npm run test:run`; type-check com `npm run build`; lint com `npm run lint`.

---

### Task 1: Remotive adapter (API JSON)

**Files:**

- Create: `scraper/adapters/remotive.ts`
- Create: `scraper/adapters/__fixtures__/remotive.html`
- Test: `scraper/adapters/remotive.spec.ts`

**Interfaces:**

- Produces: `parseRemotive(html: string): RawJob[]` e `remotive: Adapter` (`host: 'remotive.com'`, `readySelector: 'pre'`).

- [ ] **Step 1: Criar o fixture**

`scraper/adapters/__fixtures__/remotive.html`:

```html
<html>
  <body>
    <pre>{"job-count":2,"jobs":[{"title":"Mid/Senior AI Cinematic Video Editor","company_name":"EverAI","url":"https://remotive.com/remote-jobs/artificial-intelligence/mid-senior-ai-cinematic-video-editor-2090887","candidate_required_location":"Worldwide","description":"<p>Edit cinematic AI video.</p>"},{"title":"Senior Independent AI Engineer / Architect","company_name":"A.Team","url":"https://remotive.com/remote-jobs/software-development/senior-independent-ai-engineer-architect-1919266","candidate_required_location":"Americas, Europe, Israel","description":"<p>Architect AI systems.</p>"},{"title":"No URL Job","company_name":"Ghost Co","url":"","candidate_required_location":"Worldwide","description":""}]}</pre>
  </body>
</html>
```

- [ ] **Step 2: Escrever o teste (falha)**

`scraper/adapters/remotive.spec.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { remotive } from './remotive.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/remotive.html', import.meta.url)),
  'utf8'
)

describe('remotive adapter', () => {
  it('targets the right host', () => {
    expect(remotive.host).toBe('remotive.com')
  })

  it('parses the embedded JSON and skips entries missing required fields', () => {
    const jobs = remotive.parse(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Mid/Senior AI Cinematic Video Editor',
      company: 'EverAI',
      url: 'https://remotive.com/remote-jobs/artificial-intelligence/mid-senior-ai-cinematic-video-editor-2090887',
      location: 'Worldwide',
      description: '<p>Edit cinematic AI video.</p>',
    })
    expect(jobs[1].company).toBe('A.Team')
    expect(jobs[1].location).toBe('Americas, Europe, Israel')
  })
})
```

- [ ] **Step 3: Rodar para confirmar a falha**

Run: `npx vitest run scraper/adapters/remotive.spec.ts`
Expected: FAIL (`remotive.ts` não existe).

- [ ] **Step 4: Implementar o adapter**

`scraper/adapters/remotive.ts`:

```ts
import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'

interface RemotiveJob {
  title?: string
  company_name?: string
  url?: string
  candidate_required_location?: string
  description?: string
}

export const parseRemotive = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const pre = document.querySelector('pre')
  if (!pre) return []
  let data: { jobs?: RemotiveJob[] }
  try {
    data = JSON.parse(pre.textContent ?? '')
  } catch {
    return []
  }
  const jobs: RawJob[] = []
  for (const j of data.jobs ?? []) {
    const title = j.title?.trim() || null
    const company = j.company_name?.trim() || null
    const url = j.url?.trim() || null
    if (!title || !company || !url) continue
    jobs.push({
      title,
      company,
      url,
      location: j.candidate_required_location?.trim() || null,
      description: j.description?.trim() || null,
    })
  }
  return jobs
}

export const remotive: Adapter = {
  host: 'remotive.com',
  readySelector: 'pre',
  parse: parseRemotive,
}
```

- [ ] **Step 5: Rodar e confirmar PASS**

Run: `npx vitest run scraper/adapters/remotive.spec.ts`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add scraper/adapters/remotive.ts scraper/adapters/remotive.spec.ts scraper/adapters/__fixtures__/remotive.html
git commit -m "feat(scraper): Remotive adapter (#23)"
```

---

### Task 2: RemoteOK adapter (API JSON array)

**Files:**

- Create: `scraper/adapters/remoteok.ts`
- Create: `scraper/adapters/__fixtures__/remoteok.html`
- Test: `scraper/adapters/remoteok.spec.ts`

**Interfaces:**

- Produces: `parseRemoteOk(html: string): RawJob[]` e `remoteok: Adapter` (`host: 'remoteok.com'`, `readySelector: 'pre'`). O primeiro elemento do array é um aviso legal (sem `position`) e é pulado.

- [ ] **Step 1: Criar o fixture**

`scraper/adapters/__fixtures__/remoteok.html`:

```html
<html>
  <body>
    <pre>
[{"legal":"API Terms of Service: Please link back to remoteok.com"},{"slug":"remote-freelance-website-copywriter","id":"1133968","position":"Freelance Website Copywriter Content Strategist","company":"N4 Studio","url":"https://remoteOK.com/remote-jobs/remote-freelance-website-copywriter-content-strategist-n4-studior-1133968","location":"Sydney, Sydney, New South Wales, Australia","description":"Write copy."},{"slug":"remote-biology-research-expert","id":"1133980","position":"Biology Research Expert","company":"24-MAG","url":"https://remoteOK.com/remote-jobs/remote-biology-research-expert-65-95-hour-24-mag-1133980","location":"New York, New York, New York, United States","description":"Research."}]</pre
    >
  </body>
</html>
```

- [ ] **Step 2: Escrever o teste (falha)**

`scraper/adapters/remoteok.spec.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { remoteok } from './remoteok.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/remoteok.html', import.meta.url)),
  'utf8'
)

describe('remoteok adapter', () => {
  it('targets the right host', () => {
    expect(remoteok.host).toBe('remoteok.com')
  })

  it('parses the JSON array and skips the leading legal notice', () => {
    const jobs = remoteok.parse(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Freelance Website Copywriter Content Strategist',
      company: 'N4 Studio',
      url: 'https://remoteOK.com/remote-jobs/remote-freelance-website-copywriter-content-strategist-n4-studior-1133968',
      location: 'Sydney, Sydney, New South Wales, Australia',
      description: 'Write copy.',
    })
    expect(jobs[1].company).toBe('24-MAG')
  })
})
```

- [ ] **Step 3: Rodar para confirmar a falha**

Run: `npx vitest run scraper/adapters/remoteok.spec.ts`
Expected: FAIL (`remoteok.ts` não existe).

- [ ] **Step 4: Implementar o adapter**

`scraper/adapters/remoteok.ts`:

```ts
import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'

interface RemoteOkJob {
  position?: string
  company?: string
  url?: string
  location?: string
  description?: string
}

export const parseRemoteOk = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const pre = document.querySelector('pre')
  if (!pre) return []
  let data: unknown
  try {
    data = JSON.parse(pre.textContent ?? '')
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []
  const jobs: RawJob[] = []
  for (const item of data as RemoteOkJob[]) {
    const title = item.position?.trim() || null
    const company = item.company?.trim() || null
    const url = item.url?.trim() || null
    if (!title || !company || !url) continue
    jobs.push({
      title,
      company,
      url,
      location: item.location?.trim() || null,
      description: item.description?.trim() || null,
    })
  }
  return jobs
}

export const remoteok: Adapter = {
  host: 'remoteok.com',
  readySelector: 'pre',
  parse: parseRemoteOk,
}
```

- [ ] **Step 5: Rodar e confirmar PASS**

Run: `npx vitest run scraper/adapters/remoteok.spec.ts`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add scraper/adapters/remoteok.ts scraper/adapters/remoteok.spec.ts scraper/adapters/__fixtures__/remoteok.html
git commit -m "feat(scraper): RemoteOK adapter (#23)"
```

---

### Task 3: EU Remote Jobs adapter (HTML)

**Files:**

- Create: `scraper/adapters/euremotejobs.ts`
- Create: `scraper/adapters/__fixtures__/euremotejobs.html`
- Test: `scraper/adapters/euremotejobs.spec.ts`

**Interfaces:**

- Produces: `parseEuRemoteJobs(html: string): RawJob[]` e `euremotejobs: Adapter` (`host: 'euremotejobs.com'`, `readySelector: 'a.job-card-link'`).

- [ ] **Step 1: Criar o fixture**

`scraper/adapters/__fixtures__/euremotejobs.html`:

```html
<html>
  <body>
    <div class="job-listings-container">
      <a
        href="https://euremotejobs.com/job/kodify-media-group-europe-full-time-software-development-engineer-in-test/"
        class="job-card-link"
      >
        <div class="job-card">
          <div class="job-details">
            <h2 class="job-title">Software Development Engineer in Test</h2>
            <div class="company-name">Kodify Media Group</div>
            <div class="job-meta">
              <div class="meta-item meta-location"><span>Europe</span></div>
            </div>
          </div>
        </div>
      </a>
      <a
        href="https://euremotejobs.com/job/lemon-io-europe-latam-central-america-flexible-schedule-full-time-head-of-engineering/"
        class="job-card-link"
      >
        <div class="job-card">
          <div class="job-details">
            <h2 class="job-title">Head of Engineering</h2>
            <div class="company-name">Lemon.io</div>
            <div class="job-meta">
              <div class="meta-item meta-location">Costa Rica, Europe, LATAM</div>
            </div>
          </div>
        </div>
      </a>
      <a href="https://euremotejobs.com/job/noise/" class="job-card-link">
        <div class="job-card"></div>
      </a>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Escrever o teste (falha)**

`scraper/adapters/euremotejobs.spec.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { euremotejobs } from './euremotejobs.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/euremotejobs.html', import.meta.url)),
  'utf8'
)

describe('euremotejobs adapter', () => {
  it('targets the right host', () => {
    expect(euremotejobs.host).toBe('euremotejobs.com')
  })

  it('extracts listings and skips cards missing title/company', () => {
    const jobs = euremotejobs.parse(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Software Development Engineer in Test',
      company: 'Kodify Media Group',
      url: 'https://euremotejobs.com/job/kodify-media-group-europe-full-time-software-development-engineer-in-test/',
      location: 'Europe',
      description: null,
    })
    expect(jobs[1].company).toBe('Lemon.io')
    expect(jobs[1].location).toBe('Costa Rica, Europe, LATAM')
  })
})
```

- [ ] **Step 3: Rodar para confirmar a falha**

Run: `npx vitest run scraper/adapters/euremotejobs.spec.ts`
Expected: FAIL (`euremotejobs.ts` não existe).

- [ ] **Step 4: Implementar o adapter**

`scraper/adapters/euremotejobs.ts`:

```ts
import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'

const text = (el: Element | null): string | null =>
  el?.textContent?.replace(/\s+/g, ' ').trim() || null

export const parseEuRemoteJobs = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const anchors = Array.from(document.querySelectorAll('a.job-card-link'))
  const jobs: RawJob[] = []
  for (const a of anchors) {
    const title = text(a.querySelector('.job-title'))
    const company = text(a.querySelector('.company-name'))
    const url = a.getAttribute('href')
    if (!title || !company || !url) continue
    jobs.push({
      title,
      company,
      url,
      location: text(a.querySelector('.meta-location')),
      description: null,
    })
  }
  return jobs
}

export const euremotejobs: Adapter = {
  host: 'euremotejobs.com',
  readySelector: 'a.job-card-link',
  parse: parseEuRemoteJobs,
}
```

- [ ] **Step 5: Rodar e confirmar PASS**

Run: `npx vitest run scraper/adapters/euremotejobs.spec.ts`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add scraper/adapters/euremotejobs.ts scraper/adapters/euremotejobs.spec.ts scraper/adapters/__fixtures__/euremotejobs.html
git commit -m "feat(scraper): EU Remote Jobs adapter (#23)"
```

---

### Task 4: Working Nomads adapter (HTML)

**Files:**

- Create: `scraper/adapters/workingnomads.ts`
- Create: `scraper/adapters/__fixtures__/workingnomads.html`
- Test: `scraper/adapters/workingnomads.spec.ts`

**Interfaces:**

- Produces: `parseWorkingNomads(html: string): RawJob[]` e `workingnomads: Adapter` (`host: 'workingnomads.com'`, `readySelector: 'a.job-desktop[href^="/jobs/"]'`). URLs relativas viram absolutas com `BASE = 'https://www.workingnomads.com'`.

- [ ] **Step 1: Criar o fixture**

`scraper/adapters/__fixtures__/workingnomads.html`:

```html
<html>
  <body>
    <div class="jobs-list">
      <a class="job-desktop" href="/jobs/senior-devops-engineer-lemonio-1685353">
        <h4 class="ng-binding">Senior DevOps Engineer</h4>
        <div class="company hidden-xs ng-binding">Lemon.io</div>
      </a>
      <a
        class="job-desktop"
        href="/jobs/senior-google-ads-account-manager-remote-work-from-home-stubgroup-1677142"
      >
        <h4 class="ng-binding">Senior Google Ads Account Manager - Remote (Work From Home)</h4>
        <div class="company hidden-xs ng-binding">StubGroup</div>
      </a>
      <a class="job-desktop" href="/jobs/noise-no-title"><span>no title</span></a>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Escrever o teste (falha)**

`scraper/adapters/workingnomads.spec.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { workingnomads } from './workingnomads.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/workingnomads.html', import.meta.url)),
  'utf8'
)

describe('workingnomads adapter', () => {
  it('targets the right host', () => {
    expect(workingnomads.host).toBe('workingnomads.com')
  })

  it('extracts listings with absolute URLs and skips anchors missing a title', () => {
    const jobs = workingnomads.parse(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Senior DevOps Engineer',
      company: 'Lemon.io',
      url: 'https://www.workingnomads.com/jobs/senior-devops-engineer-lemonio-1685353',
      location: null,
      description: null,
    })
    expect(jobs[1].company).toBe('StubGroup')
  })
})
```

- [ ] **Step 3: Rodar para confirmar a falha**

Run: `npx vitest run scraper/adapters/workingnomads.spec.ts`
Expected: FAIL (`workingnomads.ts` não existe).

- [ ] **Step 4: Implementar o adapter**

`scraper/adapters/workingnomads.ts`:

```ts
import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'

const BASE = 'https://www.workingnomads.com'

const text = (el: Element | null): string | null =>
  el?.textContent?.replace(/\s+/g, ' ').trim() || null

export const parseWorkingNomads = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const anchors = Array.from(document.querySelectorAll('a.job-desktop[href^="/jobs/"]'))
  const jobs: RawJob[] = []
  for (const a of anchors) {
    const title = text(a.querySelector('h4'))
    const company = text(a.querySelector('.company'))
    const href = a.getAttribute('href')
    if (!title || !company || !href) continue
    jobs.push({
      title,
      company,
      url: `${BASE}${href}`,
      location: null,
      description: null,
    })
  }
  return jobs
}

export const workingnomads: Adapter = {
  host: 'workingnomads.com',
  readySelector: 'a.job-desktop[href^="/jobs/"]',
  parse: parseWorkingNomads,
}
```

- [ ] **Step 5: Rodar e confirmar PASS**

Run: `npx vitest run scraper/adapters/workingnomads.spec.ts`
Expected: PASS (2 testes).

- [ ] **Step 6: Commit**

```bash
git add scraper/adapters/workingnomads.ts scraper/adapters/workingnomads.spec.ts scraper/adapters/__fixtures__/workingnomads.html
git commit -m "feat(scraper): Working Nomads adapter (#23)"
```

---

### Task 5: Registrar adapters em `resolveAdapter`

**Files:**

- Modify: `scraper/adapters/index.ts`
- Test: `scraper/adapters/index.spec.ts`

**Interfaces:**

- Consumes: `remotive`, `remoteok`, `euremotejobs`, `workingnomads` das Tasks 1–4.
- Produces: `resolveAdapter` agora resolve os 4 novos hosts; cai no genérico só para hosts realmente desconhecidos.

- [ ] **Step 1: Atualizar o teste (falha)**

Substituir todo o conteúdo de `scraper/adapters/index.spec.ts` por:

```ts
import { describe, it, expect } from 'vitest'
import { resolveAdapter } from './index.ts'

describe('resolveAdapter', () => {
  it('matches a known host (ignoring www.)', () => {
    expect(resolveAdapter('https://www.weworkremotely.com/remote-jobs').host).toBe(
      'weworkremotely.com'
    )
  })

  it('resolves the newly registered board hosts', () => {
    expect(resolveAdapter('https://remotive.com/api/remote-jobs').host).toBe('remotive.com')
    expect(resolveAdapter('https://remoteok.com/api').host).toBe('remoteok.com')
    expect(resolveAdapter('https://euremotejobs.com/jobs/').host).toBe('euremotejobs.com')
    expect(resolveAdapter('https://www.workingnomads.com/jobs').host).toBe('workingnomads.com')
  })

  it('falls back to the generic adapter for unknown hosts', () => {
    expect(resolveAdapter('https://example.com').host).toBe('*')
  })

  it('falls back to generic for invalid URLs', () => {
    expect(resolveAdapter('not a url').host).toBe('*')
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run scraper/adapters/index.spec.ts`
Expected: FAIL (remoteok.com ainda cai no genérico `*`).

- [ ] **Step 3: Registrar os adapters**

Substituir todo o conteúdo de `scraper/adapters/index.ts` por:

```ts
import type { Adapter } from './types.ts'
import { generic } from './generic.ts'
import { weworkremotely } from './weworkremotely.ts'
import { remotive } from './remotive.ts'
import { remoteok } from './remoteok.ts'
import { euremotejobs } from './euremotejobs.ts'
import { workingnomads } from './workingnomads.ts'

const adapters: Adapter[] = [weworkremotely, remotive, remoteok, euremotejobs, workingnomads]

export const resolveAdapter = (sourceUrl: string): Adapter => {
  let host = ''
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, '')
  } catch {
    return generic
  }
  return adapters.find((a) => host === a.host || host.endsWith(`.${a.host}`)) ?? generic
}
```

- [ ] **Step 4: Rodar e confirmar PASS**

Run: `npx vitest run scraper/adapters/index.spec.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add scraper/adapters/index.ts scraper/adapters/index.spec.ts
git commit -m "feat(scraper): register board adapters in resolveAdapter (#23)"
```

---

### Task 6: Ajustar URLs das fontes + verificação final

**Files:**

- Modify: `supabase/seed.sql`

**Interfaces:**

- Consumes: hosts dos adapters das Tasks 1–4 (as URLs ajustadas precisam resolver para eles).

- [ ] **Step 1: Ajustar as 4 URLs no seed**

Em `supabase/seed.sql`, alterar exatamente estas 4 linhas (manter os labels):

De:

```sql
  ('https://remoteok.com',            'Remote OK',        true),
```

Para:

```sql
  ('https://remoteok.com/api',        'Remote OK',        true),
```

De:

```sql
  ('https://remotive.io',             'Remotive',         true),
```

Para:

```sql
  ('https://remotive.com/api/remote-jobs', 'Remotive',    true),
```

De:

```sql
  ('https://www.workingnomads.com',   'Working Nomads',   true),
```

Para:

```sql
  ('https://www.workingnomads.com/jobs', 'Working Nomads', true),
```

De:

```sql
  ('https://euremotejobs.com',        'EU Remote Jobs',   true),
```

Para:

```sql
  ('https://euremotejobs.com/jobs/',  'EU Remote Jobs',   true),
```

- [ ] **Step 2: Verificar que as URLs ajustadas resolvem para os adapters certos**

Run:

```bash
npx tsx -e "import { resolveAdapter } from './scraper/adapters/index.ts'; for (const u of ['https://remoteok.com/api','https://remotive.com/api/remote-jobs','https://www.workingnomads.com/jobs','https://euremotejobs.com/jobs/']) console.log(u, '->', resolveAdapter(u).host)"
```

Expected (sem fallback `*`):

```
https://remoteok.com/api -> remoteok.com
https://remotive.com/api/remote-jobs -> remotive.com
https://www.workingnomads.com/jobs -> workingnomads.com
https://euremotejobs.com/jobs/ -> euremotejobs.com
```

> Se `npx tsx` não estiver disponível, pular este passo — a Task 5 já cobre a resolução via teste unitário.

- [ ] **Step 3: Verificação completa (suíte + build + lint)**

Run: `npm run test:run && npm run build && npm run lint`
Expected: todos os testes passam (incluindo os 4 novos specs de adapter); build (type-check) sem erros; lint sem novos erros.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore(scraper): point board sources to listing/API URLs (#23)"
```

---

## Notas de verificação final

O critério "≥3 boards com `inserted > 0` num run" é validado ponta-a-ponta por um
run do workflow real após o merge (fora dos testes unitários). As duas APIs
(Remotive/RemoteOK) foram validadas como parseáveis a partir de captura real
renderizada via Playwright.
