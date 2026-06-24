import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'
import { __resetSupabaseMock } from './lib/__mocks__/supabase'

// Use the in-memory Supabase fake (src/lib/__mocks__/supabase.ts) for all tests
// so hooks exercise real query/mutation logic without a live backend.
vi.mock('./lib/supabase')

// jsdom has no matchMedia. Default to "not matching" (i.e. mobile / below lg),
// which is the viewport where the mobile BottomSheet is shown. Individual tests
// override this to assert desktop (lg+) behaviour. Guarded for node-environment
// specs (e.g. the scraper adapters) that run without a `window`.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

beforeEach(() => {
  __resetSupabaseMock()
})
