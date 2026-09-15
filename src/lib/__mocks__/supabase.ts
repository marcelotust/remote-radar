import {
  MOCK_JOBS,
  MOCK_COMPANIES,
  MOCK_SOURCES,
  MOCK_SCORING_KEYWORDS,
  MOCK_SCORING_SETTINGS,
  MOCK_ALLOWED_USERS,
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
  allowed_users: structuredClone(MOCK_ALLOWED_USERS) as unknown as Row[],
})

let db: Record<string, Row[]> = seed()

// --- Auth fake ---------------------------------------------------------
// Minimal fake session: only the shape AuthContext actually reads
// (`session.user.id` / `session.user.email`).
export type FakeSession = { user: { id: string; email: string }; access_token: string }
type AuthChangeCallback = (event: string, session: FakeSession | null) => void

let session: FakeSession | null = null
let authListeners: AuthChangeCallback[] = []

const notifyAuthListeners = (event: string) => {
  authListeners.forEach((cb) => cb(event, session))
}

/** Test helper: simulate a signed-in (or signed-out, passing null) user. */
export const __setSupabaseSession = (next: FakeSession | null) => {
  session = next
  notifyAuthListeners(next ? 'SIGNED_IN' : 'SIGNED_OUT')
}

export const __resetSupabaseMock = () => {
  db = seed()
  session = null
  authListeners = []
}

type QueryResult = { data: unknown; error: Error | null }

class QueryBuilder implements PromiseLike<QueryResult> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private payload: Row | Row[] | null = null
  private filters: Array<[string, unknown]> = []
  private singleRow = false
  private conflictColumns: string[] = ['id']

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

  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert'
    this.payload = payload
    if (opts?.onConflict) this.conflictColumns = opts.onConflict.split(',')
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
      case 'upsert': {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload as Row]
        const results = rows.map((incoming) => {
          const existing = table.find((r) =>
            this.conflictColumns.every((c) => r[c] === incoming[c])
          )
          if (existing) {
            Object.assign(existing, incoming)
            return existing
          }
          const row: Row = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...incoming,
          }
          table.push(row)
          return row
        })
        return {
          data: this.singleRow ? structuredClone(results[0] ?? null) : structuredClone(results),
          error: null,
        }
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
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: (callback: AuthChangeCallback) => {
      authListeners.push(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners = authListeners.filter((cb) => cb !== callback)
            },
          },
        },
      }
    },
    signInWithOtp: async ({ email }: { email: string }) => {
      if (!email.includes('@')) return { data: {}, error: new Error('Invalid email') }
      return { data: {}, error: null }
    },
    signOut: async () => {
      __setSupabaseSession(null)
      return { error: null }
    },
  },
  rpc: (fn: string, params?: Record<string, unknown>) => {
    if (fn === 'is_email_allowed') {
      const checkEmail = String(params?.check_email ?? '').toLowerCase()
      const allowed = db.allowed_users.some((row) => row.email === checkEmail)
      return Promise.resolve({ data: allowed, error: null })
    }
    return Promise.resolve({ data: null, error: new Error(`Unknown rpc: ${fn}`) })
  },
}
