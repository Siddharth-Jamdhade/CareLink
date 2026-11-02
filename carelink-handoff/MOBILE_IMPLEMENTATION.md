# CareLink Mobile

CareLink now includes a maternal-care interface at `/mobile`, sharing the portal's React application, FastAPI API, patient tables, source documents and verification workflows. Existing portal routes remain available behind the same sign-in boundary.

## Repository assessment and approach

The starting project already had a React PWA, JPEG/PNG capture, streamed OCR/extraction, source-linked consultation journeys, verification, conflict review, QR/NFC links and optional WhatsApp ingestion. Patient fields were name, age, phone and a stored gestational week. There was no session authentication or patient assignment boundary, and uploads were publicly served.

Capacitor was selected over an Expo rewrite because it retains the existing capture, source-document, consultation and verification implementation and uses one frontend with the portal. The Android container loads the same HTTPS CareLink deployment. No second patient database or mock API was introduced. No applicable repository `AGENTS.md` was found. Pre-existing uncommitted work was retained.

Implementation sequence: establish session/assignment controls; add an additive pregnancy migration and date arithmetic; build the five mobile screens and staff selector; add lazy 3D illustration; verify persisted workflows and small screens; generate Android project and debug APK.

## What is implemented

- Home, Records, My Baby, Appointments and Profile navigation; staff search/selection is limited to assigned patients.
- Warm-white/teal/peach interface, labelled controls, touch-sized actions, date inputs, loading/empty/error/retry states and screen-reader labels.
- Shared patient identity, age, phone, emergency contact, LMP, calculated/revised EDD, gestational age and trimester. Unknown values are shown as **Not recorded**. The old undated portal pregnancy-week entry is displayed separately and never silently treated as current dating.
- Existing ANC cards, prescriptions, lab/ultrasound reports and other records remain in the shared journey. Document capture/gallery upload accepts the existing JPEG/PNG formats. Extracted administrative fields and transcribed clinical text retain their source record and pending/verified/conflict status.
- Existing upload, OCR/extraction, verification, conflict resolution, consultation, QR and assigned-staff NFC workflows. OCR models now initialise on first extraction rather than blocking sign-in.
- Appointments, facilities, providers, visit history and follow-up items are displayed from source documents, with review status. This does not book appointments or invent missing dates.
- Patients can read/upload their own records and update contact/LMP details. Assigned staff can manage records and verification. Only assigned clinicians can revise EDD. Patient deletion and NFC writing require assigned staff. No public registration is exposed.
- QR links require an already authorised signed-in recipient; they grant no access. Revoking a staff assignment also removes access through existing QR/NFC links.

## Setup

Commands below are relative to `carelink-handoff`. Python 3.12 and Node 22+ are suitable for the supplied environment.

```powershell
cd frontend/carelink-app
npm ci
npm run build
cd ../../backend
# Use the existing venv, or create one and install requirements.txt.
# Configure backend/.env from .env.example; never include it in the app bundle.
./venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Deploy FastAPI and the built frontend under one HTTPS origin. TLS terminates at your reverse proxy. `CARELINK_COOKIE_SECURE=1` is the default; set it to `0` only for localhost HTTP development. Restrict `CARELINK_ALLOWED_ORIGINS` to actual frontend origins; same-origin hosting is preferred. Use deployment-level rate limiting as well as the supplied per-process login limiter. Protect database/uploads/backups with server storage encryption, filesystem permissions and an operational retention policy.

Database and upload roots can be configured with `CARELINK_DATABASE_URL` and `CARELINK_UPLOAD_DIR`. SQLite is the supplied deployment; alternative databases were not validated.

Provision accounts locally; the password is entered without echoing or embedding it in shell arguments:

```powershell
./venv/Scripts/python.exe manage_mobile.py patient-login --role patient --patient EXISTING_PATIENT_ID
./venv/Scripts/python.exe manage_mobile.py worker-login --role staff --patient EXISTING_PATIENT_ID
./venv/Scripts/python.exe manage_mobile.py clinician-login --role clinician --patient EXISTING_PATIENT_ID
# Add/revoke staff assignments; repeat --patient for multiple existing patients:
./venv/Scripts/python.exe manage_mobile.py worker-login --role staff --patient EXISTING_PATIENT_ID --assign-only
./venv/Scripts/python.exe manage_mobile.py worker-login --role staff --patient EXISTING_PATIENT_ID --assign-only --revoke
# Separate synthetic account creation is also supported:
./venv/Scripts/python.exe manage_mobile.py synthetic-login --role patient --synthetic
```

Then open `/mobile` for mobile or `/dashboard` for the staff portal. Patient accounts opening the portal's landing/dashboard route are directed to their mobile experience. Staff-created patients are automatically assigned to the creating account; other staff require an explicit assignment.

## Synthetic demonstration

The demo entry point forcibly uses `backend/.mobile-demo/demo.db`, its own uploads and localhost port **8011**. It never uses `carelink.db`. All seeded records are labelled synthetic.

```powershell
cd backend
$env:CARELINK_DEMO_PASSWORD='choose-a-development-only-password'
./venv/Scripts/python.exe demo_mobile.py
```

Open `http://127.0.0.1:8011/mobile`. Usernames: `demo-patient`, `demo-staff`, `demo-clinician`. Each uses the development-only password supplied above. Restarting this demo resets their passwords to the current environment value. Do not expose this server publicly. Camera/OCR provider processing is not mocked by this entry point; use only synthetic documents and obtain per-upload permission.

