# QuickReport Roadmap

Planned features after the HackYeah 2026 MVP ([specification](../.ai/specs/2026-10-03-one-snap-reporting-mvp.md)).
Items are proposals, not approved scope; turn an item into a specification before implementing it.

## Report input

Implemented on branch `feature/report-input-options` ([specification](../.ai/specs/2026-10-03-report-input-options.md)); kept here for context.

### Choosing the report location — implemented

- Current behavior: the location comes from the browser's geolocation when the user taps "Zgłoś problem", with a Kraków demo location as fallback.
- Keep the device location as the default.
- Let the user switch the source on the review screen to:
  - GPS coordinates from the photo's EXIF metadata, useful when the photo was taken earlier or elsewhere.
  - A manual pin on a map.
- Notes:
  - EXIF must be read from the original file before downscaling, because the canvas re-encode in `src/components/resident/media.ts` drops metadata.
  - Many phones and browsers strip GPS from photos taken through a web camera input; the option should appear only when coordinates are present.
  - The chosen source should be stored with the report so officials can judge its reliability.

### More report categories — implemented

- Extend the category list beyond `ROAD_DAMAGE`, `ACCESSIBILITY_BARRIER`, `INFRASTRUCTURE_FAILURE`, and `OTHER` (candidates: waste and littering, greenery, illegal parking, vandalism and graffiti, water and sewage, public transport stops).
- Add a dedicated default category for when the model detects no issue in the photo, separate from `OTHER` (a recognized issue that fits no category).
  Implemented as `NOT_DETECTED`; reports cannot be sent with it.
- Update the Gemini prompt, the response schema, UI labels and icons, and the dashboard colors together; clustering already groups by category.

### User notes for the report text — implemented

- Add an optional notes field where the user describes the problem in their own words.
- Gemini generates the title and formal report from the photo and the notes together.
- When the photo shows nothing relevant (the default "no issue detected" category), generate the report from the notes alone.
- Treat notes as untrusted input in the prompt and keep the structured output validation.

## Implemented on 2026-10-03

See [specification](../.ai/specs/2026-10-03-official-tools-and-i18n.md): AI danger level (second priority factor, filterable), approximate address, after-repair photo, dashboard filters/search/sort, statistics view, PL/EN/UK resident UI, real demo photos.

## Other ideas

- Firestore real-time listeners instead of polling on the dashboard.
- Service worker with offline report queueing.
- Real mObywatel / login.gov.pl authentication (the identity step is simulated; reports already link to a citizen id); per-user dashboard accounts with roles (a shared-password login is implemented).
- "Moje zgłoszenia" is implemented with an anonymous per-device id; tie it to the verified identity once mObywatel login is real.
- Letter delivery to real unit inboxes, the city's ticket system (Open311/API), or e-Doręczenia/ePUAP with an official proof of delivery (routing, PDF, SMTP e-mail, and a simulated receipt are implemented; unit addresses and ownership-based routing are not).
- Status notifications for residents who reported a problem.
