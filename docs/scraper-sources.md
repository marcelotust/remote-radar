# Scraper source triage (#26)

Triage of the aggregator / marketplace / portal sources that fail to scrape
(`waitForSelector` timeout) on production runs. Each source is classified as one
of:

- **disabled** — unviable (login required, no public job board, freelance-only,
  or heavy anti-bot + ToS restrictions). Set to `is_active = false` so it stops
  consuming run time. Flipped by `supabase/migrations/0003_disable_unviable_sources.sql`.
- **adapter planned** — a scrapeable public board with no dedicated adapter yet.
  Left `is_active = true`; build an adapter, then it resolves instead of timing out.

Out of scope here: the remote boards still on the generic adapter (Jobspresso,
JustRemote, JS Remotely, AI Jobs, Remote Woman, Remote Circle — tracked under #23).

## Disabled (unviable)

### Login / account required

| Source            | URL                           | Reason                                       |
| ----------------- | ----------------------------- | -------------------------------------------- |
| LinkedIn          | https://www.linkedin.com      | Login wall + ToS prohibits scraping          |
| Glassdoor         | https://www.glassdoor.com     | Login wall + anti-bot                        |
| Wellfound         | https://wellfound.com         | Login required to browse jobs                |
| Otta              | https://otta.com              | Account required (now Welcome to the Jungle) |
| Work at a Startup | https://www.workatstartup.com | YC portal — login required                   |
| VanHack           | https://vanhack.com           | Account/login required                       |
| Arc.dev           | https://arc.dev               | Login-gated talent matching                  |
| Turing            | https://www.turing.com        | Login-gated AI matching, no public board     |

### Talent network — no public job board (they match you; you don't browse)

| Source          | URL                           | Reason                                    |
| --------------- | ----------------------------- | ----------------------------------------- |
| Toptal          | https://www.toptal.com        | Vetted talent network, no public listings |
| Andela          | https://andela.com            | Talent network, no public listings        |
| Braintrust      | https://www.usebraintrust.com | Web3 talent network, no scrapeable board  |
| Gun.io          | https://gun.io                | Talent network, no public listings        |
| Lemon.io        | https://lemon.io              | Talent network, no public listings        |
| CloudDevs       | https://clouddevs.com         | Talent network, no public listings        |
| Hubstaff Talent | https://hubstafftalent.net    | Free directory, no structured job board   |
| Jobbers.io      | https://jobbers.io            | No scrapeable public board                |
| Revelo          | https://revelo.com.br         | LATAM talent network, no public board     |
| Tecla           | https://www.tecla.io          | LATAM talent network, no public board     |
| Strider         | https://onstrider.com         | LATAM talent network, no public board     |
| BairesDev       | https://www.bairesdev.com     | Staffing firm, no public job board        |

### Freelance gig marketplace — not employment listings

| Source  | URL                     | Reason                                |
| ------- | ----------------------- | ------------------------------------- |
| Upwork  | https://www.upwork.com  | Freelance gigs, login + ToS, not jobs |
| Fiverr  | https://www.fiverr.com  | Freelance gig marketplace, not jobs   |
| Workana | https://www.workana.com | LATAM freelance marketplace, not jobs |

### Heavy anti-bot (Cloudflare / captcha) + ToS-restricted

| Source       | URL                          | Reason                                       |
| ------------ | ---------------------------- | -------------------------------------------- |
| Indeed       | https://www.indeed.com       | Aggressive anti-bot + ToS prohibits scraping |
| ZipRecruiter | https://www.ziprecruiter.com | Anti-bot protection                          |
| Dice         | https://www.dice.com         | Anti-bot protection                          |
| Jobot        | https://www.jobot.com        | Recruiting agency, anti-bot                  |

## Adapter planned (kept active)

Scrapeable public boards with no dedicated adapter yet. Build an adapter, then
they resolve instead of timing out.

| Source          | URL                            | Note                                           |
| --------------- | ------------------------------ | ---------------------------------------------- |
| Built In        | https://builtin.com            | Public job board, scrapeable — adapter pending |
| JobNaGringa     | https://www.jobnagringa.com.br | BR remote board, scrapeable — adapter pending  |
| Remotar         | https://remotar.com.br         | BR remote board, scrapeable — adapter pending  |
| Work In Estonia | https://workinestonia.com/job  | Public job board, scrapeable — adapter pending |

## Adding an ATS company target

Lever and Greenhouse are per-company ATSes — each target company is one row in
`scraping_sources`. The adapter resolves by host, so no code change is needed.

1. Find the company's ATS slug from its public careers URL:
   - Lever: `https://jobs.lever.co/<slug>`
   - Greenhouse: `https://boards.greenhouse.io/<slug>`
2. (Optional) Confirm the API returns jobs:
   - Lever: `https://api.lever.co/v0/postings/<slug>?mode=json`
   - Greenhouse: `https://boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true`
3. Insert one row:

   ```sql
   insert into scraping_sources (url, label, is_active) values
     ('https://jobs.lever.co/<slug>', '<Company> (Lever)', true);
   ```

The adapter emits only remote roles (Lever `workplaceType = remote` or a
`/remote/i` location; Greenhouse a `/remote/i` `location.name`).

## Generic adapter remote filtering (#108)

The generic JSON-LD adapter (`scraper/adapters/generic.ts`, used for any
source without a dedicated ATS adapter) doesn't get a clean structured
"remote" field the way Lever/Greenhouse do, so it can't just check one
property. Since #108, it runs each posting through
`scraper/adapters/remoteFilter.ts` before inserting:

1. Schema.org's `jobLocationType: "TELECOMMUTE"` is trusted first, when the
   source sets it.
2. Otherwise, title + location text is checked against a small allow list
   (`remote`, `work from anywhere`, `remote-first`, `100% remote`) and deny
   list (`hybrid`, `on-site`/`onsite`, `in-office`) — deny always wins over
   allow, and a posting with neither cue is dropped by default rather than
   inserted (this app only wants remote roles, so under-including an
   unlabeled posting is the safer failure mode than polluting the feed with
   on-site noise).

Deliberately only title + location are scanned, not the full description —
a long description can mention "remote" or "hybrid" incidentally (e.g. "you
will support our remote teams") without describing the role itself.
