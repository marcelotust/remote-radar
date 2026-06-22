import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'
import { __resetSupabaseMock } from './lib/__mocks__/supabase'

// Use the in-memory Supabase fake (src/lib/__mocks__/supabase.ts) for all tests
// so hooks exercise real query/mutation logic without a live backend.
vi.mock('./lib/supabase')

beforeEach(() => {
  __resetSupabaseMock()
})
