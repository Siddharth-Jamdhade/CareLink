# 🏥 CareLink — AI-Powered Maternal Health Handoff System

> **Hackathon Project · Health A-Thon 2026**
> Bridging the gap in maternal healthcare continuity across India's fragmented health system.

---

## 🧩 The Problem

In India, millions of pregnant women visit multiple facilities — government PHCs, private clinics, referral hospitals — across their antenatal journey. Each visit creates paper records: ANC cards, prescriptions, lab reports, ultrasound slips. These records:

- Get **lost, damaged, or left at home**
- Are **illegible** to providers at new facilities
- Create **dangerous information gaps** during emergencies and referrals
- Mean doctors spend precious consultation time asking the same questions again

The result: **preventable maternal and neonatal deaths** due to incomplete clinical handoff.

---

## 💡 Our Solution — CareLink

**CareLink** is an AI-powered patient journey system that:

1. **Scans and digitizes** paper maternal health records using OCR
2. **Extracts structured administrative facts** from each document using Gemini 2.5 Flash
3. **Detects conflicts** automatically (duplicate visits, gestational week mismatches, date collisions)
4. **Checks documentation gaps** against India's official MoHFW ANC protocol
5. **Presents a one-page consultation summary** that any doctor or ANM can read in 30 seconds
6. **Generates a QR code** that links to the patient's digital journey — scannable at any facility

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
│  ┌──────────────┐     ┌──────────────────────────────────┐   │
│  │   SQLite DB  │     │        ESP32 Hardware            │   │
│  │  (carelink   │     │  (Future: IoT Vitals Capture)    │   │
│  │    .db)      │     │                                   │   │
│  └──────────────┘     └──────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Health A thon/
│
├── carelink-handoff/
│   ├── backend/                    # FastAPI Python backend
│   │   ├── app/
│   │   │   ├── main.py             # App entry point, CORS, route registration
│   │   │   ├── models.py           # SQLAlchemy ORM models
│   │   │   ├── schemas.py          # Pydantic request/response schemas
│   │   │   ├── database.py         # DB engine + session setup
│   │   │   ├── config.py           # Environment config
│   │   │   ├── data/
│   │   │   │   └── anc_protocol.json   # India MoHFW ANC Protocol (4 visits)
│   │   │   ├── routers/
│   │   │   │   ├── patients.py     # Patient CRUD + journey + QR code APIs
│   │   │   │   ├── records.py      # Upload, OCR, extraction, conflict check
│   │   │   │   └── verification.py # Confirm, reject, resolve conflict APIs
│   │   │   └── services/
│   │   │       ├── ocr_service.py      # PaddleOCR text extraction
│   │   │       ├── llm_extractor.py    # Gemini 2.5 Flash fact extraction
│   │   │       ├── conflict_detector.py # Rule-based conflict detection
│   │   │       └── protocol_checker.py  # ANC protocol gap checker
│   │   ├── uploads/                # Saved patient record images
│   │   ├── carelink.db             # SQLite database (auto-created)
│   │   └── .env                    # API keys (NOT committed to git)
│   │
│   ├── frontend/
│   │   └── carelink-app/           # React.js web app (CRA)
│   │       ├── src/
│   │       │   ├── App.js          # Root component + routing
│   │       │   └── ...
│   │       └── package.json
│   │
│   ├── hardware/
│   │   └── esp32_firmware/         # ESP32 IoT firmware (planned)
│   │
│   └── synthetic_data/
│       └── images/                 # Synthetic ANC record images for testing
│
├── output/                         # Generated PDFs and documents
├── tmp/                            # Temporary working files
└── README.md                       # This file
```

---

## 🔬 How It Works — Step by Step

### 1. 📸 Upload a Medical Record
A health worker or the patient uploads a photo of a paper document (ANC card, prescription, lab report, etc.).

### 2. 🔍 OCR Extraction (PaddleOCR)
PaddleOCR processes the image and extracts all readable text with confidence filtering (`> 0.5`).

### 3. 🤖 AI Fact Extraction (Gemini 2.5 Flash)
The OCR text + raw image is sent to Gemini 2.5 Flash with a structured prompt. Gemini extracts **administrative facts only** — never clinical values:

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

> ⚠️ **Safety-first design**: Gemini is explicitly instructed to **never** extract blood pressure, weight, lab values, or make clinical recommendations.

### 4. 🚨 Conflict Detection (Rule-based)
Every newly extracted fact is compared against all previous facts for the same patient:

| Conflict Type | Rule |
|---------------|------|
| `date_collision` | Same dates, different facilities (within 2 days) |
| `week_mismatch` | Gestational week went *backwards* in time |
| `possible_duplicate` | Same doc type + same facility within 3 days |

### 5. 📋 Protocol Gap Check (India MoHFW ANC)
Based on the current gestational week, the system checks for documentation gaps against India's official 4-visit ANC protocol:

| Visit | Expected By | Required Documentation |
|-------|-------------|----------------------|
| Registration + 1st ANC | Week 12 | ANC registration, Blood group, Haemoglobin, Urine test |
| 2nd ANC | Week 20 | TT-1 vaccination, Iron + Folic acid |
| 3rd ANC | Week 30 | TT-2 vaccination, Haemoglobin retest, Ultrasound |
| 4th ANC | Week 36 | Birth preparedness plan, Delivery plan counselling |

### 6. ✅ Verification Layer
Health workers can:
- **Confirm** a fact (verified by `health_worker` or `patient_voice`)
- **Reject** a fact (drops confidence score)
- **Resolve conflicts** (marks one fact as authoritative, flags the other for review)

### 7. 📱 QR Code Generation
Each patient gets a unique QR code linking to their consultation summary page — scannable at any facility using any smartphone.

---

## 🛠️ Tech Stack

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

---

### Backend Setup

```bash
# Navigate to backend
cd carelink-handoff/backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install fastapi uvicorn sqlalchemy python-dotenv
pip install paddleocr paddlepaddle
pip install google-genai qrcode pillow python-multipart

