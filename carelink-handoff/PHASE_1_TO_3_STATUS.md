# Phases 1–3 audit — 18 October 2026

Compared with `../CareLink_COMPLETE_Prototype_Guide.html`, steps 1–26.

## Result

All guide-listed folders and source files through Phase 3 are present. The software checks below pass after the repairs. A physical camera/browser walkthrough remains to confirm the complete Phase 3 demonstration.

| Phase | Result |
| --- | --- |
| 1: Setup | Python 3.12.10, Node 24.21.0, backend virtual environment, required packages, configured Gemini key, and guide folders are present. |
| 2: Backend | Startup, patient API, record persistence, journey, conflict detection, verification, source-image serving, and QR generation pass automated checks. Actual OCR and a separate live Gemini extraction pass on a generated synthetic image. |
| 3: Frontend | Dashboard, patient journey, camera page, router, Axios helper, and styles are present. Production build and two dashboard tests pass. Hardware camera interaction is not yet manually verified. |

## Repairs and additions

- Replaced failing PaddlePaddle 3.3.1 with 3.1.1 in the backend virtual environment. Real OCR previously failed with `OneDnnContext does not have the input Filter`; it now correctly reads the synthetic test image.
- Replaced the unavailable default Gemini model `gemini-2.5-flash` with `gemini-3.8-flash`, verified through this account's model list and a live extraction call. The API key was preserved.
- Saved uploaded image URLs with forward slashes and normalized older Windows-style paths in journey responses.
- Fixed the journey page's React Hook dependency warning.
- Stopped camera tracks when leaving the capture page and guarded captures before video is ready or when image encoding fails.
- Replaced the obsolete Create React App test with patient-loading/navigation and patient-creation tests.
- Added backend workflow tests, pinned Python requirements, an example environment file, and local run instructions.
- Added `synthetic_data/images/ocr_smoke.png`, containing only generated test text.

## Verification

- `npm run build`: passed, no ESLint warnings.
- `npm test -- --watchAll=false --runInBand`: 2 tests passed.
- `venv\Scripts\python.exe -m unittest discover -s tests -v`: passed. Uses an isolated in-memory database, temporary uploaded files, and mocked OCR/Gemini responses; checks patient creation/listing, missing-patient handling, documentation gaps, upload, source image retrieval, duplicate conflict, verification, QR PNG, and unsupported upload type.
- Real OCR: returned `SYNTHETIC TEST - CARELINK CLINIC 2026`.
- Separate live Gemini request: returned structured extraction with confidence 0.6, explaining that the synthetic header contains no patient or visit information.
- `venv\Scripts\python.exe -m pip check`: passed.
- Python compilation: passed.

## Remaining manual check

Start both services using the README, create a synthetic patient, open Add Record, allow camera access, capture a sample record, and inspect the resulting timeline and View Source image. This verifies the physical camera and browser permissions, which automated checks cannot establish.

Phases 4 and 5 were outside this audit. `frontend/carelink-ap` is a separate starter folder; use `frontend/carelink-app` for this project.
