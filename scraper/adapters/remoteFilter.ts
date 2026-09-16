// Text-based remote/onsite classification for sources whose data has no
// reliable structured "remote" field (issue #108) — currently used by the
// generic JSON-LD adapter, which otherwise inserts every JobPosting
// regardless of location. Schema.org's `jobLocationType: TELECOMMUTE` is
// checked first when present, since it's an explicit structured signal;
// `looksRemote` is the text-based fallback for postings that don't set it.
//
// Deliberately conservative: only the job title and location are scanned
// (not the full description, which is long free text that can mention
// "remote" or "hybrid" incidentally without describing the role itself), a
// deny cue (hybrid/on-site/in-office) always overrides an allow cue, and a
// posting with neither an allow nor a deny cue is treated as NOT remote —
// this app exists to surface remote roles, so under-including an
// ambiguous/unlabeled posting is the safer default over polluting the feed.

const ALLOW_PATTERNS = [
  /\bremote\b/i,
  /work from anywhere/i,
  /\bremote[- ]first\b/i,
  /100%\s*remote/i,
]

const DENY_PATTERNS = [/\bhybrid\b/i, /\bon-?site\b/i, /\bin[- ]office\b/i]

export const isRemoteJobLocationType = (value: unknown): boolean => {
  if (typeof value === 'string') return value.toUpperCase() === 'TELECOMMUTE'
  if (Array.isArray(value)) {
    return value.some((v) => typeof v === 'string' && v.toUpperCase() === 'TELECOMMUTE')
  }
  return false
}

export const looksRemote = (job: { title: string; location: string | null }): boolean => {
  const text = [job.title, job.location].filter(Boolean).join(' ')
  if (DENY_PATTERNS.some((re) => re.test(text))) return false
  return ALLOW_PATTERNS.some((re) => re.test(text))
}
