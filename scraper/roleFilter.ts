// Ingest-time scope filter: the shared `jobs` pool only keeps software-
// development roles, which is what everyone in the group is after. Per-person
// targeting (stack, seniority, where someone can be hired) happens downstream
// of the pool, so this stays deliberately broad within development.
//
// Title-only and allowlist-based: a title must name a development role. Two
// kinds of titles that reuse those words are then rejected: compound roles
// ("Sales Engineer", "Developer Advocate") always, and leadership or non-dev
// nouns ("Engineering Manager", "Engineering Recruiter") unless the title also
// names an individual-contributor role, as in "Software Engineer, Password
// Manager" — where "Manager" is the product, not the job.

const words = (terms: string[]): RegExp =>
  new RegExp(`(?<![a-z])(${terms.join('|')})(?![a-z])`, 'i')

const DEV_ROLE = words([
  'engineer(s|ing)?',
  'developers?',
  'devs?',
  'programmers?',
  'swe',
  'sdet',
  'sre',
  'devops',
  'devsecops',
  'mlops',
  'full[- ]?stack',
  'front[- ]?end',
  'back[- ]?end',
  'software architect',
  'tech(nical)? lead',
  'member of technical staff',
  'desenvolvedor(a|es|as)?',
  'programador(a|es|as)?',
  'engenheir[oa]s?',
  'engenharia de software',
  'arquitet[oa] de software',
  'desarrollador(a|es|as)?',
  'ingenier[oa]s?',
  'arquitect[oa] de software',
])

// An explicit individual-contributor noun. "Engineering" is left out on
// purpose: it names the department in "Engineering Manager".
const IC_NOUN = words([
  'engineers?',
  'developers?',
  'devs?',
  'programmers?',
  'swe',
  'sdet',
  'sre',
  'desenvolvedor(a|es|as)?',
  'programador(a|es|as)?',
  'engenheir[oa]s?',
  'desarrollador(a|es|as)?',
  'ingenier[oa]s?',
])

const NON_DEV_COMPOUND = words([
  '(sales|pre-?sales|solutions?|support|customer( success)?|field( service)?|marketing|network|hardware|mechanical|electrical|electronics|civil|chemical|industrial|manufacturing|process) engineer(s|ing)?',
  'business develop(er|ers|ment)',
  'developer (relations|advocates?|evangelists?)',
  'dev ?rel',
  'engenheir[oa]s? (civil|mec[aâ]nic[oa]|el[eé]tric[oa]|qu[ií]mic[oa]|ambiental|agr[oô]nom[oa]|de produ[cç][aã]o|de processos|de vendas|de suporte)',
  'ingenier[oa]s? (civil|mec[aá]nic[oa]|el[eé]ctric[oa]|qu[ií]mic[oa]|industrial|de ventas|de soporte)',
])

const LEAD_OR_NON_DEV = words([
  'managers?',
  'directors?',
  'head of',
  'vp',
  'vice president',
  'chief',
  'cto',
  'gerente',
  'diretor(a)?',
  'coordenador(a)?',
  'supervisor',
  'recruit(er|ers|ing)?',
  'talent',
  'writer',
  'instructor',
  'teacher',
  'tutor',
  'professor',
  'lecturer',
])

export const isDevRole = (title: string): boolean =>
  DEV_ROLE.test(title) &&
  !NON_DEV_COMPOUND.test(title) &&
  (IC_NOUN.test(title) || !LEAD_OR_NON_DEV.test(title))