# Create .env file
echo GEMINI_API_KEY=your_api_key_here > .env
echo GEMINI_MODEL=gemini-2.5-flash >> .env

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs**

---

### Frontend Setup

```bash
# Navigate to frontend
cd carelink-handoff/frontend/carelink-app

# Install dependencies
npm install

# Start development server
npm start
```

App available at: **http://localhost:3000**

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
| `POST` | `/api/records/upload/{patient_id}` | Upload image → OCR → Extract → Conflict check |

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
- [x] PaddleOCR integration for text extraction from images
- [x] Gemini 2.5 Flash multimodal fact extraction
- [x] Confidence scoring system
- [x] Rule-based conflict detection (3 conflict types)
- [x] India MoHFW ANC 4-visit protocol checker
- [x] Verification workflow (confirm, reject, resolve)
- [x] QR code generation per patient

### 🔄 Phase 2 — Frontend UI (In Progress)
- [ ] Patient registration and search screen
- [ ] Document upload interface with drag-and-drop
- [ ] Real-time extraction progress display
- [ ] Consultation summary one-pager view
- [ ] Conflict resolution UI with side-by-side comparison
- [ ] Protocol gap alerts panel
- [ ] QR code display and download

### 🔮 Phase 3 — Future Features
- [ ] ESP32 hardware integration for direct vitals capture
- [ ] Multi-language support (Hindi, Tamil, Telugu, Kannada)
- [ ] Offline-first PWA for low-connectivity areas
- [ ] ABDM / Ayushman Bharat Digital Mission integration
- [ ] Role-based access (ANM, Doctor, Specialist, Patient)
- [ ] Audio-based patient voice verification
- [ ] SMS alerts for upcoming ANC appointments
- [ ] PDF export of complete patient journey
- [ ] Inter-facility data sharing with consent management

---

## 🔒 Privacy & Safety Design Principles

1. **No clinical inference** — Gemini is prompted to extract only administrative facts, never interpret clinical values or suggest diagnoses.
2. **Confidence transparency** — Every extracted fact carries a confidence score and notes on what was unclear.
3. **Human verification required** — All facts start as `unverified`. Health workers must confirm before they're treated as authoritative.
4. **Conflict flagging, not deletion** — Conflicting records are flagged for human review, never automatically discarded.
5. **Source-linked facts** — Every fact links back to the original document image for auditability.
6. **Local data storage** — Patient data stays on-premise (SQLite + local uploads), no third-party data storage.

---

## 👥 Team

**Built at Health A-Thon 2026**

| Member | Role |
|--------|------|
| Siddharth | Full-Stack Development, AI Integration |

---

## 📄 License

This project was built for a hackathon. All rights reserved.

---

## 🙏 Acknowledgements

- [Google Gemini API](https://ai.google.dev/) — Multimodal AI backbone
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) — Open-source OCR engine
- [FastAPI](https://fastapi.tiangolo.com/) — Modern Python API framework
- [India MoHFW ANC Guidelines](https://nhm.gov.in/) — Antenatal care protocol reference

---

<div align="center">
  <strong>CareLink — Because every mother's story matters.</strong>
</div>