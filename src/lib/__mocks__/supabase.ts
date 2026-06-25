import {
  MOCK_JOBS,
  MOCK_COMPANIES,
  MOCK_SOURCES,
  MOCK_SCORING_KEYWORDS,
  MOCK_SCORING_SETTINGS,
} from '../../data/mockData'

// In-memory fake of the Supabase client used in tests. It mimics the subset of
// the query-builder API the hooks rely on (select/insert/update/delete/eq/single/
// order) backed by clones of the mock data. `__resetSupabaseMock` reseeds the
// store and is called before every test (see src/test-setup.ts).

type Row = Record<string, unknown>

const seed = (): Record<string, Row[]> => ({
  jobs: structuredClone(MOCK_JOBS) as unknown as Row[],
  companies: structuredClone(MOCK_COMPANIES) as unknown as Row[],
  scraping_sources: structuredClone(MOCK_SOURCES) as unknown as Row[],
  scoring_keywords: structuredClone(MOCK_SCORING_KEYWORDS) as unknown as Row[],
  scoring_settings: structuredClone(MOCK_SCORING_SETTINGS) as unknown as Row[],
})

let db: Record<string, Row[]> = seed()

export const __resetSupabaseMock = () => {
  db = seed()
}

type QueryResult = { data: unknown; error: Error | null }

class QueryBuilder implements PromiseLike<QueryResult> {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: Row | Row[] | null = null
  private filters: Array<[string, unknown]> = []
  private singleRow = false

  constructor(private table: string) {}

  select() {
    return this
  }

  order() {
    return this
  }

  insert(payload: Row | Row[]) {
    this.op = 'insert'
    this.payload = payload
    return this
  }

  update(payload: Row) {
    this.op = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.op = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }

  single() {
    this.singleRow = true
    return this
  }

  private matches(row: Row) {
    return this.filters.every(([col, val]) => row[col] === val)
  }

  private run(): QueryResult {
    const table = db[this.table]
    if (!table) return { data: null, error: new Error(`Unknown table: ${this.table}`) }

    switch (this.op) {
      case 'insert': {
        const stamp = (p: Row): Row => ({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...p,
        })
        if (Array.isArray(this.payload)) {
          const rows = this.payload.map(stamp)
          table.push(...rows)
          return { data: structuredClone(rows), error: null }
        }
        const row = stamp(this.payload as Row)
        table.push(row)
        return { data: structuredClone(row), error: null }
      }
      case 'update': {
        const updated = table
          .filter((r) => this.matches(r))
          .map((r) => Object.assign(r, this.payload as Row))
        return {
          data: this.singleRow ? structuredClone(updated[0] ?? null) : structuredClone(updated),
          error: null,
        }
      }
      case 'delete': {
        db[this.table] = table.filter((r) => !this.matches(r))
        return { data: null, error: null }
      }
      default: {
        const selected = this.filters.length ? table.filter((r) => this.matches(r)) : table
        return {
          data: this.singleRow ? structuredClone(selected[0] ?? null) : structuredClone(selected),
          error: null,
        }
      }
    }
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }
}

export const supabase = {
  from: (table: string) => new QueryBuilder(table),
}
