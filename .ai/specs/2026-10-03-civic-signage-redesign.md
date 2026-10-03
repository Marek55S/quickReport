# Civic Signage Redesign

- Status: `In Progress`
- Type: `design`
- Branch: `None (user manages Git; work stays in the current working tree)`
- Created: `2026-10-03`
- Updated: `2026-10-03`
- Owner: `Marek55S`
- Authorization: `2026-10-03: user asked to redesign the UI so it stops looking like generic "AI slop" while staying clean and usable, chose the "Miejskie oznakowanie" direction, and declined a "W okolicy" list on the home screen.`

## Goal

Give QuickReport a recognizable civic identity inspired by municipal signage and road-works marking, for both the resident app and the official dashboard, without changing behavior.

## References and lessons

Screenshots captured 2026-10-03 with headless Chrome (Uizze MCP references were not available in this session):

- FixMyStreet (fixmystreet.com): one strong signal colour with black, large plain type, numbered steps, a prominent "Start a report with a photo" action.
- FixaMinGata (fixamingata.se): report list beside the map, explicit instruction bar, dense rows with thumbnails.
- FixMyStreet council view (Westminster): dense list with status/category/sort filters next to the map; no decorative tiles.
- Warszawa 19115 and NYC311: civic yellow, rectangular high-contrast actions.

Transferable lessons: colour is a signal, not decoration; dense, ruled lists over cards; strong typographic hierarchy; one unmistakable primary action. No branding, copy, or layout is copied.

## Design contract

- Purpose: both surfaces are operational. Resident: report in under a minute. Official: triage by priority.
- Colour roles (tokens in `src/app/globals.css`):
  - `paper` warm off-white background, `ink` near-black text and primary outlines, `ink-muted` secondary text, `rule` hairlines.
  - `signal` road-works yellow for the single primary action and the brand mark, always with ink text.
  - Severity: low = signal yellow, medium = orange, high = red (map markers and severity blocks only).
  - Status: open = ink outline, in progress = signal, resolved = green.
  - Categories are neutral (icon + label); category colour is removed so colour keeps meaning.
- Typography: Barlow Condensed (600/700, uppercase, tracked) for headings, labels, numerals, and buttons; Barlow for body; Geist Mono for ticket numbers and coordinates. Tabular numerals for counts.
- Material: small radii (2–6 px), 1 px rules and 2 px ink outlines instead of shadowed cards; no gradients, glass, or pill chips.
- Ticket number: `ZGŁ-` + first six characters of the ticket id, uppercase, shown to residents and officials.
- Resident screens: signage-style home (wordmark, large condensed headline, numbered steps, yellow photo action); review as ruled sections with a step indicator; receipt-style confirmation with the ticket number; "Moje zgłoszenia" as ruled rows with status tag and three-segment progress bar; mObywatel step stays a clearly labelled simulation in neutral ink.
- Dashboard: ink top bar with yellow mark; ticket list on the left (status tabs, summary, ranked rows with severity block), map on the right; on mobile the map stacks above the list.
- Responsive: test 390 × 844 and 1440 × 900; no horizontal overflow.
- States: loading, empty, error, disabled, not-detected, merged, notes feedback, login error.
- Motion: only state feedback (indeterminate progress during analysis), disabled under `prefers-reduced-motion`.
- Finish condition: all screens captured at both sizes after the change show the contract (no gradient, no shadowed card stacks, single yellow primary action per screen, readable contrast), `pnpm build` and `pnpm lint` pass, behavior unchanged.

## Out of scope

- "W okolicy" list (declined), new data or API changes, behavior changes.

## Execution result

- Status: implemented; Status field above left as `In Progress` until the user reviews it.
- Actual files: `src/app/globals.css` (tokens and component classes), `src/app/layout.tsx` (Barlow, Barlow Condensed, Geist Mono), `src/app/icon.svg`, `public/icon.svg`, `src/app/manifest.ts`, `src/components/ui.tsx` (wordmark, status tag, ticket number), `src/components/categories.ts` (icons only), `src/components/resident/ReportFlow.tsx`, `src/components/resident/MyReports.tsx`, `src/components/resident/PickerMap.tsx`, `src/components/admin/Dashboard.tsx`, `src/components/admin/TicketMap.tsx`, `src/components/admin/severity.ts`, `src/components/admin/LoginForm.tsx`
- Validation: Production build (`next start`) captured with Playwright and system Chrome at 390 × 844 (home, analysing, review top/expanded categories/middle/bottom, map picker, mObywatel, confirmation, "Moje zgłoszenia" filled and empty, not-detected) and 1440 × 900 (login, dashboard, selected ticket, empty tab, dashboard on mobile). Second pass fixed: clipped "Zwiń", cramped mObywatel heading, wrapped action buttons in the narrow list, double focus ring on inputs, wrapped report count. Contrast of every token pair checked (ink/paper 15.8:1, muted/paper 6.1:1, ink/signal 11.8:1, white/red 5.6:1, ink/orange 6.5:1, white/green 5.4:1). `pnpm build` and `pnpm lint` passed. Test ticket removed.
- Not verified: physical phone, Safari (field-sizing fallback), keyboard-only walkthrough.
