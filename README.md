# 🏥 CareLink — AI-Powered Maternal Health Handoff System

> **Digital Twin Challenge 2026 · Hackathon Submission**
> Bridging the gap in maternal healthcare continuity across India's fragmented health system.

---

## 📹 Demo Video

> 🎬 **[Watch the 15-Minute Demo on YouTube](#)** *(link will be added after upload)*

---

## 👤 Team Details

| Field | Details |
|-------|---------|
| **Participant Name** | Siddharth Jamdhade |
| **Participation Type** | Solo |
| **GitHub Profile** | [Siddharth-Jamdhade](https://github.com/Siddharth-Jamdhade) |
| **Project Repository** | [github.com/Siddharth-Jamdhade/CareLink](https://github.com/Siddharth-Jamdhade/CareLink) |

---

## 🏫 College / Institution Information

| Field | Details |
|-------|---------|
| **Institution** | Yeshwantrao Chavan College of Engineering (YCCE), Nagpur |
| **University** | Rashtrasant Tukadoji Maharaj Nagpur University |
| **Location** | Nagpur, Maharashtra, India |

---

## 📌 Project Title

**CareLink — AI-Powered Maternal Health Record Digitization & Consultation Handoff System**

---

## 🧩 Problem Statement

In India, millions of pregnant women visit multiple healthcare facilities — government PHCs, private clinics, referral hospitals — across their antenatal journey. Each visit creates paper records: ANC cards, prescriptions, lab reports, ultrasound slips.

These records:
- Get **lost, damaged, or left at home**
- Are **illegible** to providers at new facilities
- Create **dangerous information gaps** during emergencies and referrals
- Mean doctors spend precious consultation time asking the same questions again

**The result:** Preventable maternal and neonatal deaths due to incomplete clinical handoff.

> 📊 India accounts for **8% of global maternal deaths** (WHO, 2023). Fragmented record-keeping is a key contributing factor in preventable cases.

---

## 💡 Healthcare Use Case

**CareLink** targets the **Antenatal Care (ANC) handoff problem** in India:

- **Primary users:** Auxiliary Nurse Midwives (ANMs), ASHA workers, government doctors
- **Secondary users:** Referral specialists, private clinic doctors, patients themselves
- **Setting:** PHCs, CHCs, district hospitals, urban slum clinics — anywhere maternal care is delivered
- **Scenario:** A pregnant woman transfers from a rural PHC to a district hospital in an emergency. The receiving doctor has zero access to her 7-month history. CareLink gives them a **30-second consultation summary** — without needing the physical paper records.

---

## 🤖 AI/ML Model & Framework Details

### Models Used

| Model / Framework | Role | Details |
|------------------|------|---------|
| **Google Gemini 2.5 Flash** | Multimodal fact extraction | Processes image + OCR text together; extracts structured administrative facts from medical documents |
| **PaddleOCR** | Optical Character Recognition | Open-source OCR engine; reads handwritten and printed text from medical record images with confidence scoring |

### AI Design Principles

- **Multimodal prompting:** Gemini receives both the raw image and OCR text simultaneously, enabling cross-validation
- **Safety-first extraction:** Gemini is explicitly instructed to extract only administrative facts — it never reads blood pressure, lab values, or suggests clinical decisions
- **Confidence scoring:** Every extracted fact receives a heuristic confidence score (0.1–0.98) based on field completeness
- **Conflict detection:** Rule-based engine catches date collisions, gestational week regressions, and duplicate records
- **Protocol alignment:** Extracted facts are compared against India's official MoHFW 4-visit ANC protocol to flag documentation gaps

### Extraction Prompt Design (Summarized)
```
Role: Medical record data entry assistant
Task: Extract ONLY administrative facts (visit_date, facility_name,
      document_type, gestational_week, pending_items, provider_name,
      next_appointment, confidence_notes)
Rules: Never interpret clinical data. Never diagnose. Never score risk.
       If a field is unreadable, use null and explain why.
Output: Valid JSON only.
```

---

## 🏗️ Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                         CareLink System                        │
│                                                               │
│  ┌──────────────┐     ┌──────────────────────────────────┐   │
│  │   React.js   │────▶│        FastAPI Backend            │   │
│  │   Frontend   │◀────│  (Python 3.12 + SQLAlchemy)      │   │
│  │  (Port 3000) │     │         (Port 8000)               │   │
│  └──────────────┘     └──────────────┬───────────────────┘   │
│                                       │                        │
│                          ┌────────────▼────────────┐          │
│                          │     AI Processing Layer  │          │
│                          │                          │          │
│                          │  ┌──────────────────┐   │          │
│                          │  │  PaddleOCR Engine │   │          │
│                          │  │  (Text Extraction)│   │          │
│                          │  └────────┬─────────┘   │          │
│                          │           │              │          │
│                          │  ┌────────▼─────────┐   │          │
│                          │  │  Gemini 2.5 Flash │   │          │
│                          │  │  (Fact Extraction)│   │          │
│                          │  └──────────────────┘   │          │
│                          └──────────────────────────┘          │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                   Data Layer                          │    │
│  │   SQLite DB  ·  Uploaded Images  ·  ANC Protocol     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────┐                                            │
│  │  ESP32 IoT   │  (Planned: direct vitals capture at PHCs) │
│  └──────────────┘                                            │
└───────────────────────────────────────────────────────────────┘
```

> 📎 **Architecture Diagram (PDF):** [CareLink Architecture & Pitch Deck](https://content.reskilll.com/documents-6a85bbe18b3da0953406c8fa-1791051764915-db4c946c-CareLinkHandoffPitchDeck.pdf)

> 📊 **Presentation (PDF):** [CareLink Handoff Pitch Deck](https://content.reskilll.com/documents-6a85bbe18b3da0953406c8fa-1791051764915-db4c946c-CareLinkHandoffPitchDeck.pdf)

---

## 📁 Project Structure

```
carelink-handoff/
│
├── backend/                        # FastAPI Python backend
│   ├── app/
│   │   ├── main.py                 # App entry point, CORS, routes
│   │   ├── models.py               # SQLAlchemy ORM models
│   │   ├── schemas.py              # Pydantic schemas
│   │   ├── database.py             # DB engine + session
│   │   ├── config.py               # Environment config
│   │   ├── data/
│   │   │   └── anc_protocol.json   # India MoHFW ANC Protocol
│   │   ├── routers/
│   │   │   ├── patients.py         # Patient CRUD + journey + QR
│   │   │   ├── records.py          # Upload → OCR → Extract → Detect
│   │   │   └── verification.py     # Confirm / Reject / Resolve
│   │   └── services/
│   │       ├── ocr_service.py      # PaddleOCR integration
│   │       ├── llm_extractor.py    # Gemini 2.5 Flash integration
│   │       ├── conflict_detector.py # Rule-based conflict detection
│   │       └── protocol_checker.py  # ANC protocol gap checker
│   ├── uploads/                    # Patient record images
│   └── .env.example                # Environment variable template
│
├── frontend/
│   └── carelink-app/               # React.js web app
│       ├── src/
│       │   ├── App.js
│       │   └── ...
│       └── package.json
│
├── hardware/
│   └── esp32_firmware/             # ESP32 IoT firmware (planned)
│
├── synthetic_data/
│   └── images/                     # Test ANC record images
│
├── docs/                           # Architecture + Presentation files
├── LICENSE                         # MIT License
└── README.md                       # This file
```

---

## 🔬 How It Works — Step by Step

### 1. 📸 Upload a Medical Record
A health worker uploads a photo of any paper maternal health document (ANC card, lab report, prescription, ultrasound).

### 2. 🔍 OCR Extraction (PaddleOCR)
PaddleOCR reads the image and extracts all text, filtering by confidence `> 0.5`.

### 3. 🤖 AI Fact Extraction (Gemini 2.5 Flash)
Gemini receives image + OCR text and returns structured JSON with only safe administrative facts:

| Field | Description |
|-------|-------------|
| `visit_date` | Date of the visit (YYYY-MM-DD) |
| `facility_name` | Hospital or clinic name |
| `document_type` | ANC Card, Lab Report, Prescription, etc. |
| `gestational_week` | Week of pregnancy at time of visit |
| `pending_items` | Follow-ups, referrals, tests to get |
| `provider_name` | Doctor or nurse name |
| `next_appointment` | Next visit date |
| `confidence_notes` | What was unclear or unreadable |

### 4. 🚨 Conflict Detection (Rule-based)

| Conflict Type | Rule |
|---------------|------|
| `date_collision` | Same dates, different facilities (within 2 days) |
| `week_mismatch` | Gestational week went *backwards* in time |
| `possible_duplicate` | Same doc type + same facility within 3 days |

### 5. 📋 ANC Protocol Gap Check (India MoHFW)

| Visit | Expected By | Required Items |
|-------|-------------|----------------|
| Registration + 1st ANC | Week 12 | ANC registration, Blood group, Haemoglobin, Urine test |
| 2nd ANC | Week 20 | TT-1 vaccination, Iron + Folic acid |
| 3rd ANC | Week 30 | TT-2 vaccination, Haemoglobin retest, Ultrasound |
| 4th ANC | Week 36 | Birth preparedness plan, Delivery plan counselling |

### 6. ✅ Verification Layer
Health workers confirm, reject, or resolve conflicts for each extracted fact.

### 7. 📱 QR Code
Each patient gets a scannable QR code linking to their consultation summary — accessible at any facility.

---

## 🛠️ Technical Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Python 3.12** | Core language |
| **FastAPI** | REST API framework |
| **SQLAlchemy** | ORM for database access |
| **SQLite** | Lightweight embedded database |
| **PaddleOCR** | Offline OCR for medical documents |
| **Google Gemini 2.5 Flash** | Multimodal AI for fact extraction |
| **google-genai SDK** | Official Gemini Python SDK |
| **qrcode** | Patient QR code generation |
| **Uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework |
| **React Router v7** | Client-side routing |
| **Axios** | API communication |
| **Framer Motion** | Animations |
| **React Icons** | Icon library |

### Hardware (Planned)
| Technology | Purpose |
|-----------|---------|
| **ESP32** | IoT microcontroller for vitals capture |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/)

### Backend Setup

```bash
cd carelink-handoff/backend

python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install fastapi uvicorn sqlalchemy python-dotenv
pip install paddleocr paddlepaddle
pip install google-genai qrcode pillow python-multipart

# Copy the example env and add your key
copy .env.example .env

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs: **http://localhost:8000/docs**

### Frontend Setup

```bash
cd carelink-handoff/frontend/carelink-app
npm install
npm start
```

App: **http://localhost:3000**

---

## 📡 API Reference

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/patients/` | Create a new patient |
| `GET` | `/api/patients/` | List all patients |
| `GET` | `/api/patients/{id}` | Get a single patient |
| `GET` | `/api/patients/{id}/journey` | Get full consultation summary |
| `GET` | `/api/patients/{id}/qr` | Generate QR code image |

### Records
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/records/upload/{patient_id}` | Upload → OCR → Extract → Conflict check |

### Verification
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/verify/{fact_id}/confirm` | Confirm an extracted fact |
| `POST` | `/api/verify/{fact_id}/reject` | Reject an extracted fact |
| `POST` | `/api/verify/{fact_id}/resolve-conflict` | Resolve a detected conflict |

---

## 🗺️ Roadmap

### ✅ Phase 1 — Core Backend (Complete)
- [x] FastAPI backend with full REST API
- [x] SQLite database with Patient, Record, ExtractedFact, Verification models
- [x] PaddleOCR integration
- [x] Gemini 2.5 Flash multimodal fact extraction
- [x] Confidence scoring system
- [x] Rule-based conflict detection (3 conflict types)
- [x] India MoHFW ANC 4-visit protocol checker
- [x] Verification workflow (confirm, reject, resolve)
- [x] QR code generation per patient

### 🔄 Phase 2 — Frontend UI (In Progress)
- [ ] Patient registration and search screen
- [ ] Document upload with drag-and-drop
- [ ] Real-time extraction progress display
- [ ] Consultation summary one-pager view
- [ ] Conflict resolution UI
- [ ] Protocol gap alerts panel

### 🔮 Phase 3 — Future
- [ ] ESP32 hardware for direct vitals capture
- [ ] Multi-language support (Hindi, Tamil, Telugu, Kannada)
- [ ] Offline-first PWA for low-connectivity areas
- [ ] ABDM / Ayushman Bharat Digital Mission integration
- [ ] Role-based access (ANM, Doctor, Specialist, Patient)
- [ ] Audio-based patient voice verification
- [ ] SMS alerts for upcoming ANC appointments

---

## 🔒 Privacy & Safety Design Principles

1. **No clinical inference** — Gemini extracts only administrative facts, never interprets clinical values or suggests diagnoses.
2. **Confidence transparency** — Every fact carries a confidence score and notes on what was unclear.
3. **Human verification required** — All facts start as `unverified`. Health workers must confirm before they're treated as authoritative.
4. **Conflict flagging, not deletion** — Conflicting records are flagged for review, never automatically discarded.
5. **Source-linked facts** — Every fact links back to the original document image for auditability.
6. **Local data storage** — Patient data stays on-premise (SQLite + local uploads).

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Google Gemini API](https://ai.google.dev/) — Multimodal AI backbone
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) — Open-source OCR engine
- [FastAPI](https://fastapi.tiangolo.com/) — Modern Python API framework
- [India MoHFW ANC Guidelines](https://nhm.gov.in/) — Antenatal care protocol reference

---

<div align="center">
  <strong>CareLink — Because every mother's story matters.</strong><br/>
  Built by Siddharth Jamdhade · YCCE Nagpur · Digital Twin Challenge 2026
</div>