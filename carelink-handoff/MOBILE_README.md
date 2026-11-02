# CareLink Mobile

The new `/mobile` experience extends the existing React portal with Capacitor and the same FastAPI backend. Patient information is shared; the portal's capture, OCR/extraction, consultation, verification and conflict workflows are preserved behind authenticated access.

## Start locally

```powershell
cd frontend/carelink-app
npm ci
npm run build
cd ../../backend
# Use the existing venv; configure .env from .env.example.
$env:CARELINK_COOKIE_SECURE='0' # Localhost HTTP only. Production defaults to Secure cookies.
./venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Provision accounts locally in a separate terminal. Passwords are prompted securely; there is no public registration.

```powershell
cd backend
./venv/Scripts/python.exe manage_mobile.py patient-login --role patient --patient EXISTING_PATIENT_ID
./venv/Scripts/python.exe manage_mobile.py worker-login --role staff --patient EXISTING_PATIENT_ID
./venv/Scripts/python.exe manage_mobile.py clinician-login --role clinician --patient EXISTING_PATIENT_ID
```

Open `/mobile`, or `/dashboard` for the staff portal. Patients see their own record; staff see assigned patients. Staff creation in the portal automatically assigns the new patient to its creator. `--assign-only` and `--revoke` manage existing staff assignments. Existing anonymous access to patient APIs, uploads and QR journeys is now blocked.

For a separate **synthetic-only** demo, run `backend/demo_mobile.py` with `CARELINK_DEMO_PASSWORD` set to a development-only password of at least 12 characters. Open `http://127.0.0.1:8011/mobile`; usernames are `demo-patient`, `demo-staff`, `demo-clinician`. This entry point uses its own ignored `.mobile-demo` database and uploads, never `carelink.db`.

## Android APK

Install [CareLink-debug.apk](mobile-delivery/CareLink-debug.apk). On first launch, enter your care team's deployed **HTTPS server origin**. The app loads the shared mobile frontend and signs in using HttpOnly cookies. No production server was deployed or invented. To change servers, sign out and clear Android app storage.

To rebuild, use JDK 21, Android SDK 36 and the generated Gradle wrapper:

```powershell
cd frontend/carelink-app
npm run build
npx cap sync android
cd android
./gradlew.bat assembleDebug
```

The APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`. For iOS, add `@capacitor/ios` and the platform on a Mac, then configure Xcode signing and camera usage text. iOS was not built here.

## Included

- Home, Records, My Baby, Appointments and Profile; assigned-staff search and verification tasks.
- Shared identity/contact details, emergency contact, LMP, EDD, gestational age/trimester, original portal pregnancy week and source-linked documents/visits/follow-up items. Missing values remain **Not recorded**.
- Calendar EDD: add nine months, clamp to the destination month's last valid day, then add seven days. Tests cover leap years, month ends and year changes. Clinician revisions require source/reason and survive LMP edits; earlier calculations remain in dating history.
- Lazy interactive Three.js fetal illustration with rotation, pinch zoom, pause/reset, week previews, reduced-motion and WebGL/performance fallback. It is explicitly labelled as educational, not a scan or live view.
- Session authentication, server-side patient assignments, protected source documents/QR access, profile version conflict checks, device consent and local-cache removal. No patient data or mutation queue is stored offline.

## Verification and limits

Production web build, **18 backend tests** and **25 frontend tests** pass. Browser checks pass at **320×740, 360×800 and 412×915**, covering navigation, 3D controls, persistence, stale-write conflicts, access denial, language navigation and offline/retry. Android debug compilation and APK signature verification succeeded. [Screenshots and browser results](mobile-delivery/browser-verification.txt) use synthetic patients.

No Android device or AVD was available for installation/native permission testing; budget-phone GPU performance and iOS remain unverified. The fetal model is original, stylised geometry rather than a validated anatomical model. Hindi/Marathi navigation is available, but forms and clinical text are not fully translated. Source uploads retain the existing JPEG/PNG limitation; appointments display source-document information rather than booking visits.

Clinical review is still required for educational content, anatomy, EDD workflow, local ANC guidance and translations. Deploy behind HTTPS with explicit trusted origins, durable rate limiting and protected server storage/backups. Compatible dependency fixes were applied; **72 inherited toolchain audit findings (10 high)** remain and need a deliberate toolchain upgrade. This is a working implementation for development/review, not a claim of production clinical approval.

See [implementation, API, migration and test details](MOBILE_IMPLEMENTATION.md) and [asset licences and clinical sources](MOBILE_ASSETS_AND_CLINICAL_SOURCES.md).

## Cloud hosting and NFC

See [cloud account/deployment steps](CLOUD_SETUP.md) for persistent cloud storage and authenticated NFC band links. The source bundle is in `mobile-delivery/CareLink-cloud-source.zip`. No cloud deployment exists yet. The latest changes pass 20 backend and 25 frontend tests; the updated APK fixes setup-screen contrast.
