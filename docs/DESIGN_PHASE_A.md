# Phase A visual review

Implemented in the existing Next.js application; FastAPI authorization, PostgreSQL
models, finance workflows and the same-origin API proxy remain in use.

## Review scope

- Photo-led midnight-navy homepage with electric-blue calls to action, five distinct
  room photos, API prices, live availability and existing booking/detail controls.
- Inter variable font served locally (SIL Open Font License).
- Owner dashboard: five linked metrics; interactive 3/6-month revenue chart;
  occupancy chart; floor overview; transactions; audit activity; payment review
  queue; complaints; working quick actions and the existing navigation/search.
- Owner → Public website supports a homepage HTTPS photo URL and five room photo
  URLs. The same published settings feed the public website. Backend validates
  HTTPS URLs and owner authorization; no server-side photo fetching is introduced.
- Recorded development services fully stop before restarting so a Codespaces
  restart cannot retain the previous allowed-origin configuration.

All numeric dashboard values come from authenticated APIs. Revenue metrics state
whether they cover all verified payments or the selected invoicing period. The
occupancy denominator is usable beds; unavailable beds are shown separately.
Photos are explicitly illustrative placeholders, not actual property photographs.
See `frontend/public/photos/README.md` for asset provenance.

## Rendered verification

Actual Playwright captures were inspected at a 1440 × 900 desktop viewport and
390 × 844 mobile viewport. Final screenshots were generated against a newly
migrated, seeded disposable PostgreSQL database. The existing development database
was restored afterwards, without clearing its records. Student and floor-map
routes were also opened and inspected as existing baseline screens.

Review corrected invisible blue-on-blue room booking text and a clipped revenue
chart. Against the reference: navy/blue palette, photo hero, compact room inventory,
white dashboard panels, sidebar and chart/table hierarchy are implemented. Imagery
and live demonstration metrics intentionally differ from the reference. Student,
payment and floor-map redesigns are Phase B, pending the user's Phase A design
approval; remaining module redesigns are Phase C.

## Validation

- Production frontend build, TypeScript, ESLint, formatting: passed.
- Backend suite: 54 passed; photo-settings regression after URL-validation
  hardening: 2 passed. Ruff and the CI-configured mypy command passed.
- Browser suite: 18 journeys passed initially; an owner journey encountered an
  artifact-file collision with an overlapping disposable-hosted validation. The
  isolated rerun passed the owner journey plus two new design checks, for 21
  distinct passing browser journeys. The disposable hosted container/database
  were cleaned up.
- Codespaces lifecycle integration: forwarded-origin login, rejected wrong origin,
  secure cookies, authenticated identity, CSRF logout and JavaScript assets passed.
- Desktop/mobile screenshot checks: no horizontal page overflow or browser
  exceptions; photo assets loaded; chart period controls worked.
