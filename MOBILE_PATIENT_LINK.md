# CareLink linked patient application

Patient web app: https://carelink-hospital-portal-sj.jamdhadesiddharth69.chatgpt.site/mobile

Android 1.1 test APK: `output/CareLink-Patient-1.1.apk`, also published at `/downloads/CareLink-Patient-1.1.apk`.

Use the username and password already issued by the hospital portal. Each session is fixed to one patient; there is no patient directory in the mobile app. Hospital updates, including retained cloud history, appear after refresh. The hospital Start consultation form now includes care-plan, individual diet-plan and appointment details for the patient app. Missing data stays marked not recorded. The app does not invent personalised treatment or appointments. The 3D model is an educational stage illustration covering weeks 12–40, not a patient scan.

The existing Android binary pointed to `carelink-app.onrender.com`. Install the updated APK to switch it to the linked cloud patient app. Package name stays `in.carelink.mobile`; versionCode is 2 and versionName is 1.1. This is a debug-signed test build, not a store release. Signature and manifest were checked with Android SDK tools. The APK was built successfully; it has not been tested on a physical Android device.

The Sites patient application shares D1 patient accounts and R2 documents with the hospital, using separate patient-session cookies. No Render deployment is needed for this app. The original React/FastAPI staff application remains a separate legacy system; its login page source has a link to the new patient app but that legacy Render frontend has not been redeployed.

Hospital access now checks the server-configured staff/doctor email allowlists (`CARELINK_STAFF_EMAILS`, `CARELINK_DOCTOR_EMAILS`), rather than accepting any signed-in ChatGPT visitor. Existing approved doctor email remains authorised. To authorise additional hospital staff, add their verified platform sign-in email to CARELINK_STAFF_EMAILS. This does not grant doctor approval rights.

Build: run `npx cap copy android` in `carelink-handoff/frontend/carelink-app`, then `android/gradlew.bat assembleDebug`. Gradle wrapper is pinned to verified official Gradle 9.5.0 (Java 25 compatible; Android plugin 8.13 works). The desktop sandbox's long TEMP path caused Java selector errors; the successful build used JAVA_HOME pointing to Android Studio's jbr and a shorter workspace TEMP/TMP path under output/jtmp. These were process-local overrides only.

Validation: Sites TypeScript check; 22 unit/regression tests; local HTTP integration with two fictional accounts covering registration credentials, record/file isolation, hospital/RAG denial, CSRF, retained cloud data, logout, password change; browser checks at desktop and 390px width covering login/reload, EDD/progress, 3D render, appointments, history, plans, profile and logout. Screenshot: output/CareLink-patient-mobile.jpg (fictional QA patient).
