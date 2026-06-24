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
