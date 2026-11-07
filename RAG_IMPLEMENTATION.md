# CareLink RAG implementation

The hospital portal now has **RAG-assisted data entry** and a **Doctor review** queue. Open a registered patient's hospital profile (`view=portal`) and choose **Prepare entry**. The read-only NFC/cloud view remains read-only and continues to include hidden historical records.

## What is implemented

1. The supplied knowledge base is ingested as 38 individual source documents, including ANC templates, symptom maps, reference sections, complications and warning signs. The metadata's claim of 15 templates is not used as the document count.
2. Actual Gemini embeddings are stored locally in ChromaDB's `carelink_pregnancy_kb` collection. The hosted Sites adapter stores the same seed vectors in D1 and performs exact cosine retrieval over this small corpus. ChromaDB cannot run inside a Cloudflare Worker; the live portal does not depend on a laptop-local Python process.
3. A query embedding retrieves the top three sources. Gemini selects a permitted source and its form field structure. Generation is restricted to supplied source IDs/field paths.
4. The nurse can edit the prepared fields, confirm an entry or send it for review. Recorded inputs can prefill the form; diagnoses, prescriptions, normal examinations and appointment dates are never invented from a template. Confirmed live entries are saved into the patient's consultation history.
5. Low-similarity or flagged cases enter a persistent doctor queue. Reported warning signs enter the queue immediately, without waiting for embedding/generation. Server-side routing cannot be bypassed by changing client confidence flags. On the live portal, only `jamdhadesiddharth69@gmail.com` is configured to approve or correct cases. The Python app uses its existing `clinician` role and patient assignments.
6. Approved/corrected cases generate an idempotently indexed, de-identified **form structure**. Patient names, measurements, symptoms, diagnoses, prescriptions and consultation text are not copied into the shared feedback index. A failed feedback request does not undo the approved patient record; it is marked for retry.
7. Hindi, Marathi and English recording/transcription is implemented through Sarvam. It is explicitly disabled when `SARVAM_API_KEY` is absent. Recording is limited to 28 seconds, tracks are stopped on completion/unmount, and server uploads are bounded to 8 MB.

The score shown is **template retrieval similarity**, not a clinical confidence, risk or accuracy score. The supplied KB is a draft reference, not a verified FOGSI/WHO protocol. Its claims about normal findings, doses, coverage percentages and accuracy improvements are not treated as established patient facts or validated performance results.

## Files

Python backend (`carelink-handoff/backend/`):

- `setup_vector_db.py`: embeds and rebuilds seed knowledge while retaining reviewed feedback structures.
- `rag_pipeline.py`: asynchronous embedding, Chroma retrieval and source-constrained generation.
- `rag_knowledge.py`: ingestion, query minimisation, conservative review routing and form policy.
- `feedback_loop.py`: structure-only feedback and generated `kb_stats.json`.
- `export_hosted_rag_index.py`: exports only non-patient seed vectors to the Sites adapter.
- `main.py`: compatibility entry point; existing `app.main:app` remains valid.
- `app/routers/rag.py`: authenticated RAG, confirmation, escalation, review and transcription endpoints.
- New `RagCase` / `RagEntry` SQLAlchemy tables are additive. Existing source records and extraction are preserved.

React frontend (`carelink-handoff/frontend/carelink-app/src/pages/`):

- `NurseDataEntry.jsx`, `VoiceInput.jsx`, `rag.css`.
- The patient journey links to `/rag/:id`; authentication uses the existing Axios client and assignment checks.

Hosted portal (`carelink-hospital-portal/`):

- `app/rag/`: UI, policy, provider adapter, seed vectors and API operations.
- `app/api/rag/[action]/route.ts`, `app/api/doctor/[action]/route.ts`, `app/api/sarvam/transcribe/route.ts`.
- `drizzle/0001_big_professor_monster.sql`: additive D1 tables for the vector index and case workflow.
- Knowledge-base seed refreshes preserve reviewed feedback entries. Patient data removal/cloud retention/NFC behaviour is unchanged.

## How to run — Python + Chroma + React

Use PowerShell. The existing backend virtual environment has been used for testing; the Pydantic patch is aligned to 2.14.3 for the Chroma client dependencies; a new environment needs Python 3.11 or later.

