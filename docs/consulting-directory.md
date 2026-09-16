# Consulting & agencies directory — Adobe AEM (#95)

Separate category for large consultancies, digital agencies, and Global
System Integrators (GSIs) with a dedicated Adobe Experience Manager (AEM)
practice, from issue #95.

## Why this list mostly isn't wired into the scraper

Checked the same way as #93/#94 (follow each careers URL, look for an
embedded Ashby/Greenhouse/Lever reference, verify the resolved slug against
the ATS's real public API before trusting it). Result: **only 1 of 100**
resolved — **Huge** (Greenhouse, `hugeinc`, inserted via
`supabase/migrations/0015_seed_aem_consulting_companies.sql`).

This isn't a detection gap — it's the expected outcome for this segment.
Accenture, Deloitte, Capgemini, TCS, IBM, Wipro, and the rest of the GSI-scale
firms on this list run their own enterprise ATS (typically Workday,
SuccessFactors, or a custom portal), not the lightweight startup-style
boards (Lever/Greenhouse/Ashby) this scraper's adapters cover. Building
adapters for those enterprise systems is a much bigger effort for a much
lower job-relevance payoff (huge, generic corporate req boards, not the kind
of remote/PJ-friendly roles this app targets) — not attempted here.

## Ownership note

The issue notes this list is meant to be inserted by **fabiotust@gmail.com**.
Since #71/#73 give scraping-source authorship to whoever adds a source
(`created_by`, editable only by its creator), the one row this PR does wire
in (Huge) was inserted the same way the #93/#94 seed migrations were —
attributed to no one (`created_by = null`, the "legacy" convention, editable
by anyone). If fabiotust would rather these show up under their own account,
the natural path is adding them through the app's own "Adicionar fonte" form
instead — that's what stamps real authorship on a source.

## AEM-specific search terms

For manually searching the 99 companies not wired in, these terms narrow
results meaningfully better than a generic "AEM developer" search on a
GSI-scale careers portal:

