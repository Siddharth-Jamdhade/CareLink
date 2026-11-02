# CareLink cloud account and deployment

The intended flow is **phone → HTTPS cloud API → persistent patient records/documents**. An NFC band contains the patient's authenticated consultation URL; it does not contain the medical history or grant access. No USB connection or running personal computer is required after cloud deployment.

## First: create your account

For the existing `Siddharth-Jamdhade/CareLink` GitHub repository, connect that repository in Render and use the **root `render.yaml`**. It sets the Docker build context to `carelink-handoff`. The ZIP instructions below are an alternative for a new standalone repository; its blueprint paths are relative to the extracted ZIP root.

1. Open [Render signup](https://dashboard.render.com/register) and create/sign in to your own account. GitHub sign-in is convenient if you already have a GitHub account.
2. Create a **private** GitHub repository from `mobile-delivery/CareLink-cloud-source.zip`. Unzip first: `Dockerfile` and `render.yaml` must be at the repository root. Keep secrets, patient databases and uploads out of Git. The ZIP contains application source/configuration only.
3. In Render select **New → Blueprint**, connect that private repository, and review its `render.yaml` resources before creating them.

The supplied blueprint uses a Docker web service on the **Standard** plan, Singapore region, one instance and a **10 GB persistent disk**. This is paid infrastructure. Review Render's current [compute/storage pricing](https://render.com/pricing) before activating it. No cloud account, billing resource or public deployment has been created by this task.

Persistent disks require a paid service. The free service filesystem is not suitable for keeping this application's database/uploads. [Render disk documentation](https://render.com/docs/disks)

## Configuration

The blueprint attaches `/var/data` and stores:

| Data | Cloud path |
| --- | --- |
| Shared SQLite patient/account/record database | `/var/data/carelink.db` |
| Original patient document files | `/var/data/uploads` |

Both paths survive service restarts/deploys while the persistent disk is retained. One instance is intentional: this initial SQLite/disk configuration is not horizontally scalable and requires a brief interruption during disk-backed redeploys. Arrange independent backups and recovery testing; a persistent disk is not a complete backup strategy.

Set `GEMINI_API_KEY` as a secret in Render to enable the existing document extraction provider. Do not put it in the APK, GitHub files or chat. Without a working key/provider configuration, record extraction cannot finish. OCR models initialise/download on first use; validate build dependencies, memory, first-upload latency and provider availability on the deployed service.

`cloud_start.py` uses Render's supplied `RENDER_EXTERNAL_URL` as the HTTPS origin. For another Docker host set `CARELINK_PUBLIC_ORIGIN` explicitly. It pins same-origin CORS, Secure session cookies and `FRONTEND_URL`. Optional WhatsApp ingestion is off. The mounted storage is initialised before the API drops to an unprivileged user. Use the supplied start command rather than bypassing it.

The Docker build excludes existing patient data, `.env`, logs, demos, APKs and local dependencies. It serves the built React portal/mobile client and FastAPI on the same HTTPS origin. Docker was not built locally because the Linux Docker daemon was unavailable; inspect Render's first build log and complete a synthetic end-to-end upload before relying on it.

## First account and phone connection

Once Render reports a successful deployment:

1. Copy the actual HTTPS origin displayed on the service dashboard. No example URL in these files is a live CareLink server.
2. In the service's Shell, run `python manage_mobile.py your-clinician-login --role clinician`. Enter a strong password at the prompt. This creates the first staff account without requiring a patient assignment yet.
3. Open the service's `/dashboard` page, sign in and create a **synthetic** test patient. Creation assigns that patient to the clinician account.
4. Provision a patient login with `python manage_mobile.py your-patient-login --role patient --patient PATIENT_ID`. Use `--assign-only` to assign additional staff; `--revoke` removes staff access.
5. In the installed CareLink app enter the service's HTTPS **origin only**, then sign in. Test a new upload, source-document opening, history/summary and a restart to confirm persistence.

The existing APK already supports HTTPS cloud servers. The refreshed debug APK also fixes light text on the warm-white native setup screen. It keeps HTTPS required; there is no USB-only/HTTP bypass.

## NFC bands

1. Sign in as assigned staff and open the patient's **Records** screen or consultation page.
2. Choose **Prepare NFC band link**, then **Copy NFC link**.
3. Using an NFC-capable phone or nearby NFC writer, write that URL as an **NDEF URL record** onto a compatible writable NFC band. Merely having a band's hardware UID is insufficient; URL-capable NDEF storage and a compatible writer are required.
4. Tap the band with an NFC-capable phone. The standard HTTPS link opens the consultation page in the browser. Sign in with an authorised account to see the latest uploaded history and summary. Native automatic app opening is not configured for an unknown future domain; verified Android App Links can be added once the final domain is chosen.

The band does not need rewriting when documents change: the patient URL loads current cloud data. A changed hosting domain would require rewriting the URL. Scanning does not assign a patient to a stranger. Revoke staff assignments to remove access. Patient-visible summaries remain restricted to their own patient.

The existing cloud-to-ESP32 forwarding endpoint is disabled in cloud mode because a cloud host cannot reach the writer's private LAN IP. Use a writer beside the band. A browser/native NFC writing integration can be added after confirming your band and phone hardware; this deployment does not claim native phone NFC writing support.

## Existing data and readiness

Existing local records were not uploaded. To move them, arrange a controlled, encrypted backup of the database and matching uploads, then restore both onto the persistent disk with correct ownership and preserved patient IDs. Do not copy a live SQLite file while writes are in flight; use SQLite's backup facility or stop writes. Verify counts, source access and assignments before cutover. Keep the original until the migration is validated.

Use synthetic records until the existing clinical, security, translation and operating procedures are approved. Existing development-tool advisories remain documented in `MOBILE_README.md`. This task does not establish healthcare compliance, production clinical approval or a cloud account's contractual suitability for real patient information.

Verification for these changes: production web build and 25 frontend tests pass; 20 backend tests pass, including cloud HTTPS configuration, staff-only NFC URL generation and denial of unauthorised history access. The cloud Docker image, remote persistence and physical NFC band have not yet been verified on hosted infrastructure/hardware.
