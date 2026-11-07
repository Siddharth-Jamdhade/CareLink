# Slide 1 - WildFire | CareLink

- Team code: **O2S22M**

## About the Team / Organisation

### A. Engineering team
- **4** engineers + **1** doctor; third-year B.Tech IoT, YCCE.
- **Siddharth** **Jamdhade**: lead architect; Gemini AI, OCR, RAG.
- **Abhay** **Harne**: frontend; React portal, dashboard, **9-column** care.
- **Anaghraj** **Singh** **Thakur**: backend; FastAPI, ChromaDB, verification.
- **Rajveer** **Rajput**: hardware; **ESP32-C3,** **RFID-RC522,** NFC wristband integration.
- Yeshwantrao Chavan College of Engineering (YCCE), Nagpur.
- RTM Nagpur University; Department: Internet of Things (IoT).
### B. Doctor background and role (team-reported)
- **Dr.** **Tanmay** **Gawali**: MBBS intern; clinical ANC validator.
- Lokmanya Tilak Municipal Medical College & Hospital, Mumbai.
- Reviewed **15** ANC templates and structured extraction formats.
- Validated extraction accuracy and MoHFW four-visit protocol rules.
- Tested verification edge cases and doctor review workflows.
- Safety oversight: AI never makes clinical decisions.

## Problem Statement (use case specific)

- Maternal health records fragment across facilities and referrals.
- Paper ANC cards get lost, damaged, or forgotten.
- Receiving hospitals lack accessible, longitudinal pregnancy histories.
- WHO: India accounted for **7.2%** of global maternal deaths **(2023).**
- Users: nurses/ANMs, doctors, and pregnant patients.
- Settings: PHCs, CHCs, district hospitals, private maternity clinics.
- Missing gestational history complicates referral assessment and continuity.

## AI Solution Description

- **₹50** NFC wristband links each registered patient’s pregnancy record.
- Tap scanner; authenticated Doctor Portal retrieves records; **<3** seconds reported.
- Doctor Portal: directory, search; **9** care columns (labs/USG/ABHA/visits).
- Upload ANC images; OCR and Gemini AI extract facts.
- RAG suggests fields; nurses confirm, doctors review exceptions.
- Verified data populates columns and strengthens the knowledge base.
- Patient App planned: gestational progress, EDD, diet, **3D** fetus.
- Private patient credentials; app and voice remain in development.

## Technology and Tools Used

- NFC: **₹50** silicone wristband, **RFID-RC522** reader, **ESP32-C3.**
- AI: Gemini **2.5** Flash; PaddleOCR offline handwriting extraction.
- RAG: ChromaDB, Gemini embeddings, **15** ANC templates, self-learning feedback.
- Backend: Python **3.12,** FastAPI, SQLAlchemy, SQLite/cloud sync.
- Frontend: React **19,** Framer Motion, Axios; Docker deployment.
- Voice: Sarvam AI Hindi/Marathi; integration in progress.
- Rules: MoHFW ANC minimum schedule; WHO guidance referenced.
- Planned: ABDM/ABHA, DigiLocker, REST-based hospital integration.

## Key Features of the solution

- **₹50** NFC identification: reported **<3-second** retrieval at connected facilities.
- OCR + Gemini AI: structured ANC facts, never diagnoses.
- RAG auto-fill: **15** templates; **80%** reported template matches.
- Self-learning: clinician-approved corrections enrich the ChromaDB knowledge base.
- ANC checks: flags missing tests for clinical verification.

# Slide 2 - WildFire | CareLink

- Team code: **O2S22M**

## Build Sprint Progress

- Week **1:** FastAPI/SQLite, PaddleOCR, Gemini AI extraction.
- Week **2:** **3** conflict checks, ANC rules, confidence badges.
- Week **3:** **15-template** RAG, ChromaDB, NFC scanner prototype.
- Week **4:** Doctor Portal, **9** columns, accounts, cloud sync.
- NFC wristband-to-record flow tested end-to-end; doctor queue operational.
- Evolution: OCR, AI, RAG, then band-and-portal platform.
- In progress: Patient App and Sarvam Hindi/Marathi voice.
- Planned app: gestational tracker, EDD, diet, **3D** baby.

## User Validation and AI Evaluation

- Reported tests: **20+** synthetic ANC images; **15** RAG scenarios.
- **3** tested conflict types: **100%** detected; limited sample.
- Extraction accuracy: **85-92%;** RAG template matches: **80%.**
- Unnecessary doctor-review routing: **<5%** reported.
- ANC flag accuracy: **100%** reported; denominator unavailable.
- NFC tap-to-record: **<3** seconds; **4** test patients registered.
- Data-entry reduction: **~87%** target, **15** to **2** minutes.
- Doctor feedback: handoff enables history before consultation.
- Improvements: confidence badges, danger-sign checklist, **12→3** routine clicks.
- RAG mismatch: doctor review before any verified save.
- Limitations: faded OCR documents; pregnancy-only knowledge base.
- No real-PHC clinical validation; Patient App unfinished.
- Performance figures reported; raw logs and denominators unavailable.

## Safety and Responsible AI

- AI never diagnoses, prescribes, or scores clinical risk.
- Every extraction UNVERIFIED until mandatory human confirmation.
- Danger signs: **0%** confidence; mandatory doctor review.
- Low-confidence RAG mismatches route to doctor verification.
- NFC stores link only; authenticated portal authorizes record access.
- Consent and identifier redaction required before cloud AI processing.
- Planned app access restricted to each patient’s own records.
- **₹50** NFC tap reduces literacy barriers; voice in progress.

## Deployment and Sustainability Plan

- PHC setup: computer, internet, Android phone, **₹1,500** scanner.
- Per patient: reusable **₹50** NFC wristband.
- Facility setup: **~₹4,300,** including first-year domain and training.
- Monthly: **₹0-1,300;** API target **~₹0.35/record,** usage dependent.
- Scale: **1** Nagpur PHC, **5** PHCs, proposed NHM rollout.
- Planned national open-source adoption; subsidies and partners remain prospective.
- Planned integrations: ABDM/ABHA, DigiLocker, hospital REST APIs.
- Pilot estimates exclude devices, internet, support, production infrastructure.

## Supporting Links

- MVP: **carelink-hospital-portal-sj.jamdhadesiddharth69.chatgpt.site**
- Code: github.com/Siddharth-Jamdhade/CareLink
- Demo walkthrough: link pending
- Knowledge base: **15** templates, **8** symptom maps (team-reported).
- Evidence: WHO MMEIG **2025;** MoHFW ANC standards.

## Evidence sources

- [WHO MMEIG 2025 report](https://pmnch.who.int/docs/librariesprovider9/meeting-reports/mm-report-update.pdf?download=true&sfvrsn=e5d4e25e_1)
- [MoHFW / NHM maternal-health guidance](https://nhm.gov.in/index1.php?lang=1&level=2&lid=218&sublinkid=822)
- Prototype results and team credentials: user-provided.
