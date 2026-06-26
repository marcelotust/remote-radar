# Scraper source triage (#26)

Triage of the aggregator / marketplace / portal sources that fail to scrape
(`waitForSelector` timeout) on production runs. Each source is classified as one
of:

- **disabled** — unviable (login required, no public job board, freelance-only,
  or heavy anti-bot + ToS restrictions). Set to `is_active = false` so it stops
  consuming run time. Flipped by `supabase/migrations/0003_disable_unviable_sources.sql`.
- **adapter planned** — a scrapeable public board with no dedicated adapter yet.
  Left `is_active = true`; build an adapter, then it resolves instead of timing out.

Out of scope here: Lever/Greenhouse ATS roots (tracked in #25) and the remote
boards still on the generic adapter (Jobspresso, JustRemote, JS Remotely,
AI Jobs, Remote Woman, Remote Circle — tracked under #23).

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
