# CareLink Handoff

## Mobile consent update

### Readable extracted information

Single-image results, each successful paper in a batch, and saved patient journeys now show doctor/provider, visit date, clinic, document type, pregnancy week, next appointment, follow-ups and extraction notes. New extractions also transcribe diagnosis/suspected condition, symptoms and medicines explicitly written in the source. These are source transcriptions, not disease predictions or treatment advice. Preserve qualifiers and negations and verify against the source.

The startup migration adds three nullable columns without replacing existing data. Older records show “Not recorded or unreadable” for fields not extracted previously; they are not automatically sent back to Gemini. Automated persistence and rendering tests use synthetic data; live extraction still depends on Gemini availability.

### Multiple-paper extraction

Open a patient journey, choose Scan a record, confirm record-processing permission, then use Select papers. Choose up to 10 JPEG/PNG images (10 MB each), and tap Extract selected papers. Each image is processed sequentially as its own record for that patient; this does not combine pages into one document and does not support PDFs.

The queue reports each paper's outcome. Retry failed papers skips already-saved papers. A connection interruption is marked as an unknown outcome: inspect the journey before selecting that paper again to avoid duplicate records. Keep the capture page open during processing.

Extraction errors now distinguish missing credentials, model access, quota, invalid AI output, and connectivity/provider failures. Failed OCR/AI attempts remove the newly uploaded file and save no facts. Automated tests mock AI responses; successful tests do not establish Gemini availability. A live synthetic check on October 20, 2026 returned provider `504 DEADLINE_EXCEEDED` for the configured model. No real patient data was used for diagnostics.

The Android/iPhone experience is an installable web app (PWA), not a native APK or App Store release. It has no subscription or payment flow. Hosting and Gemini usage may still cost the operator money.

- First launch explains server storage and Google Gemini processing before opening any patient routes. Both consent checkboxes start unchecked; declining keeps the workspace closed.
- Offline patient caching is optional. Disabling it or withdrawing consent clears saved patient lists and journeys from this browser, across configured servers.
- Privacy & settings lets users withdraw consent. This does not delete server records or undo previous AI processing.
- Capture requires a separate record-processing confirmation. Browser camera permission is requested only after tapping Start camera; gallery selection remains available.
- Consent is versioned and timestamped locally. It is a device preference, not an authenticated patient consent audit trail. The backend remains an unauthenticated prototype: use synthetic records only.

To try on a phone, build the frontend and run the server as described below. Open the computer's Wi-Fi IP on port 8000 from the same network. HTTPS hosting is needed for home-screen installation and live camera access on phones. Gallery upload works over local HTTP. No app-store account is needed for the PWA.

The application is in `frontend/carelink-app`. See `PHASE_1_TO_3_STATUS.md` for the guide audit and verification results.

## Run locally on this desktop

Open two PowerShell terminals.

Backend:

```powershell
cd "C:\Users\SIDDHARTH\OneDrive\Desktop\Health A thon\carelink-handoff\backend"
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd "C:\Users\SIDDHARTH\OneDrive\Desktop\Health A thon\carelink-handoff\frontend\carelink-app"
npm start
```

Open http://localhost:3000. API documentation is at http://localhost:8000/docs. Use synthetic records for the prototype walkthrough.

## Reinstall backend dependencies

From the backend folder:

```powershell
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

For a new installation, copy `.env.example` to `.env` and enter your Gemini API key. Keep an existing `.env` and its key. `GEMINI_MODEL` can override the default model. Run the backend from its own folder because database and upload paths are relative to that folder.

## Checks

Backend folder:

```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Frontend folder:

```powershell
npm test -- --watchAll=false --runInBand
npm run build
```

The automated API tests use a temporary database and simulated AI responses. Real OCR and Gemini were separately verified during the audit; the physical camera walkthrough remains a manual check.


## Completed mobile app and single-server demo

From `frontend/carelink-app`, run `npm run build`. The build also generates a versioned service worker that precaches the app shell. Then, from `backend`, run:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open `http://<PC-WIFI-IP>:8000` on a phone on the same Wi-Fi. FastAPI serves the built app, including direct links to `/dashboard`, `/settings`, and `/patient/<id>`. For development, `npm start` still connects port 3000 to port 8000. Settings accepts a backend IP or full HTTP(S) origin; blank restores automatic routing. QR links use the frontend origin passed by the app, or `FRONTEND_URL` / the request origin for direct API calls.

The dashboard supports search, refresh, pull-to-refresh, and confirmed permanent deletion. Deletion removes associated verifications, facts, records, and uploaded source files. Journey cards expose conflict resolution and show verified, pending, and conflicting counts. Capture supports JPEG/PNG gallery images up to 10 MB as well as the live camera.

PWA installation, service workers, and live camera require HTTPS or localhost. Plain HTTP on a Wi-Fi IP supports ordinary browsing and gallery upload, but cannot enable those secure-context features. After loading the production app over HTTPS, use the browser's Install / Add to Home Screen action. Offline launch requires one successful online load and service-worker installation. Previously visited patient lists and journeys are stored locally per backend origin and shown with an offline warning; source images and API writes are not cached or queued. Settings can clear saved patient data. Only use this unauthenticated demo with synthetic data; these changes do not add authentication or production access controls.

Verification:

```powershell
# frontend/carelink-app
npm test -- --watchAll=false --runInBand --cacheDirectory=./node_modules/.cache/jest-carelink
npm run build
# backend (build the frontend first for static-route assertions)
.\venv\Scripts\python.exe -m unittest discover -s tests
```
