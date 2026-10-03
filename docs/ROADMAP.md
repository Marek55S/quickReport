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

## Other ideas

- Reverse geocoding of the address into the formal report (e.g. Nominatim).
- AI-assessed severity (danger level) combined with report count for priority.
- Firestore real-time listeners instead of polling on the dashboard.
- Service worker with offline report queueing.
- Real mObywatel / login.gov.pl authentication and admin login for the dashboard.
- Routing tickets to the responsible department or road manager, and integration with city reporting systems (e.g. 19115).
- Status notifications for residents who reported a problem.