## Database migration and API changes

Back up an existing database before deploying. Startup runs `Base.metadata.create_all` for the new tables and the idempotent `upgrade_mobile_profile` migration. The migration only adds nullable pregnancy/contact columns and `profile_version INTEGER NOT NULL DEFAULT 0` to existing patients. It does not infer, overwrite or seed existing patient data. Old-schema row preservation is tested.

New tables: `mobile_accounts`, `mobile_assignments`, `mobile_sessions`, `pregnancy_dating_audit`. Passwords use salted scrypt. Only hashes of random session tokens are stored server-side. Session cookies are HttpOnly, SameSite Strict, Secure by default and expire after eight hours. There are no frontend API secrets or localStorage session tokens.

| Endpoint | Behaviour |
| --- | --- |
| `POST /api/auth/login` | Username/password; sets session cookie; login rate limit |
| `GET /api/auth/me` | Current role and linked patient ID |
| `POST /api/auth/logout` | Revokes current server session and expires cookie |
| `GET /api/auth/document/{record_id}` | Assigned/own source document; `no-store` |
| `GET /api/mobile/{patient_id}/profile` | Shared identity/contact/date profile and version |
| `PATCH /api/mobile/{patient_id}/profile` | Partial update with required `profile_version`; stale writes return `409` |
| `GET /api/mobile/{patient_id}/dating-history` | Authorised history of original calculations and later revisions |

All existing patient, record and verification API routes now require a session. Lists are filtered by assignment. Upload paths are protected by the owning record, rather than a public static-file mount. Writes require `X-CareLink-Client: 1`; the React API and streaming upload client send it automatically. CORS uses explicit trusted origins. API/document responses are `Cache-Control: no-store`.

`PATCH` supports `phone_number`, `emergency_contact`, `lmp`, `confirm_old_lmp`, and clinician-only `revised_edd`, `edd_source`, `edd_reason`. Dates use `YYYY-MM-DD`. Unknown LMP is `null`. Future LMP is rejected; an LMP older than 45 weeks requires explicit confirmation. Revised EDD requires a source and reason. A compare-and-swap database update prevents silent overwrites. Dating edits retain before/after values in the audit table.

WhatsApp remains available as an opt-in integration with `CARELINK_ENABLE_WHATSAPP=1`, the existing Twilio signature validation, sender phone binding and replay protection. A patient ID alone cannot select another sender's patient. Notification replies omit patient names, identifiers and clinical details. Review sender consent and provider processing before enabling it.

## Dating rules

`backend/app/dating.py` and `src/mobile/dates.js` implement **nine calendar months, clamped to the destination month's last valid day, then seven days**. They do not substitute 280 days. For example, 31 May 2023 → 29 February 2024 → 7 March 2024.

The requested Naegele helper line appears directly under the displayed due date in Home and Profile. Date-only arithmetic avoids timezone shifts. Without LMP, the calculated date remains unavailable. Clinician-revised EDD is retained when LMP changes, while recalculated LMP dating and earlier audit entries remain available. For a revised EDD, gestational age uses its conventional 40-week reference; otherwise it uses elapsed days from LMP. Age outside 0–45 weeks is left unavailable for correction. Trimester boundaries are 14 and 28 weeks.

EDD is explicitly presented as an estimate. The requested calendar formula and dating workflow require local clinical sign-off, particularly for irregular cycles and ultrasound-based dating.

## 3D assets, content and fallback

See [MOBILE_ASSETS_AND_CLINICAL_SOURCES.md](MOBILE_ASSETS_AND_CLINICAL_SOURCES.md). The fetal mesh is original procedural geometry, not a downloaded model or a copy of the reference screenshots. Proportions vary over illustrative stages 12–40 weeks. It is deliberately stylised; it is not a medically validated anatomical model.