```powershell
Set-Location 'C:\Users\SIDDHARTH\OneDrive\Desktop\Health A thon\carelink-handoff\backend'
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe setup_vector_db.py
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```powershell
Set-Location 'C:\Users\SIDDHARTH\OneDrive\Desktop\Health A thon\carelink-handoff\frontend\carelink-app'
npm start
```

Sign in with an existing staff/clinician account assigned to the patient. Open that patient, then **RAG-assisted data entry**. The default CORS configuration already includes `http://localhost:3000`. Patient accounts cannot prepare or approve RAG cases. This Python deployment is separate from the published Sites portal; redeploy the original FastAPI service to make its new endpoints available on that service's hosted URL.

Backend environment variables belong in the ignored `backend/.env` (never in source or browser code):

```dotenv
GEMINI_API_KEY=<your existing server-side key>
CARELINK_RAG_MODEL=gemini-3.5-flash-lite
CARELINK_EMBEDDING_MODEL=gemini-embedding-001
# Optional; defaults to backend/chroma_db:
CARELINK_CHROMA_PATH=<persistent writable directory>
# Optional; voice remains unavailable until configured:
SARVAM_API_KEY=<your server-side Sarvam key>
SARVAM_MODEL=saaras:v4
```

The requested legacy model IDs are not assumed available. `gemini-embedding-001` and `gemini-3.5-flash-lite` were exercised against the configured account. Sarvam parameters follow the [official transcription API](https://docs.sarvam.ai/api-reference/speech-to-text/transcribe). No real Sarvam recording was sent because no Sarvam key is configured.

The local index is persistent under `chroma_db/`. Re-running setup replaces seed documents only; it preserves doctor-reviewed structure feedback. Indexing completes all embedding requests before modifying seed rows. For production FastAPI, configure the Chroma directory on persistent storage, deploy the updated Docker build, then run setup with runtime secrets available.

## How to run — Sites source locally

```powershell
Set-Location 'C:\Users\SIDDHARTH\OneDrive\Desktop\Health A thon\carelink-hospital-portal'
npm run dev -- --port 5173 --hostname 127.0.0.1
```

Use the local mock sign-in at `/signin-with-chatgpt?return_to=/`. D1 migrations must be applied before local API use. Hosted publishing applies the checked-in migrations automatically. The live approver list is set through secret `CARELINK_DOCTOR_EMAILS`; preview-only identities do not grant production approval.

After changing the knowledge base, update the backend data copy, rebuild Chroma and export the seed:

```powershell
Set-Location 'C:\Users\SIDDHARTH\OneDrive\Desktop\Health A thon'
Copy-Item .\knowledge_base\pregnancy_knowledge_base.json .\carelink-handoff\backend\data\pregnancy_knowledge_base.json
Copy-Item .\knowledge_base\pregnancy_knowledge_base.json .\carelink-hospital-portal\app\rag\pregnancy_knowledge_base.json
Set-Location .\carelink-handoff\backend
.\venv\Scripts\python.exe setup_vector_db.py
.\venv\Scripts\python.exe export_hosted_rag_index.py
```

Publish the updated Sites source afterward. Export excludes feedback/patient records and includes a source-version hash, so cloud seed refreshes do not discard approved feedback.

## Endpoint contract

| Endpoint | Purpose |
|---|---|
| `GET /api/rag/status` | Capability, index and review counters |
| `POST /api/rag/suggest` | Validated intake plus `patient_id`; returns case ID, source references, editable facts and routing |
| `POST /api/rag/confirm` | Confirm the case's form; server enforces ownership, routing and idempotency |
| `POST /api/rag/escalate` | Submit an edited draft for doctor review |
| `POST /api/doctor/verification-queue` | Doctor-only pending queue, warning cases first |
| `POST /api/doctor/verify` | Approve/correct, save the entry and index structure-only feedback |
| `POST /api/sarvam/transcribe` | Bounded authenticated audio upload; Hindi/Marathi/English |

`/confirm` requires the server-issued `case_id` in addition to the patient and edited form. Client-provided confidence and routing fields cannot grant approval. Site write requests require same-origin browser requests; the Python client uses the existing session and `X-CareLink-Client: 1` header.

## Validation

```powershell
Set-Location 'C:\Users\SIDDHARTH\OneDrive\Desktop\Health A thon\carelink-handoff\backend'
.\venv\Scripts\python.exe -m unittest discover -s tests -p test_rag.py -v
```

Nine Python tests cover routing, ownership, doctor-only approval, idempotency, data minimisation, missing voice configuration and KB ingestion. Five hosted policy tests cover score bounds, form validation and feedback privacy. Live-provider tests retrieved `ANC-T2-ROUTINE`, generated a source-constrained form, confirmed a fictional entry, queued a warning-sign case, approved it, and indexed its form structure without patient values. Both React builds and the hosted TypeScript checks are part of verification.