- `AEM Developer`, `AEM Sites`, `AEM Assets`, `AEM Forms`
- `HTL` (HTML Template Language, AEM's templating layer) or its older name `Sightly`
- `OSGi` (the module framework AEM backends run on)
- `AEM as a Cloud Service` (current AEM offering; distinguishes from legacy on-prem AEM 6.x roles)
- `Adobe Experience Cloud` (broader — catches roles spanning AEM + Analytics/Target)

## Full list

| #   | Consultoria / Agência           | Especialidade Adobe                                   | Careers URL                                | ATS        | Status                                                                               |
| --- | ------------------------------- | ----------------------------------------------------- | ------------------------------------------ | ---------- | ------------------------------------------------------------------------------------ |
| 1   | Accenture Song                  | Global System Integrator (Adobe Premier Partner)      | https://www.accenture.com/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 2   | Deloitte Digital                | Transformação digital empresarial e AEM Cloud         | https://www.deloitte.com/careers           | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 3   | Publicis Sapient                | Engenharia digital e plataformas AEM em escala        | https://www.publicissapient.com/careers    | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 4   | EPAM Systems                    | Arquitetura técnica e engenharia AEM Sites/Assets     | https://www.epam.com/careers               | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 5   | Capgemini                       | Transformação corporativa e Adobe Experience Cloud    | https://www.capgemini.com/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 6   | Cognizant                       | Modernização de legados e migração AEM as a Cloud     | https://www.cognizant.com/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 7   | Wipro                           | Integração global de martech e AEM enterprise         | https://www.wipro.com/careers              | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 8   | Infosys                         | Serviços gerenciados e desenvolvimento AEM            | https://www.infosys.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 9   | Tata Consultancy Services (TCS) | Implementações globais de Adobe Experience Cloud      | https://www.tcs.com/careers                | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 10  | IBM iX                          | Experiência digital, design de CMS e AEM Cloud        | https://www.ibm.com/careers                | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 11  | Globant                         | Engenharia de software e Adobe Studio dedicado        | https://www.globant.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 12  | Bounteous x Accolite            | Especializada em AEM Sites, Assets e Commerce         | https://www.bounteous.com/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 13  | CI&T                            | Desenvolvimento ágil e modernização de AEM            | https://ciandt.com/careers                 | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 14  | Perficient                      | Implementações complexas de AEM e Adobe Target        | https://www.perficient.com/careers         | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 15  | Valtech                         | Commerce unificado e experiência composable com AEM   | https://www.valtech.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 16  | Rightpoint (Genpact)            | Experiência de conteúdo e AEM Sites                   | https://www.rightpoint.com/careers         | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 17  | Merkle (Dentsu)                 | AEM orientado a dados e personalização                | https://www.merkle.com/careers             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 18  | VML (WPP)                       | Criação, conteúdo e AEM em escala global              | https://www.vml.com/careers                | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 19  | HCLTech                         | Soluções técnicas para infraestrutura e AEM           | https://www.hcltech.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 20  | Tech Mahindra                   | Engenharia digital e ecossistema Adobe                | https://www.techmahindra.com/careers       | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 21  | LTIMindtree                     | Migração de CMS corporativo e AEM                     | https://www.ltimindtree.com/careers        | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 22  | Slalom                          | Estratégia de implementação de AEM e martech          | https://www.slalom.com/careers             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 23  | Brillio                         | Engenharia de produto e AEM digital platforms         | https://www.brillio.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 24  | SoftServe                       | Arquitetura técnica e integrações AEM Cloud           | https://www.softserveinc.com/careers       | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 25  | Endava                          | Desenvolvimento de software e AEM enterprise          | https://www.endava.com/careers             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 26  | Netcentric (Cognizant)          | Boutique especializada de elite em AEM                | https://www.netcentric.biz/careers.html    | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 27  | TA Digital (Omnicom)            | Prática avançada de AEM Forms, Sites e Assets         | https://www.tadigital.com/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 28  | Horizontal Digital              | Consultoria especializada em Adobe e Salesforce       | https://www.horizontaldigital.com/careers  | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 29  | Blue Acorn iCi (Infosys)        | Implementações de AEM e Analytics                     | https://blueacornici.com/careers           | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 30  | Oshyn                           | Especialista em AEM, manutenções e modernização       | https://www.oshyn.com/careers              | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 31  | Arbory Digital                  | Consultoria nichada em AEM Cloud & DevOps             | https://www.arborydigital.com/careers      | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 32  | Initialyze                      | Boutique focada em AEM e Adobe Experience Cloud       | https://initialyze.com/careers             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 33  | NextRow Digital                 | Serviços especializados em AEM e martech              | https://www.nextrow.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 34  | Dept Agency                     | Agência de tecnologia e marketing com prática AEM     | https://www.deptagency.com/careers         | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 35  | Media.Monks                     | Produção criativa e técnica integrada com AEM         | https://media.monks.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 36  | Razorfish                       | Experiência de marca e portais corporativos em AEM    | https://www.razorfish.com/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 37  | Digitas                         | Marketing digital e plataformas AEM                   | https://www.digitas.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 38  | Ogilvy                          | Conteúdo corporativo, marketing e AEM Sites           | https://www.ogilvy.com/careers             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 39  | AKQA                            | Design de experiência e arquitetura de CMS AEM        | https://www.akqa.com/careers               | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 40  | Huge                            | Design de produto digital e frontends com AEM         | https://hugeinc.com/careers                | Greenhouse | Ativo em scraping_sources                                                            |
| 41  | Credera (Omnicom)               | Consultoria de tecnologia e estratégia Adobe          | https://www.credera.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 42  | Hero Digital                    | Consultoria de experiência digital e AEM              | https://herodigital.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 43  | Apply Digital                   | Desenvolvimento de produtos digitais e CMS AEM        | https://www.applydigital.com/careers       | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 44  | Appnovation                     | Engenharia digital e ecossistema Adobe Experience     | https://www.appnovation.com/careers        | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 45  | GSPANN Technologies             | Implementação e suporte operacional de AEM            | https://www.gspann.com/careers             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 46  | Altudo                          | Arquitetura de experiência e AEM personalization      | https://www.altudo.co/careers              | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 47  | Argil DX                        | Consultoria técnica com foco estrito em AEM           | https://argildx.com/careers                | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 48  | Axamit                          | Engenharia de software e desenvolvimento AEM          | https://axamit.com/careers                 | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 49  | Modus Create                    | Consultoria de produto digital e AEM                  | https://moduscreate.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 50  | Astound Commerce                | E-commerce integrado a AEM Assets e Sites             | https://astoundcommerce.com/careers        | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 51  | NTT DATA                        | Serviços de TI globais e integrações Adobe            | https://www.nttdata.com/global/en/careers  | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 52  | Avanade                         | Prática corporativa de experiência e AEM              | https://www.avanade.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 53  | Nagarro                         | Engenharia digital sob medida para AEM                | https://www.nagarro.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 54  | Virtusa                         | Modernização de plataformas corporativas AEM          | https://www.virtusa.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 55  | Hexaware                        | Automação e serviços gerenciados em AEM               | https://hexaware.com/careers               | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 56  | Zensar Technologies             | Soluções digitais empresariais com AEM                | https://www.zensar.com/careers             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 57  | Apexon                          | Engenharia de dados e portais digitais em AEM         | https://apexon.com/careers                 | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 58  | Reply (Open Reply / Portaltech) | Consultoria europeia especializada em Adobe           | https://www.reply.com/careers              | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 59  | SQLI Digital Experience         | Projetos de comércio e portais em AEM (Europa/Global) | https://www.sqli.com/en/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 60  | diva-e                          | Agência de experiência digital alemã e AEM Partner    | https://www.diva-e.com/en/careers/         | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 61  | Macaw                           | Soluções digitais empresariais e AEM Cloud            | https://www.macaw.net/careers/             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 62  | ACTUM Digital                   | Implementações técnicas de AEM na Europa              | https://www.actumdigital.com/careers       | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 63  | One Inside                      | Agência suíça focada em AEM e Adobe Cloud             | https://one-inside.com/careers/            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 64  | T-Systems MMS                   | Integração corporativa e arquitetura AEM segura       | https://www.t-systems-mms.com/careers      | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 65  | Verndale                        | Experiência de ponta a ponta e AEM Sites              | https://www.verndale.com/careers           | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 66  | CQL                             | Agência de comércio digital e AEM                     | https://www.cqlcorp.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 67  | Falcon-Software                 | Especialista em implantação de WCM e AEM              | https://www.falcon-software.com/careers    | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 68  | GALE Partners                   | Agência de consultoria de dados e AEM                 | https://galepartners.com/careers           | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 69  | Jellyfish                       | Parceria em marketing digital e AEM Assets            | https://www.jellyfish.com/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 70  | Dentsu Creative                 | Experiências digitais globais suportadas por AEM      | https://www.dentsucreative.com/careers     | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 71  | R/GA                            | Inovação e arquitetura digital com AEM                | https://rga.com/careers                    | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 72  | Mirum Agency                    | Conteúdo, estratégias de CMS e AEM                    | https://www.mirumagency.com/careers        | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 73  | Cigniti Technologies            | Testes especializados e implementação de AEM          | https://www.cigniti.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 74  | ITC Infotech                    | Serviços de engenharia de software e AEM              | https://www.itcinfotech.com/careers        | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 75  | Birlasoft                       | Transformação empresarial e Adobe Cloud               | https://www.birlasoft.com/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 76  | Yash Technologies               | Consultoria técnica de infraestrutura e AEM           | https://www.yash.com/careers               | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 77  | Kellton                         | Soluções digitais empresariais e CMS Adobe            | https://www.kellton.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 78  | Ranosys Technologies            | Desenvolvimento de AEM Sites e soluções martech       | https://www.ranosys.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 79  | TO THE NEW                      | Engenharia de produtos digitais e AEM Cloud           | https://www.tothenew.com/careers           | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 80  | Hashout Technologies            | Serviços especializados de AEM e automação            | https://hashouttech.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 81  | KBST                            | Engenharia e consultoria especializada em AEM         | https://kbst.com/careers                   | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 82  | TechFabric                      | Desenvolvimento de software e integrações com AEM     | https://techfabric.com/careers             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 83  | Indium Software                 | Garantia de qualidade digital e portais AEM           | https://www.indiumsoftware.com/careers     | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 84  | Brainvire Infotech              | Soluções de TI e integração de AEM                    | https://www.brainvire.com/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 85  | Digital Polygon                 | Plataformas de experiência digital e CMS corporativo  | https://www.digitalpolygon.com/careers     | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 86  | Blended Digital                 | Consultoria de dados e Adobe Experience Cloud         | https://blendeddigital.com.au/careers      | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 87  | Westernacher Solutions          | Soluções corporativas e integração AEM                | https://westernacher-solutions.com/careers | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 88  | Emakina (EPAM)                  | User experience e engenharia de AEM                   | https://www.emakina.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 89  | Compass Digital                 | Plataformas digitais escaláveis com AEM               | https://compassdigital.io/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 90  | Shift7 Digital                  | Experiência B2B integrada com ecossistema Adobe       | https://shift7digital.com/careers          | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 91  | Diconium                        | Transformação digital com forte prática AEM           | https://diconium.com/careers               | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 92  | Adnovum                         | Engenharia de software segura e portais AEM           | https://www.adnovum.com/careers            | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 93  | Apex IT                         | Consultoria em CRM e portais de conteúdo AEM          | https://www.apexit.com/careers             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 94  | Zaelab                          | B2B Commerce integrado com AEM Sites e Assets         | https://www.zaelab.com/careers             | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 95  | OSF Digital                     | Comércio unificado e integração de CMS Adobe          | https://osf.digital/careers                | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 96  | Kinship                         | Produtos digitais e ecossistema de conteúdo AEM       | https://kinship.co/careers                 | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 97  | Spindrift (NextGen)             | Consultoria de comércio e AEM especializada           | https://www.spindriftgroup.com/careers     | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 98  | Moonwalk Agency                 | Implementação de portais e AEM Cloud                  | https://www.moonwalk.agency/careers        | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 99  | PwC (Experience Center)         | Estratégia de negócios e Adobe Platinum Partner       | https://www.pwc.com/careers                | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
| 100 | EY (Ernst & Young Digital)      | Transformação digital corporativa e Adobe Cloud       | https://www.ey.com/careers                 | —          | Não wired (sem ATS detectado — porte enterprise, ATS próprio/Workday/SuccessFactors) |