Three.js is loaded in a separate lazy chunk. The view supports drag rotation, pinch zoom, reset, pause/play, stage preview and return to current week. Device pixel ratio is capped at 1.5; animation at 25 fps. Reduced-motion defaults to paused, paused static views render only when needed, background tabs stop rendering, and sustained slow rendering or unavailable/lost WebGL displays a lightweight labelled fallback. No model measurement, heartbeat, movement count, health status or AI diagnosis is generated.

## Android and iOS

The generated Android project is in `frontend/carelink-app/android`. Requires **JDK 21**, Android SDK Platform 36/build tools, and the pinned Gradle wrapper. Minimum Android API is 24; the WebView must also support current Capacitor. The supplied debug APK is `mobile-delivery/CareLink-debug.apk`.

```powershell
cd frontend/carelink-app
npm ci
npm run build
npx cap sync android
$env:JAVA_HOME='path-to-jdk-21'
$env:ANDROID_HOME='path-to-android-sdk'
cd android
./gradlew.bat assembleDebug
# Optional, with an attached test device:
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

On first launch, enter the **HTTPS origin** of your deployed CareLink server, supplied by your care team. No deployed server address was invented or published in this task. This origin is the only setup preference stored natively. Credentials stay in the WebView's HttpOnly cookie. To change the server, sign out and clear app storage in Android Settings. Android backups and cleartext traffic are disabled. Camera/gallery access is requested in the capture flow, not at startup; no notifications are requested.

An administrator can alternatively preconfigure an HTTPS origin before building:

```powershell
$env:CARELINK_APP_URL='https://your-care-server.example'
node scripts/configure-native.js
npx cap sync android
```

The app loads the hosted shared frontend so that portal and mobile stay on the same version and cookie origin. Server availability is required; this is not a fully offline native client. For iOS, on a Mac install `@capacitor/ios`, run `npx cap add ios` and `npx cap sync ios`, then configure signing, the same HTTPS origin and on-demand camera usage text in Xcode. iOS was not built here.

## Verification and remaining limits

- Production web build passes with CI warnings treated as errors.
- **18 backend tests pass**: existing extraction/migration/journey/upload/verification/NFC/WhatsApp regressions plus authentication, ownership/assignment, protected documents, CSRF header, logout, persistence, stale-profile conflicts, dating revisions/history, old-schema preservation and calendar edge cases. Extraction provider calls and hardware are mocked in tests.
- **25 frontend tests pass**, including date edge cases, consent/storage policy and existing capture/stream/verification regressions.
- Chrome mobile emulation at **320×740, 360×800 and 412×915** passes navigation, WebGL/stage/motion controls, save persistence, `409` handling, cross-patient denial, language navigation and offline/retry checks. See `mobile-delivery/browser-verification.txt` and screenshots. These are browser emulation results, not real-device performance measurements.
- Android debug build succeeds. No attached Android device or configured AVD was found; APK installation, native server-setup interaction, WebView camera permission handling and budget-phone GPU performance remain unverified. No iOS build or store signing/release was performed.
- Offline patient storage and mutation queues are intentionally disabled. Only non-sensitive shell assets/preferences are cached. The UI shows connection failures, last successful sync and retry; no edits are silently queued. This avoids claiming encrypted offline storage that is not implemented.
- English, Hindi and Marathi navigation/welcome strings are present. Forms, clinical education and source records are **not fully translated**; professional Hindi/Marathi clinical translation and TalkBack/font-scaling testing remain necessary.
- Model anatomy, stage illustrations, movement guidance, EDD workflow and the inherited ANC documentation-gap checklist require clinical review for Indian maternal-care use. No real-patient production approval is claimed.
- Compatible dependency security updates were applied. The inherited `react-scripts` toolchain still has **72 audit findings, including 10 high**, recorded in `mobile-delivery/npm-audit.json`; the remaining remediation needs a deliberate toolchain upgrade. Do not expose the development server or build tools to untrusted input. A full production security review, durable abuse controls, account recovery, account lifecycle administration and server storage/backup review remain deployment work.
- Source upload formats remain JPEG/PNG, 10 MB each. PDFs require image export. Appointments are source-derived, not a scheduling service. QR sharing intentionally cannot grant temporary anonymous access.

Run tests with isolated storage:

```powershell
# backend
$env:CARELINK_DATABASE_URL='sqlite://'
./venv/Scripts/python.exe -m unittest discover -s tests -v
# frontend/carelink-app
$env:CI='true'
npm test -- --watchAll=false --runInBand --cacheDirectory=.test-cache
# With demo_mobile.py running and matching CARELINK_DEMO_PASSWORD:
node scripts/mobile-smoke.js
```

The old regression fixtures now provision assigned synthetic staff sessions; security is not disabled in application code to make them pass. Existing user data was not used for screenshots or tests.
