import { useMemo } from 'react'
import { buildDorkUrl } from '../utils/dorkUrl'

export const useNetworkingDork = (companyName: string): string =>
  useMemo(() => buildDorkUrl(companyName), [companyName])
