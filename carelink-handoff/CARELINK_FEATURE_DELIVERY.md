# CareLink remaining features — implementation delivery

Implemented directly in the existing project, preserving the pre-existing edits and bulk upload flow. Paths below are relative to `carelink-handoff`. New files are included in full; modified files use exact unified diffs with ten lines of context. Shared-file diffs appear once and include the complete changes across the remaining features.

## Setup and verification

- Backend: use `backend/venv/Scripts/python.exe -m pip install -r backend/requirements.txt` from the project folder, or run pip inside the backend virtual environment. Restart FastAPI to load routes and apply the additive phone-column migration. Existing patient rows are retained. A WhatsApp receipt table is created for replay protection.
- Frontend: `npm run build` from `frontend/carelink-app`. The build has been regenerated and is served by the existing FastAPI fallback route.
- Hardware: select **ESP32 Dev Module** (classic ESP32), install ArduinoJson 7.x and MFRC522 1.4.x, set SSID/password constants and upload the NFC sketch to the ESP32. The existing C3 sketches are untouched. Set device IPv4 addresses in Settings → Hardware.
- NFC: RC522 3.3V, SS5/RST22/SCK18/MISO19/MOSI23. Use an unlocked NTAG215. Open CareLink using a LAN or public URL reachable by the scanning phone; localhost URLs cannot work from another phone. New firmware checks capacity, verifies writes, and commits the NDEF length last.
- WhatsApp: configure the four requested environment variables plus `TWILIO_WEBHOOK_URL` as the exact public HTTPS webhook URL. Set Twilio's inbound WhatsApp webhook to `POST <public-backend>/api/webhook/whatsapp`. Join the Twilio sandbox if using its test sender. Explicit patient IDs use the existing UUID or a unique prefix, optionally `P-` prefixed; `P-0417` works only when an actual ID begins with `0417`. Image-only messages match a unique normalized stored phone number.

Validation: 17 React tests passed; production React build compiled cleanly; 12 backend tests passed with mocked OCR/Gemini and external delivery. The NFC firmware compiled successfully for ESP32 Dev Module. Live Twilio delivery and physical tag writing require configured credentials and hardware.

Operational details: voice keyword matches are presented for review before saving; conflicts retain the existing explicit conflict-resolution flow. Speech recognition is browser-dependent, uses en-IN, and may use the browser provider's speech service. The stream emits actual stage updates, then reveals the completed extraction's fields with 300 ms delays; it is not token-level Gemini streaming. Unsupported browsers or servers fall back safely to the original upload; interrupted streams never blindly upload twice. Check the journey before retrying an interrupted request.

WhatsApp work runs in a FastAPI background task after immediate acknowledgement, with persistent message-ID replay protection. A server crash can leave a receipt in `processing`; this demo does not have a durable worker/recovery queue. Unusable extraction remains an error under the existing pipeline; usable results below 0.5 are saved for review. Hardware routes are intended for the existing trusted-LAN prototype and are not authenticated.

Reference checks: [Twilio webhook validation and parameters](https://www.twilio.com/docs/messaging/guides/webhook-request), [NXP NTAG215 memory and capability container](https://www.nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf).

## 1. Patient voice verification

**How to test:** Open an unverified fact, tap Patient voice, speak a matching facility or week, review the transcript and confirm; verify the patient_voice history and +0.15 confidence boost.

**Dependencies:** No new dependencies or routers.

### New file: frontend/carelink-app/src/VoiceVerification.jsx

```jsx
import React, { useEffect, useRef, useState } from "react";
import API, { errorMessage } from "./api";

export function matchesFact(text, fact) {
  const normalize = value => String(value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const transcript = ` ${normalize(text)} `;
  const keywords = [fact.visit_date, fact.facility_name, fact.gestational_week].filter(v => v != null).map(normalize);
  if (fact.visit_date) {
    const date = new Date(`${fact.visit_date}T12:00:00`);
    if (!Number.isNaN(date.getTime())) keywords.push(normalize(date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })));
  }
  return keywords.some(k => k && transcript.includes(` ${k} `)) || normalize(fact.facility_name).split(" ").some(k => k.length >= 4 && transcript.includes(` ${k} `));
}

export default function VoiceVerification({ fact, disabled, onVerified }) {
  const recognition = useRef(null);
  const [listening, setListening] = useState(false), [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState(""), [saving, setSaving] = useState(false);
  useEffect(() => () => { if (recognition.current) { recognition.current.onend = null; recognition.current.onresult = null; recognition.current.onerror = null; recognition.current.abort(); } }, []);
  function listen() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { setMessage("Voice recognition is unavailable in this browser. Use Verify to review manually."); return; }
    setTranscript(""); setMessage("");
    const speech = new Speech(); recognition.current = speech;
    speech.lang = "en-IN"; speech.interimResults = false;
    speech.onresult = event => setTranscript(event.results[0][0].transcript);
    speech.onerror = event => { setListening(false); setMessage(`Microphone: ${event.error}. Retry or use Verify.`); };
    speech.onend = () => setListening(false);
    try { speech.start(); setListening(true); } catch { setMessage("Unable to start microphone. Retry or use Verify."); }
  }
  async function confirm() {
    setSaving(true);
    try { await API.post(`/verify/${fact.id}/confirm`, { source_type: "patient_voice", value: transcript }); setTranscript(""); await onVerified(); }
    catch (error) { setMessage(errorMessage(error)); } finally { setSaving(false); }
  }
  return <div><button className={`btn btn-ghost ${listening ? "voice-listening" : ""}`} disabled={disabled || saving} onClick={listening ? () => recognition.current?.stop() : listen}>🎤 {listening ? "Listening… Stop" : "Patient voice"}</button>
    {message && <p role="alert">{message}</p>}
    {transcript && <div className="card" aria-live="polite"><p>Patient said: “{transcript}”</p><p>{matchesFact(transcript, fact) ? "Matching keywords found. Review before confirming." : "⚠ No matching keywords. Check the response before overriding."}</p>{fact.status === "conflict" ? <p>Resolve the conflict using the record review action.</p> : <button className="btn btn-primary" disabled={disabled || saving} onClick={confirm}>{saving ? "Saving…" : matchesFact(transcript, fact) ? "Confirm patient response" : "Confirm with manual override"}</button>}<button className="btn btn-ghost" disabled={saving} onClick={() => setTranscript("")}>Dismiss</button></div>}
  </div>;
}
```

### New file: frontend/carelink-app/src/VoiceVerification.test.jsx

```jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VoiceVerification, { matchesFact } from "./VoiceVerification";
import API from "./api";
jest.mock("./api", () => ({ __esModule: true, default: { post: jest.fn() }, errorMessage: () => "Failed" }));

const fact = { id: "fact", facility_name: "Wardha Clinic", visit_date: "2026-09-09", gestational_week: 22, status: "unverified" };
test("voice matching uses word boundaries and tolerates facility keywords", () => {
  expect(matchesFact("I visited Wardha yesterday", fact)).toBe(true);
  expect(matchesFact("I am 22 weeks", fact)).toBe(true);
  expect(matchesFact("122", fact)).toBe(false);
  expect(matchesFact("hello", {})).toBe(false);
});
test("unsupported browser provides a manual verification fallback", () => {
  render(<VoiceVerification fact={fact} />);
  fireEvent.click(screen.getByRole("button", { name: /Patient voice/ }));
  expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
});
test("transcript requires review before saving patient_voice", async () => {
  let speech;
  window.SpeechRecognition = function () { speech = this; this.start = jest.fn(); this.abort = jest.fn(); };
  API.post.mockResolvedValue({});
  const refresh = jest.fn();
  render(<VoiceVerification fact={fact} onVerified={refresh} />);
  fireEvent.click(screen.getByRole("button", { name: /Patient voice/ }));
  const { act } = require("@testing-library/react");
  act(() => { speech.onresult({ results: [[{ transcript: "Wardha Clinic" }]] }); speech.onend(); });
  expect(API.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm patient response" }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(API.post).toHaveBeenCalledWith("/verify/fact/confirm", { source_type: "patient_voice", value: "Wardha Clinic" });
  delete window.SpeechRecognition;
});
```

### Modified file: backend/app/routers/verification.py

```diff
--- a/backend/app/routers/verification.py
+++ b/backend/app/routers/verification.py
@@ -62,25 +62,25 @@
         fact.verified_by or "[]"
     )
 
     # Add the new verification source
     if req.source_type not in verified_list:
         verified_list.append(req.source_type)
 
     fact.verified_by = json.dumps(verified_list)
 
     # Increase the prototype confidence score
-    current_confidence = fact.confidence or 0.5
+    current_confidence = fact.confidence if fact.confidence is not None else 0.5
 
     fact.confidence = min(
         0.99,
-        current_confidence + 0.10
+        current_confidence + (0.15 if req.source_type == "patient_voice" else 0.10)
     )
 
     # Save verification history
     verification = Verification(
         fact_id=fact_id,
         source_type=req.source_type,
         value=req.value,
     )
 
     db.add(verification)
@@ -114,21 +114,21 @@
     )
 
     if not fact:
         raise HTTPException(
             status_code=404,
             detail="Fact not found"
         )
 
     fact.status = "unverified"
 
-    current_confidence = fact.confidence or 0.5
+    current_confidence = fact.confidence if fact.confidence is not None else 0.5
 
     fact.confidence = max(
         0.1,
         current_confidence - 0.20
     )
 
     db.commit()
     db.refresh(fact)
 
     return {
```

### Modified file: frontend/carelink-app/src/pages/PatientJourney.jsx

```diff
--- a/frontend/carelink-app/src/pages/PatientJourney.jsx
+++ b/frontend/carelink-app/src/pages/PatientJourney.jsx
@@ -1,14 +1,17 @@
 import React, { useState, useEffect, useCallback } from "react";
 import { useParams, useNavigate } from "react-router-dom";
 import API, { backendOrigin, readCache, writeCache, removeCache, errorMessage } from "../api";
 import RecordDetails from "../RecordDetails";
+
+import HardwareActions from "../HardwareActions";
+import VoiceVerification from "../VoiceVerification";
 
 const STATUS_COLORS = {
   verified: { bg: "#E0FFF5", dot: "#2ED573", text: "#00795A", label: "✓ Verified" },
   unverified: { bg: "#FFF3E0", dot: "#FFA502", text: "#E65100", label: "⏳ Confirm" },
   conflict: { bg: "#FFE8EA", dot: "#FF4757", text: "#C0392B", label: "⚡ Conflict" },
   missing: { bg: "#F0F0F5", dot: "#A4B0CC", text: "#5C6B8A", label: "? Missing" },
 };
 
 function PatientJourney() {
   const { id } = useParams();
@@ -114,20 +117,21 @@
                     } catch { return null; }
                   })()}
 
                   {/* Conflict Details */}
                   {fact.status === "conflict" && fact.conflict_details && (
                     <div style={{ background: "#FFE8EA", padding: 8, borderRadius: 6, fontSize: 11, color: "#C0392B", marginBottom: 8 }}>
                       ⚡ {parseList(fact.conflict_details).map(c => c.message).filter(Boolean).join("; ")}
                     </div>
                   )}
 
+                  {fact.status !== "verified" && <VoiceVerification fact={fact} disabled={offline || busy} onVerified={loadJourney} />}
                   {/* Action Buttons */}
                   <div style={{ display: "flex", gap: 6 }}>
                     {fact.source_image_path && (
                       <button onClick={() => setSelectedImage(`${backendOrigin()}/${fact.source_image_path.replace(/^\//, "")}`)}
                         style={{ background: "none", border: "1px solid #6C3CE1", color: "#6C3CE1", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                         📎 View Source
                       </button>
                     )}
                     {fact.status !== "verified" && (
                       <button disabled={offline || busy} onClick={() => confirmFact(fact.id, fact.status === "conflict")}
@@ -135,24 +139,25 @@
                         {fact.status === "conflict" ? "Resolve conflict" : "Verify"}
                       </button>
                     )}
                   </div>
                 </div>
               </div>
             );
           })}
         </div>
 
+        <HardwareActions patientId={id} disabled={offline || busy} />
         {/* Bottom Actions */}
         <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 40 }}>
           <button className="btn btn-primary" style={{ flex: 1 }} disabled={offline} onClick={() => navigate(`/capture/${id}`)}>📸 Add Record</button>
-          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => window.open(`${backendOrigin()}/api/patients/${id}/qr?frontend_origin=${encodeURIComponent(window.location.origin)}`, "_blank", "noopener,noreferrer")}>🖨️ QR Code</button>
+          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => window.open(`${backendOrigin()}/api/patients/${id}/qr?frontend_origin=${encodeURIComponent(window.location.origin)}`, "_blank", "noopener,noreferrer")}>📱 QR Code</button>
         </div>
 
         {/* Source Image Modal */}
         {selectedImage && (
           <div role="dialog" aria-modal="true" aria-label="Source image" onClick={() => setSelectedImage(null)}
             style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "pointer" }}>
             <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}>
               <button className="btn btn-ghost" onClick={() => setSelectedImage(null)}>Close source</button><img src={selectedImage} alt="Source" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 8 }} />
               <div style={{ textAlign: "center", color: "#fff", marginTop: 10, fontSize: 13 }}>📎 Source Image — tap anywhere to close</div>
             </div>
```

### Modified file: frontend/carelink-app/src/App.css

```diff
--- a/frontend/carelink-app/src/App.css
+++ b/frontend/carelink-app/src/App.css
@@ -244,10 +244,18 @@
 .record-review-note { padding: 12px; background: #fff8e8; border-radius: 10px; color: #785016; font-size: 12px; line-height: 1.6; }
 .record-details-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin: 12px 0; }
 .record-details-grid > div { padding: 12px; background: #fff; overflow-wrap: anywhere; }
 .record-details-grid dt { font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; }
 .record-details-grid dd { font-size: 13px; font-weight: 600; line-height: 1.6; white-space: pre-wrap; }
 @media (max-width: 400px) { .record-details-grid { grid-template-columns: 1fr; } }
 .capture-actions label:has(input:disabled) { opacity: .55; cursor: not-allowed; }
 :focus-visible { outline-color: #15796f; }
 @media (min-width: 850px) { .welcome { display: grid; grid-template-columns: 1fr 1fr; column-gap: 70px; } .welcome-brand { grid-column: 1 / -1; margin-bottom: 52px; } .welcome-hero { padding-top: 36px; } }
 @media (max-width: 380px) { .welcome { padding-left: 16px; padding-right: 16px; } .consent-card { padding: 20px; } .mobile-nav { padding-left: 6px; padding-right: 6px; } }
+
+@keyframes voicePulse { 50% { opacity: .45; } }
+.voice-listening { animation: voicePulse 1s infinite; color: #6C3CE1; }
+@keyframes fieldReveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
+.live-field { animation: fieldReveal .3s ease-out; margin: 8px 0; }
+@media (prefers-reduced-motion: reduce) { .voice-listening, .live-field { animation: none; } }
+
+.hardware-modal { position: fixed; inset: 0; background: #0009; display: grid; place-items: center; padding: 24px; z-index: 1000; }
```

## 2. Streaming extraction

**How to test:** Select a synthetic JPEG/PNG and Extract; observe OCR, extraction, field reveals, conflict checking and the saved result; test an older server for fallback.

**Dependencies:** Uses existing FastAPI, Starlette and browser fetch; no added dependency. Existing records router registration is retained.

### New file: frontend/carelink-app/src/streamExtraction.js

```jsx
import API, { backendOrigin } from "./api";

export async function streamExtraction(patientId, form, signal, onEvent) {
  // Older servers/browsers can safely use the original endpoint before streaming starts.
  const fallback = () => API.post(`/records/upload/${patientId}`, form, { signal, timeout: 180000 });
  if (!window.ReadableStream || !window.TextDecoder || !window.fetch) return fallback();
  const response = await fetch(`${backendOrigin()}/api/records/upload-stream/${patientId}`, { method: "POST", body: form, signal });
  if ([404, 405, 501].includes(response.status)) return fallback();
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Object.assign(new Error(data.detail || "Upload failed"), { response: { data, status: response.status } });
  }
  if (!response.body) throw new Error("Stream interrupted. Check the journey before retrying.");
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        const lines = block.split("\n");
        const event = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
        const dataText = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
        if (!dataText) continue;
        const data = JSON.parse(dataText);
        if (event === "error") throw Object.assign(new Error(data.detail), { response: { data } });
        onEvent(event, data);
        if (event === "done") return { data };
      }
      if (done) throw new Error("Stream interrupted. Check the journey before retrying to avoid duplicates.");
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
```

### New file: frontend/carelink-app/src/streamExtraction.test.js

```jsx
import { TextDecoder, TextEncoder } from "util";
import { streamExtraction } from "./streamExtraction";
import API from "./api";
jest.mock("./api", () => ({ __esModule: true, default: { post: jest.fn() }, backendOrigin: () => "http://localhost:8000" }));

const original = { fetch: window.fetch, ReadableStream: window.ReadableStream, TextDecoder: window.TextDecoder };
afterEach(() => { Object.assign(window, original); jest.clearAllMocks(); });
function setup(chunks) {
  window.ReadableStream = function () {};
  window.TextDecoder = TextDecoder;
  const reader = { read: jest.fn(), cancel: jest.fn().mockResolvedValue(), releaseLock: jest.fn() };
  chunks.forEach(chunk => reader.read.mockResolvedValueOnce({ value: new TextEncoder().encode(chunk), done: false }));
  reader.read.mockResolvedValue({ done: true });
  window.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, body: { getReader: () => reader } });
}
test("parses events split across network chunks", async () => {
  setup(['event: field\ndata: {"field":"facility_name",', '"value":"Clinic"}\n\nevent: done\ndata: {"record_id":"saved"}\n', '\n']);
  const event = jest.fn();
  expect(await streamExtraction("patient", new FormData(), undefined, event)).toEqual({ data: { record_id: "saved" } });
  expect(event).toHaveBeenCalledWith("field", { field: "facility_name", value: "Clinic" });
  expect(API.post).not.toHaveBeenCalled();
});
test("interruption never reuploads a potentially committed record", async () => {
  setup(['event: status\ndata: {"step":"conflict"}\n\n']);
  await expect(streamExtraction("patient", new FormData(), undefined, jest.fn())).rejects.toThrow("Check the journey");
  expect(API.post).not.toHaveBeenCalled();
});
test("older server safely falls back to original upload", async () => {
  setup([]); window.fetch.mockResolvedValue({ status: 404 });
  API.post.mockResolvedValue({ data: { record_id: "saved" } });
  await streamExtraction("patient", new FormData(), undefined, jest.fn());
  expect(API.post).toHaveBeenCalledTimes(1);
});
```

### Modified file: backend/app/routers/records.py

```diff
--- a/backend/app/routers/records.py
+++ b/backend/app/routers/records.py
@@ -1,10 +1,13 @@
+import asyncio
+from fastapi.responses import StreamingResponse
+from starlette.concurrency import run_in_threadpool
 import os
 import json
 import uuid
 import io
 from pathlib import Path
 from PIL import Image, UnidentifiedImageError
 
 from fastapi import (
     APIRouter,
     Depends,
@@ -27,22 +30,21 @@
 router = APIRouter()
 
 MAX_UPLOAD_SIZE = 10 * 1024 * 1024
 
 ALLOWED_IMAGE_TYPES = {
     "image/jpeg": ".jpg",
     "image/png": ".png",
 }
 
 
-@router.post("/upload/{patient_id}")
-async def upload_and_extract(
+async def extraction_events(
     patient_id: str,
     file: UploadFile = File(...),
     db: Session = Depends(get_db),
 ):
     """
     Upload an image, run OCR, extract administrative
     facts with Gemini, save facts, and detect conflicts.
     """
 
     # Step 1: Verify patient exists
@@ -102,121 +104,165 @@
     filename = f"{uuid.uuid4().hex}{extension}"
 
     file_path = os.path.join(patient_dir, filename)
     source_url = "uploads/" + Path(file_path).resolve().relative_to(
         Path(config.UPLOAD_DIR).resolve()
     ).as_posix()
 
     with open(file_path, "wb") as output:
         output.write(content)
 
-    # Step 4: Run OCR
-
+    saved = False
     try:
-        ocr_text = extract_text_from_image(file_path)
-    except Exception:
-        Path(file_path).unlink(missing_ok=True)
-        raise HTTPException(
-            status_code=500,
-            detail="Text recognition failed. Try a clear, upright photo of one paper."
-        )
-
-    # Step 5: Run Gemini extraction
-
-    extracted = extract_facts_from_image(
-        file_path,
-        ocr_text
-    )
-
-    # The extraction service returns a low confidence
-    # and an error note when extraction fails.
-
-    if (
-        not isinstance(extracted, dict)
-        or extracted.get("_confidence", 0) <= 0.1
-    ):
-        Path(file_path).unlink(missing_ok=True)
-        raise HTTPException(
-            status_code=502,
-            detail=(extracted.get("_error") if isinstance(extracted, dict) else None) or "AI returned no usable facts. Try a clearer image. No facts were saved."
-        )
-
-    # Step 6: Create the Record entry
-
-    record = Record(
-        patient_id=patient_id,
-        source_image_path=source_url,
-        original_filename=file.filename,
-    )
-
-    db.add(record)
-    db.flush()
-
-    # Step 7: Prepare pending items
-
-    pending_items = extracted.get("pending_items", [])
-
-    if isinstance(pending_items, list):
-        pending_items = json.dumps(pending_items)
-
-    # Step 8: Save extracted facts
-
-    fact = ExtractedFact(
-        record_id=record.id,
-        patient_id=patient_id,
-        visit_date=extracted.get("visit_date"),
-        facility_name=extracted.get("facility_name"),
-        document_type=extracted.get("document_type"),
-        gestational_week=extracted.get("gestational_week"),
-        pending_items=pending_items,
-        provider_name=extracted.get("provider_name"),
-        next_appointment=extracted.get("next_appointment"),
-        documented_diagnosis=extracted.get("documented_diagnosis"),
-        documented_symptoms=extracted.get("documented_symptoms"),
-        documented_medications=extracted.get("documented_medications"),
-        confidence=extracted.get("_confidence", 0.5),
-        status="unverified",
-        verified_by='["document"]',
-        confidence_notes=extracted.get("confidence_notes"),
-    )
-
-    db.add(fact)
-    db.flush()
-
-    # Step 9: Check existing records for conflicts
-
-    existing_facts = (
-        db.query(ExtractedFact)
-        .filter(ExtractedFact.patient_id == patient_id)
-        .filter(ExtractedFact.id != fact.id)
-        .all()
-    )
-
-    conflicts = detect_conflicts(
-        extracted,
-        existing_facts
-    )
-
-    # Step 10: Update status if conflicts exist
-
-    if conflicts:
-        fact.status = "conflict"
-        fact.conflict_details = json.dumps(conflicts)
-
-    # Step 11: Commit database changes
-
-    db.commit()
-    db.refresh(record)
-    db.refresh(fact)
-
-    # Step 12: Return API response
-
-    return {
-        "record_id": record.id,
-        "fact_id": fact.id,
-        "extracted_data": extracted,
-        "confidence": fact.confidence,
-        "status": fact.status,
-        "conflicts": conflicts,
-        "ocr_text": ocr_text,
-        "source_image": source_url,
-    }
+        # Step 4: Run OCR
+
+        try:
+            yield ("status", {"step": "ocr", "message": "Reading text from image..."})
+            ocr_text = await run_in_threadpool(extract_text_from_image, file_path)
+        except Exception:
+            Path(file_path).unlink(missing_ok=True)
+            raise HTTPException(
+                status_code=500,
+                detail="Text recognition failed. Try a clear, upright photo of one paper."
+            )
+
+        # Step 5: Run Gemini extraction
+
+        yield ("status", {"step": "extract", "message": "AI extracting facts..."})
+        extracted = await run_in_threadpool(extract_facts_from_image, file_path, ocr_text)
+
+        # The extraction service returns a low confidence
+        # and an error note when extraction fails.
+
+        if (
+            not isinstance(extracted, dict)
+            or extracted.get("_confidence", 0) <= 0.1
+        ):
+            Path(file_path).unlink(missing_ok=True)
+            raise HTTPException(
+                status_code=502,
+                detail=(extracted.get("_error") if isinstance(extracted, dict) else None) or "AI returned no usable facts. Try a clearer image. No facts were saved."
+            )
+
+        for field, value in extracted.items():
+            if not field.startswith("_"):
+                yield ("field", {"field": field, "value": value})
+        yield ("status", {"step": "conflict", "message": "Checking for conflicts..."})
+
+        # Step 6: Create the Record entry
+
+        record = Record(
+            patient_id=patient_id,
+            source_image_path=source_url,
+            original_filename=file.filename,
+        )
+
+        db.add(record)
+        db.flush()
+
+        # Step 7: Prepare pending items
+
+        pending_items = extracted.get("pending_items", [])
+
+        if isinstance(pending_items, list):
+            pending_items = json.dumps(pending_items)
+
+        # Step 8: Save extracted facts
+
+        fact = ExtractedFact(
+            record_id=record.id,
+            patient_id=patient_id,
+            visit_date=extracted.get("visit_date"),
+            facility_name=extracted.get("facility_name"),
+            document_type=extracted.get("document_type"),
+            gestational_week=extracted.get("gestational_week"),
+            pending_items=pending_items,
+            provider_name=extracted.get("provider_name"),
+            next_appointment=extracted.get("next_appointment"),
+            documented_diagnosis=extracted.get("documented_diagnosis"),
+            documented_symptoms=extracted.get("documented_symptoms"),
+            documented_medications=extracted.get("documented_medications"),
+            confidence=extracted.get("_confidence", 0.5),
+            status="unverified",
+            verified_by='["document"]',
+            confidence_notes=extracted.get("confidence_notes"),
+        )
+
+        db.add(fact)
+        db.flush()
+
+        # Step 9: Check existing records for conflicts
+
+        existing_facts = (
+            db.query(ExtractedFact)
+            .filter(ExtractedFact.patient_id == patient_id)
+            .filter(ExtractedFact.id != fact.id)
+            .all()
+        )
+
+        conflicts = detect_conflicts(
+            extracted,
+            existing_facts
+        )
+
+        # Step 10: Update status if conflicts exist
+
+        if conflicts:
+            fact.status = "conflict"
+            fact.conflict_details = json.dumps(conflicts)
+
+        # Step 11: Commit database changes
+
+        db.commit()
+        saved = True
+        db.refresh(record)
+        db.refresh(fact)
+
+        # Step 12: Return API response
+
+        yield ("done", {
+            "record_id": record.id,
+            "fact_id": fact.id,
+            "extracted_data": extracted,
+            "confidence": fact.confidence,
+            "status": fact.status,
+            "conflicts": conflicts,
+            "ocr_text": ocr_text,
+            "source_image": source_url,
+        })
+    finally:
+        if not saved:
+            db.rollback()
+            Path(file_path).unlink(missing_ok=True)
+
+
+@router.post("/upload/{patient_id}")
+async def upload_and_extract(patient_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
+    async for event, data in extraction_events(patient_id, file, db):
+        if event == "done":
+            return data
+
+
+@router.post("/upload-stream/{patient_id}")
+async def upload_stream(patient_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
+    # Validate and read the upload before returning a streaming HTTP response.
+    events = extraction_events(patient_id, file, db)
+    first = await anext(events)
+
+    async def stream():
+        try:
+            yield encode_event(*first)
+            async for event, data in events:
+                yield encode_event(event, data)
+                if event == "field":
+                    await asyncio.sleep(0.3)
+        except Exception as error:
+            db.rollback()
+            yield encode_event("error", {"detail": error.detail if isinstance(error, HTTPException) else "Extraction failed. Check the journey before retrying."})
+        finally:
+            await events.aclose()
+
+    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
+
+
+def encode_event(event, data):
+    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
```

### Modified file: frontend/carelink-app/src/pages/CameraCapture.jsx

```diff
--- a/frontend/carelink-app/src/pages/CameraCapture.jsx
+++ b/frontend/carelink-app/src/pages/CameraCapture.jsx
@@ -1,40 +1,53 @@
 import React, { useEffect, useRef, useState } from "react";
 import { useParams, useNavigate } from "react-router-dom";
-import API, { errorMessage } from "../api";
+import { errorMessage } from "../api";
 import RecordDetails from "../RecordDetails";
+import { streamExtraction } from "../streamExtraction";
+const FIELD_LABELS = { visit_date: "Visit Date", facility_name: "Facility", document_type: "Document", gestational_week: "Week" };
+function fieldValue(field, value) {
+  if (field === "visit_date" && /^\d{4}-\d{2}-\d{2}$/.test(value || "")) return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
+  return Array.isArray(value) ? value.join(", ") : String(value ?? "Not found");
+}
 export default function CameraCapture() {
   const { id } = useParams();
   const navigate = useNavigate();
   const video = useRef(null), stream = useRef(null), active = useRef(true), request = useRef(null), locked = useRef(false);
   const [streaming, setStreaming] = useState(false), [loading, setLoading] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
+  const [progress, setProgress] = useState({ message: "Uploading image...", fields: {} });
+  function onProgress(event, data) {
+    if (!active.current) return;
+    if (event === "status") setProgress(p => ({ ...p, message: data.message }));
+    if (event === "field") setProgress(p => ({ ...p, fields: { ...p.fields, [data.field]: data.value } }));
+  }
   const [authorized, setAuthorized] = useState(false);
   const [papers, setPapers] = useState([]);
   function selectPapers(files) {
     if (files.length > 10) { setError("Select up to 10 papers at a time."); return; }
     setError("");
     setPapers(Array.from(files, (file, index) => ({
       id: index, file, status: "ready",
       error: !["image/jpeg", "image/png"].includes(file.type) ? "Choose a JPEG or PNG image." : file.size > 10 * 1024 * 1024 ? "Image must be 10 MB or smaller." : "",
     })));
   }
   async function extractPapers() {
     if (!authorized || locked.current) return;
     locked.current = true; setLoading(true); setError(""); stop(); setStreaming(false);
     try {
       for (const paper of papers.filter(p => ["ready", "failed"].includes(p.status) && (!p.error || p.status === "failed"))) {
         if (!active.current) break;
         setPapers(current => current.map(p => p.id === paper.id ? { ...p, status: "processing", error: "" } : p));
         const form = new FormData(); form.append("file", paper.file);
+        setProgress({ message: "Uploading image...", fields: {} });
         request.current = new AbortController();
         try {
-          const response = await API.post(`/records/upload/${id}`, form, { timeout: 180000, signal: request.current.signal });
+          const response = await streamExtraction(id, form, request.current.signal, onProgress);
           if (active.current) setPapers(current => current.map(p => p.id === paper.id ? { ...p, status: "saved", result: response.data } : p));
         } catch (err) {
           if (active.current) setPapers(current => current.map(p => p.id === paper.id ? { ...p, status: err.response ? "failed" : "unknown", error: err.response ? errorMessage(err) : "Connection interrupted. This paper may have been saved. Check the journey before selecting it again." } : p));
         }
       }
     } finally { locked.current = false; if (active.current) setLoading(false); }
   }
   function stop() { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; }
   useEffect(() => { active.current = true; return () => { active.current = false; stop(); request.current?.abort(); }; }, []);
   async function startCamera() {
@@ -46,31 +59,32 @@
       stop(); stream.current = camera; video.current.srcObject = camera; await video.current.play(); setStreaming(true);
     } catch (err) { stop(); setError(err.name === "NotAllowedError" ? "Camera permission was denied. Allow it in browser settings or choose an image below." : err.message); }
   }
   async function upload(file) {
     if (!authorized) { setError("Confirm permission to process this record before uploading."); return; }
     if (!file || locked.current) return;
     if (!["image/jpeg", "image/png"].includes(file.type)) { setError("Choose a JPEG or PNG image."); return; }
     if (file.size > 10 * 1024 * 1024) { setError("Choose an image smaller than 10 MB."); return; }
     locked.current = true; setLoading(true); setResult(null); setError(""); stop(); setStreaming(false);
     const form = new FormData(); form.append("file", file, file.name || "capture.jpg");
-    request.current = new AbortController();
-    try { const response = await API.post(`/records/upload/${id}`, form, { timeout: 180000, signal: request.current.signal }); if (active.current) setResult(response.data); }
-    catch (err) { if (active.current) setError(errorMessage(err)); }
+    setProgress({ message: "Uploading image...", fields: {} });
+        request.current = new AbortController();
+    try { const response = await streamExtraction(id, form, request.current.signal, onProgress); if (active.current) setResult(response.data); }
+    catch (err) { if (active.current) setError(err.message || errorMessage(err)); }
     finally { locked.current = false; if (active.current) setLoading(false); }
   }
   function capture() {
     if (!video.current?.videoWidth) { setError("Wait for the camera preview before capturing."); return; }
     const canvas = document.createElement("canvas"); canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight;
     canvas.getContext("2d").drawImage(video.current, 0, 0);
     canvas.toBlob(blob => { if (blob) upload(blob); else setError("Could not capture this frame. Please try again."); }, "image/jpeg", 0.9);
   }
   return <main className="container capture-page"><header className="capture-header"><button className="btn btn-ghost" onClick={() => navigate(`/patient/${id}`)}>← Journey</button><h1>Scan a record</h1></header>
     {error && <div className="alert alert-danger" role="alert">{error}</div>}
     {!result && <section className="card upload-consent"><h2>Before you add a record</h2><p>The image will be stored on the care server and sent to Google Gemini for AI extraction. Start camera requests camera access only. Use synthetic records for this demo.</p><label className="consent-choice"><input type="checkbox" checked={authorized} disabled={loading} onChange={e => { setAuthorized(e.target.checked); if (!e.target.checked) { stop(); setStreaming(false); } }} /><span>I have permission to upload and process this record.</span></label></section>}
     {!result && <><div className="camera-stage"><video ref={video} autoPlay muted playsInline hidden={!streaming} />{!streaming && <div className="camera-placeholder"><div className="scan-icon">▤</div><h2>Bring the record into focus</h2><p>Use good light and keep all four corners visible.</p></div>}{streaming && <div className="camera-guide" />}</div>
     <div className="capture-actions"><button className="btn btn-primary" disabled={loading || !authorized} onClick={streaming ? capture : startCamera}>{streaming ? "Capture and extract" : "Start camera"}</button><label className="btn btn-outline">Select papers<input aria-label="Upload record from gallery" type="file" multiple accept="image/jpeg,image/png" disabled={loading || !authorized} onChange={e => { selectPapers(e.target.files); e.target.value = ""; }} /></label></div><p className="capture-hint">Select up to 10 JPEG or PNG images, 10 MB each. Photograph one paper per image. Each paper becomes a separate record for this patient.</p></>}
     {papers.length > 0 && <section className="card paper-queue" aria-label="Selected papers"><h2>Your papers <span>{papers.filter(p => p.status === "saved").length}/{papers.length} saved</span></h2><div aria-live="polite">{papers.map(p => <article className="paper-row" key={p.id}><strong>{p.file.name}</strong><span>{p.error ? (p.status === "unknown" ? "Check journey" : "Needs attention") : ({ ready: "Ready to extract", processing: "Extracting…", saved: "Saved · review required", failed: "Failed" })[p.status]}</span>{p.error && <p role="alert">{p.error}</p>}{p.result && <><p>{p.result.extracted_data?.document_type || "Record"} · {p.result.conflicts?.length || 0} conflicts</p><RecordDetails data={p.result.extracted_data} /></>}</article>)}</div><div className="capture-actions"><button className="btn btn-primary" disabled={loading || !authorized || !papers.some(p => (p.status === "ready" && !p.error) || p.status === "failed")} onClick={extractPapers}>{loading ? "Processing papers…" : papers.some(p => p.status === "failed") ? "Retry failed papers" : "Extract selected papers"}</button><button className="btn btn-ghost" disabled={loading} onClick={() => navigate(`/patient/${id}`)}>View journey</button></div><p>Keep this page open until processing finishes. Successful papers will not be uploaded again when you retry.</p></section>}
-    {loading && <section className="processing card" role="status"><div className="spinner" /><h2>AI reading your record…</h2><p>Uploading image → Reading text → Checking records</p><small>This may take a minute. Keep this page open.</small></section>}
+    {loading && <section className="processing card" role="status"><div className="spinner" /><h2>{progress.message}</h2><div aria-live="polite">{Object.entries(progress.fields).map(([field, value]) => <p className="live-field" key={field}><strong>{FIELD_LABELS[field] || field.replaceAll("_", " ")}: </strong>{fieldValue(field, value)} ✓</p>)}</div><small>This may take a minute. Keep this page open.</small></section>}
     {result && <section className="animate-in"><div className="section-heading"><span className="badge badge-unverified">Review required</span><h2>Record added to the journey</h2><p>Check the extracted fields against the source document.</p></div><RecordDetails data={result.extracted_data} /><div className="stats-row"><div className="stat-card"><div className="num">{Math.round((result.confidence || 0) * 100)}%</div><div className="label">Extraction confidence</div></div><div className="stat-card"><div className="num">{result.conflicts?.length || 0}</div><div className="label">Conflicts to review</div></div></div><div className="capture-actions"><button className="btn btn-primary" onClick={() => navigate(`/patient/${id}`)}>View full journey</button><button className="btn btn-ghost" onClick={() => { setResult(null); setAuthorized(false); }}>Add another record</button></div></section>}
   </main>;
 }
```

## Shared NFC hardware integration

Only the NFC writer is supported. Thermal printing was removed because no printer is available.

### New file: backend/app/routers/esp32_bridge.py

```python
import ipaddress
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Patient
from ..services.journey_links import journey_url

router = APIRouter()


class NFCRequest(BaseModel):
    patient_id: str
    nfc_writer_ip: str
    frontend_origin: str


def device_url(address, path):
    try:
        ip = ipaddress.IPv4Address(address)
    except ValueError:
        raise HTTPException(400, "Enter the ESP32 IPv4 address without a port or URL")
    networks = ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")
    if not any(ip in ipaddress.ip_network(network) for network in networks):
        raise HTTPException(400, "ESP32 must use a private LAN IPv4 address")
    return f"http://{ip}/{path}"


async def forward(address, path, payload):
    url = device_url(address, path)
    try:
        async with httpx.AsyncClient(timeout=20, trust_env=False) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            if not isinstance(result, dict) or result.get("status") != "written":
                raise HTTPException(502, "No wristband detected within 10 seconds" if isinstance(result, dict) and result.get("status") == "timeout" else "ESP32 did not complete the operation")
            return result
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "ESP32 unavailable or operation failed. Check its IP, Wi-Fi and wiring.")


@router.post("/write-nfc")
async def write_nfc(req: NFCRequest, db: Session = Depends(get_db)):
    if db.get(Patient, req.patient_id) is None:
        raise HTTPException(404, "Patient not found")
    return await forward(req.nfc_writer_ip, "write", {"url": journey_url(req.patient_id, req.frontend_origin)})
```

### New file: frontend/carelink-app/src/HardwareActions.jsx

```jsx
import React, { useState } from "react";
import API, { errorMessage } from "./api";

export function hardwareSetting(name) {
  try { return localStorage.getItem(`carelink_${name}_ip`) || ""; } catch { return ""; }
}

export default function HardwareActions({ patientId, disabled }) {
  const [busy, setBusy] = useState(""), [message, setMessage] = useState("");
  async function run() {
    const address = hardwareSetting("nfc_writer");
    if (!address) { setMessage("Configure the ESP32 IP in Settings → Hardware first."); return; }
    setBusy("nfc"); setMessage("");
    try {
      await API.post("/esp32/write-nfc", { patient_id: patientId, frontend_origin: window.location.origin, nfc_writer_ip: address });
      setMessage("✅ Wristband programmed!");
    } catch (error) { setMessage(errorMessage(error)); } finally { setBusy(""); }
  }
  return <section><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn btn-outline" disabled={disabled || !!busy} onClick={run}>📡 Write NFC</button></div>
    {message && <p role="status" className="card">{message}<button className="btn btn-ghost" onClick={() => setMessage("")}>Dismiss</button></p>}
    {busy === "nfc" && <div className="hardware-modal" role="dialog" aria-modal="true" aria-label="Write NFC"><div className="card"><h2>Hold the NFC wristband near the reader now…</h2><p role="status">Waiting up to 10 seconds for a tag.</p></div></div>}
  </section>;
}
```


### Modified file: frontend/carelink-app/src/pages/Settings.jsx

```diff
--- a/frontend/carelink-app/src/pages/Settings.jsx
+++ b/frontend/carelink-app/src/pages/Settings.jsx
@@ -1,20 +1,24 @@
 import React, { useState } from "react";
 import { Link } from "react-router-dom";
 import axios from "axios";
 import { normalizeBackend, errorMessage } from "../api";
 import { getConsent, saveConsent, withdrawConsent, clearPatientCache } from "../consent";
 
+import { hardwareSetting } from "../HardwareActions";
+
 const SERVER_LAN_IP = "10.171.182.204";
 const SERVER_URL = `http://${SERVER_LAN_IP}:8000`;
 
 export default function Settings({ onWithdraw }) {
+  const [nfc, setNfc] = useState(() => hardwareSetting("nfc_writer"));
+  const [hardwareMessage, setHardwareMessage] = useState("");
   const [offline, setOffline] = useState(() => !!getConsent()?.offline);
   const [host, setHost] = useState(() => {
     try { return localStorage.getItem("carelink_backend_host") || ""; }
     catch { return ""; }
   });
   const [message, setMessage] = useState("");
   const [busy, setBusy] = useState(false);
 
   async function save(e) {
     e.preventDefault(); setBusy(true);
@@ -45,20 +49,27 @@
             Tap to use {SERVER_LAN_IP}
           </button>
         </div>
         <label htmlFor="backend">Server address</label>
         <input id="backend" className="input" value={host} onChange={e => setHost(e.target.value)} placeholder={`e.g. ${SERVER_URL}`} style={{marginBottom:8}} />
         <p style={{fontSize:13,color:"#666",margin:"0 0 12px"}}>Leave blank when accessing from this PC. On mobile, tap the green button above.</p>
         <button className="btn btn-primary" disabled={busy}>{busy ? "Checking..." : "Save and test connection"}</button>
         {message && <p role="status" style={{marginTop:10,fontWeight:600,color:message.includes("successfully")?"#2e7d32":"#c62828"}}>{message}</p>}
       </form>
 
+      <form className="card settings-card" onSubmit={e => {
+        e.preventDefault();
+        const valid = value => !value.trim() || (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(value.trim()) && value.trim().split(".").length === 4 && value.trim().split(".").every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255));
+        if (!valid(nfc)) { setHardwareMessage("Enter private LAN IPv4 addresses without ports."); return; }
+        try { localStorage.setItem("carelink_nfc_writer_ip", nfc.trim()); setHardwareMessage("Hardware settings saved."); } catch { setHardwareMessage("Unable to save browser settings."); }
+      }}><h2>Hardware</h2><label htmlFor="nfc-ip">ESP32 NFC Writer IP</label><input className="input" id="nfc-ip" value={nfc} onChange={e => setNfc(e.target.value)} placeholder="192.168.1.51" /><button className="btn btn-primary">Save hardware</button><p role="status">{hardwareMessage}</p></form>
+
       <section className="card settings-card">
         <span className="eyebrow">YOU'RE IN CONTROL</span>
         <h2>Privacy &amp; consent</h2>
         <p>Free to use, with no subscription or payment details.</p>
         <label className="consent-choice">
           <input type="checkbox" checked={offline} onChange={e => { try { saveConsent(e.target.checked); setOffline(e.target.checked); setMessage(e.target.checked ? "Offline saving enabled." : "Offline saving disabled."); } catch { setMessage("Unable to save preference."); } }} />
           <span>Save patient journeys on this device</span>
         </label>
         <p>Uploads are processed by your care server, OCR and Google Gemini. Use synthetic records only in this prototype.</p>
         <button className="btn btn-ghost" onClick={() => { try { clearPatientCache(); setMessage("Saved patient data cleared."); } catch { setMessage("Unable to clear browser storage."); } }}>Clear offline patient data</button>
```

### Modified file: backend/app/main.py

```diff
--- a/backend/app/main.py
+++ b/backend/app/main.py
@@ -1,33 +1,34 @@
 import os
 from pathlib import Path
 from fastapi.responses import FileResponse
 from fastapi import HTTPException
 
 from fastapi import FastAPI
 from fastapi.middleware.cors import CORSMiddleware
 from fastapi.staticfiles import StaticFiles
 
 from .config import UPLOAD_DIR
-from .database import engine, Base, upgrade_record_details
-from .routers import patients, records, verification
+from .database import engine, Base, upgrade_record_details, upgrade_patient_phone
+from .routers import patients, records, verification, esp32_bridge, whatsapp_webhook
 
 # Import models so SQLAlchemy knows about all tables
 from . import models
 
 
 # --------------------------------------
 # 1. Create database tables
 # --------------------------------------
 
 Base.metadata.create_all(bind=engine)
 upgrade_record_details(engine)
+upgrade_patient_phone(engine)
 
 
 # --------------------------------------
 # 2. Create FastAPI application
 # --------------------------------------
 
 app = FastAPI(
     title="CareLink Handoff API",
     description=(
         "Consultation-ready patient journey "
@@ -88,20 +89,23 @@
     verification.router,
     prefix="/api/verify",
     tags=["Verification"],
 )
 
 
 # --------------------------------------
 # 7. Root endpoint
 # --------------------------------------
 
+app.include_router(esp32_bridge.router, prefix="/api/esp32", tags=["ESP32"])
+app.include_router(whatsapp_webhook.router, prefix="/api/webhook", tags=["WhatsApp"])
+
 @app.get("/api/health")
 def root():
     return {
         "message": "CareLink Handoff API is running",
         "docs": "/docs",
     }
 
 BUILD_DIR = Path(__file__).resolve().parents[2] / "frontend" / "carelink-app" / "build"
 
 @app.get("/{path:path}", include_in_schema=False)
```

## 4. NFC wristband writing

**How to test:** Configure NFC Writer IP, open a patient through a reachable LAN URL, tap Write NFC and hold an unlocked NTAG215 to the reader; scan it with a phone, then repeat with no tag to check timeout.

**Dependencies:** Arduino: MFRC522 1.4.x and ArduinoJson 7.x. Shared bridge, journey actions and settings are shown under Feature 1 and Shared NFC hardware integration.

### New file: hardware/esp32_firmware/nfc_writer/nfc_writer.ino

```cpp
// Board: ESP32 Dev Module (classic ESP32, not ESP32-C3).
// Libraries: MFRC522 1.4.x, ArduinoJson 7.x; SPI/WiFi/WebServer from ESP32 core.
// RC522: 3.3V ONLY, GND, SS=5, RST=22, SCK=18, MISO=19, MOSI=23.
// Writes writable NTAG215 tags only. Never writes lock/config/password pages.
#include <WiFi.h>
#include <WebServer.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
WebServer server(80);
MFRC522 reader(5, 22);

bool writePage(byte page, byte *data) {
  if (reader.MIFARE_Ultralight_Write(page, data, 4) != MFRC522::STATUS_OK) return false;
  byte verify[18]; byte size = sizeof(verify);
  return reader.MIFARE_Read(page, verify, &size) == MFRC522::STATUS_OK && memcmp(verify, data, 4) == 0;
}

void handleWrite() {
  JsonDocument doc;
  if (server.arg("plain").length() > 1024 || deserializeJson(doc, server.arg("plain"))) { server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}"); return; }
  String url = doc["url"] | "";
  byte prefix = url.startsWith("http://") ? 0x03 : url.startsWith("https://") ? 0x04 : 0;
  if (!prefix || url.length() > 240) { server.send(400, "application/json", "{\"error\":\"HTTP(S) URL required, max 240 bytes\"}"); return; }
  String suffix = url.substring(prefix == 0x03 ? 7 : 8);
  // Short NDEF URI record: MB|ME|SR|TNF=well-known, type U, URI prefix byte.
  byte data[256] = {0};
  unsigned payload = suffix.length() + 1, recordLength = payload + 4;
  data[0] = 0x03; data[1] = recordLength; // NDEF TLV
  data[2] = 0xd1; data[3] = 1; data[4] = payload; data[5] = 0x55; data[6] = prefix;
  memcpy(data + 7, suffix.c_str(), suffix.length());
  unsigned total = 7 + suffix.length(); data[total++] = 0xfe;
  unsigned pages = (total + 3) / 4;
  unsigned long start = millis();
  while (millis() - start < 10000) {
    if (reader.PICC_IsNewCardPresent() && reader.PICC_ReadCardSerial()) {
      String tag;
      for (byte i = 0; i < reader.uid.size; i++) { if (reader.uid.uidByte[i] < 16) tag += '0'; tag += String(reader.uid.uidByte[i], HEX); }
      // NTAG215 capability container advertises 0x3e * 8 bytes; reject other tags.
      byte cc[18]; byte size = sizeof(cc);
      bool ok = reader.MIFARE_Read(3, cc, &size) == MFRC522::STATUS_OK && cc[0] == 0xe1 && cc[2] == 0x3e && (cc[3] & 0x0f) == 0;
      byte empty[4] = {0x03, 0, 0xfe, 0};
      if (ok) ok = writePage(4, empty); // Invalidate old NDEF until write succeeds.
      for (unsigned i = 1; ok && i < pages; ++i) ok = writePage(4 + i, data + 4 * i);
      if (ok) ok = writePage(4, data); // Publish length last.
      reader.PICC_HaltA(); reader.PCD_StopCrypto1();
      if (ok) server.send(200, "application/json", "{\"status\":\"written\",\"tag_id\":\"" + tag + "\"}");
      else server.send(400, "application/json", "{\"error\":\"Use an unlocked NTAG215 and hold it steady\"}");
      return;
    }
    delay(30);
  }
  server.send(200, "application/json", "{\"status\":\"timeout\"}");
}

void setup() {
  Serial.begin(115200); SPI.begin(18, 19, 23, 5); reader.PCD_Init();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print('.'); }
  Serial.println(WiFi.localIP()); server.on("/write", HTTP_POST, handleWrite); server.begin();
}
void loop() { server.handleClient(); }
```

## 5. WhatsApp image ingestion

**How to test:** Configure Twilio and the public webhook URL, create a synthetic patient with a WhatsApp number, send a record image with its ID prefix, and verify a single journey record and reply.

**Dependencies:** requirements.txt additions: requests>=2.32.3,<3 and twilio>=9,<10. Twilio 9.12.0 was installed into the project virtual environment.

**Router registration in main.py:**

```python
app.include_router(whatsapp_webhook.router, prefix="/api/webhook", tags=["WhatsApp"])
```

### New file: backend/app/routers/whatsapp_webhook.py

```python
import io
import logging
import os
import re
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.datastructures import Headers
from starlette.concurrency import run_in_threadpool
from ..database import get_db, SessionLocal
from ..models import Patient, WhatsAppReceipt
from ..services.whatsapp_service import download_image, send_whatsapp_reply
from ..services.journey_links import journey_url
from .records import upload_and_extract

router = APIRouter()
logger = logging.getLogger(__name__)


def normalize_phone(value):
    return re.sub(r"\D", "", value or "")


def match_patient(db, sender, body):
    # Explicit IDs take precedence. Never fall through to a different patient on typo.
    token = (body or "").strip().split(maxsplit=1)[0] if (body or "").strip() else ""
    patients = db.query(Patient).all()
    if token and (token.upper().startswith("P-") or re.fullmatch(r"[0-9a-fA-F-]{4,36}", token)):
        prefix = token[2:] if token.upper().startswith("P-") else token
        matches = [p for p in patients if len(prefix) >= 4 and p.id.lower().startswith(prefix.lower())]
    else:
        number = normalize_phone(sender)
        matches = [p for p in patients if number and normalize_phone(p.phone_number) == number]
    return matches[0] if len(matches) == 1 else None


async def ingest(sid, sender, patient_id, media_url):
    with SessionLocal() as db:
        receipt = db.get(WhatsAppReceipt, sid)
        try:
            patient = db.get(Patient, patient_id)
            if not patient:
                raise ValueError("Patient no longer exists")
            url = journey_url(patient_id)
            content, mime = await run_in_threadpool(download_image, media_url)
            file = UploadFile(io.BytesIO(content), filename="whatsapp.png" if mime == "image/png" else "whatsapp.jpg", headers=Headers({"content-type": mime}))
            result = await upload_and_extract(patient_id, file, db)
            receipt.record_id = result["record_id"]
            receipt.status = "saved"
            db.commit()
            reply = f"✅ Record added to {patient.name}'s journey. Visit: {url}"
            if result["confidence"] < 0.5:
                reply = f"⚠️ Image was unclear. Record saved for review. Visit: {url}"
        except Exception:
            db.rollback()
            receipt = db.get(WhatsAppReceipt, sid)
            receipt.status = "failed"
            db.commit()
            logger.exception("WhatsApp extraction failed")
            reply = "Unable to extract this image. Please send a clearer JPEG or PNG with the Patient ID."
        try:
            await run_in_threadpool(send_whatsapp_reply, sender, reply)
        except Exception:
            logger.exception("WhatsApp reply failed; ingestion status retained")


@router.post("/whatsapp")
async def whatsapp(request: Request, background: BackgroundTasks, db: Session = Depends(get_db)):
    # Lazy import keeps the rest of CareLink usable before optional SDK installation.
    try:
        from twilio.request_validator import RequestValidator
    except ImportError:
        raise HTTPException(503, "Install the Twilio SDK from requirements.txt")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    if not token or not os.getenv("TWILIO_ACCOUNT_SID"):
        raise HTTPException(503, "Twilio credentials are not configured")
    form = await request.form()
    public_url = os.getenv("TWILIO_WEBHOOK_URL") or str(request.url)
    if not RequestValidator(token).validate(public_url, form, request.headers.get("X-Twilio-Signature", "")):
        raise HTTPException(403, "Invalid Twilio signature")
    sender, body, media = form.get("From", ""), form.get("Body", ""), form.get("MediaUrl0")
    sid = form.get("MessageSid", "")
    if not re.fullmatch(r"[A-Z]{2}[0-9a-fA-F]{32}", sid):
        raise HTTPException(400, "Missing or invalid MessageSid")
    if db.get(WhatsAppReceipt, sid):
        return Response("<Response/>", media_type="application/xml")
    patient = match_patient(db, sender, body)
    if not patient or not media:
        return Response("<Response><Message>Reply with your Patient ID (e.g. P-0417) followed by the image. Use the ID shown on your journey.</Message></Response>", media_type="application/xml")
    db.add(WhatsAppReceipt(id=sid, patient_id=patient.id, status="processing"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return Response("<Response/>", media_type="application/xml")
    background.add_task(ingest, sid, sender, patient.id, media)
    # Acknowledge immediately; OCR may exceed Twilio's webhook response timeout.
    return Response("<Response/>", media_type="application/xml")
```

### New file: backend/app/services/whatsapp_service.py

```python
import os
from urllib.parse import urlsplit
import requests


def send_whatsapp_reply(to: str, body: str):
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    response = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
        auth=(sid, os.environ["TWILIO_AUTH_TOKEN"]),
        data={"To": to, "From": os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886"), "Body": body},
        timeout=20,
    )
    response.raise_for_status()


def download_image(url: str):
    """Bounded authenticated Twilio media fetch; never forward credentials on redirects."""
    from ..routers.records import MAX_UPLOAD_SIZE, ALLOWED_IMAGE_TYPES
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    token = os.environ["TWILIO_AUTH_TOKEN"]
    for hop in range(4):
        parsed = urlsplit(url)
        host = parsed.hostname or ""
        twilio = host == "api.twilio.com" or host.endswith(".twilio.com")
        storage = host.endswith(".amazonaws.com")
        if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in (None, 443) or not (twilio or (hop > 0 and storage)):
            raise ValueError("Invalid Twilio media URL")
        with requests.get(url, auth=(sid, token) if twilio else None, timeout=25, stream=True, allow_redirects=False) as response:
            if response.is_redirect:
                from urllib.parse import urljoin
                url = urljoin(url, response.headers["Location"])
                continue
            response.raise_for_status()
            mime = response.headers.get("Content-Type", "").split(";")[0].strip()
            if mime not in ALLOWED_IMAGE_TYPES:
                raise ValueError("Send a JPEG or PNG image")
            data = bytearray()
            for chunk in response.iter_content(65536):
                data.extend(chunk)
                if len(data) > MAX_UPLOAD_SIZE:
                    raise ValueError("Image must be 10 MB or smaller")
            return bytes(data), mime
    raise ValueError("Too many media redirects")
```

### New file: backend/tests/test_remaining_features.py

```python
import io
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch, AsyncMock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from twilio.request_validator import RequestValidator
from app.database import Base, get_db, upgrade_patient_phone
from app.models import Patient, Record, ExtractedFact, WhatsAppReceipt

sys.modules.setdefault("app.services.ocr_service", MagicMock())
from app.routers import records, verification, esp32_bridge, whatsapp_webhook


class RemainingFeaturesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        app = FastAPI()
        for router, prefix in [(records.router, "records"), (verification.router, "verify"), (esp32_bridge.router, "esp32"), (whatsapp_webhook.router, "webhook")]:
            app.include_router(router, prefix=f"/api/{prefix}")
        def db():
            with self.sessions() as session:
                yield session
        app.dependency_overrides[get_db] = db
        self.client = TestClient(app)
        with self.sessions() as db:
            db.add(Patient(id="0417abcd", name="Demo Patient", age=25, gestational_week=22, phone_number="+91 98765 43210"))
            db.commit()
        self.folder = tempfile.TemporaryDirectory(dir="uploads")
        image = io.BytesIO(); Image.new("RGB", (20, 20)).save(image, "PNG")
        self.image = image.getvalue()
        self.extracted = {"visit_date": "2026-09-09", "facility_name": "Demo Clinic", "gestational_week": 22, "pending_items": ["Follow up"], "_confidence": 0.6}
        self.patches = [patch.object(records, "UPLOAD_DIR", self.folder.name), patch.object(records, "extract_text_from_image", return_value="Demo"), patch.object(records, "extract_facts_from_image", return_value=self.extracted)]
        for p in self.patches: p.start()

    def tearDown(self):
        for p in reversed(self.patches): p.stop()
        self.client.close(); self.folder.cleanup(); self.engine.dispose()

    def upload(self, stream=False):
        return self.client.post(f"/api/records/{'upload-stream' if stream else 'upload'}/0417abcd", files={"file": ("demo.png", self.image, "image/png")})

    def test_stream_order_and_same_persistence(self):
        response = self.upload(True)
        self.assertEqual(response.status_code, 200)
        events = [block.splitlines() for block in response.text.strip().split("\n\n")]
        self.assertEqual([e[0] for e in events[:2]], ["event: status"] * 2)
        self.assertEqual(json.loads(events[0][1][6:])["step"], "ocr")
        self.assertEqual(json.loads(events[1][1][6:])["step"], "extract")
        self.assertEqual(events[-1][0], "event: done")
        result = json.loads(events[-1][1][6:])
        with self.sessions() as db:
            self.assertEqual(db.query(Record).count(), 1)
            self.assertEqual(db.get(ExtractedFact, result["fact_id"]).facility_name, "Demo Clinic")

    def test_voice_boost_and_zero_confidence(self):
        result = self.upload().json()
        reply = self.client.post(f"/api/verify/{result['fact_id']}/confirm", json={"source_type": "patient_voice", "value": "Demo Clinic"})
        self.assertAlmostEqual(reply.json()["confidence"], 0.75)
        with self.sessions() as db:
            fact = db.get(ExtractedFact, result["fact_id"])
            self.assertIn("patient_voice", fact.verified_by)
            fact.confidence = 0; db.commit()
        self.assertAlmostEqual(self.client.post(f"/api/verify/{result['fact_id']}/confirm", json={"source_type": "patient_voice"}).json()["confidence"], 0.15)

    def test_stream_failure_saves_no_fact(self):
        with patch.object(records, "extract_facts_from_image", return_value={"_confidence": 0, "_error": "Unreadable"}):
            response = self.upload(True)
        self.assertIn("event: error", response.text)
        self.assertNotIn("event: done", response.text)
        with self.sessions() as db: self.assertEqual(db.query(Record).count(), 0)

    def test_nfc_hardware_errors(self):
        response = self.client.post("/api/esp32/write-nfc", json={"patient_id": "0417abcd", "nfc_writer_ip": "127.0.0.1", "frontend_origin": "http://192.168.1.2:3000"})
        self.assertEqual(response.status_code, 400)
        with patch.object(esp32_bridge, "forward", new=AsyncMock(return_value={"status": "written", "tag_id": "ab"})) as send:
            response = self.client.post("/api/esp32/write-nfc", json={"patient_id": "0417abcd", "nfc_writer_ip": "192.168.1.5", "frontend_origin": "http://192.168.1.2:3000"})
            self.assertEqual(response.json()["status"], "written")
            self.assertEqual(send.call_args.args[2]["url"], "http://192.168.1.2:3000/patient/0417abcd")

    def test_whatsapp_signature_ingestion_and_replay(self):
        form = {"From": "whatsapp:+919876543210", "Body": "P-0417", "MediaUrl0": "https://api.twilio.com/media", "MessageSid": "SM" + "a" * 32}
        url = "http://testserver/api/webhook/whatsapp"
        signature = RequestValidator("test-token").compute_signature(url, form)
        with patch.dict(os.environ, {"TWILIO_AUTH_TOKEN": "test-token", "TWILIO_ACCOUNT_SID": "test-sid", "TWILIO_WEBHOOK_URL": url}), patch.object(whatsapp_webhook, "SessionLocal", self.sessions), patch.object(whatsapp_webhook, "download_image", return_value=(self.image, "image/png")), patch.object(whatsapp_webhook, "send_whatsapp_reply") as reply:
            self.assertEqual(self.client.post(url, data=form).status_code, 403)
            for _ in range(2):
                self.assertEqual(self.client.post(url, data=form, headers={"X-Twilio-Signature": signature}).status_code, 200)
            reply.assert_called_once()
        with self.sessions() as db:
            self.assertEqual(db.query(Record).count(), 1)
            self.assertEqual(db.get(WhatsAppReceipt, form["MessageSid"]).status, "saved")
            self.assertIsNone(whatsapp_webhook.match_patient(db, form["From"], "P-ffff"))
            self.assertEqual(whatsapp_webhook.match_patient(db, form["From"], "").id, "0417abcd")

    def test_phone_migration_is_repeatable(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE patients (id VARCHAR PRIMARY KEY, name VARCHAR)"))
            connection.execute(text("INSERT INTO patients VALUES ('old', 'Existing')"))
        upgrade_patient_phone(engine); upgrade_patient_phone(engine)
        self.assertIn("phone_number", [c["name"] for c in inspect(engine).get_columns("patients")])
        with engine.connect() as connection:
            self.assertEqual(connection.execute(text("SELECT name FROM patients")).scalar(), "Existing")
        engine.dispose()
```

### Modified file: backend/app/models.py

```diff
--- a/backend/app/models.py
+++ b/backend/app/models.py
@@ -7,20 +7,21 @@
 
 def generate_uuid():
     return str(uuid.uuid4())
 
 
 class Patient(Base):
     __tablename__ = "patients"
 
     id = Column(String, primary_key=True, default=generate_uuid)
     name = Column(String, nullable=False)
+    phone_number = Column(String, nullable=True)
     age = Column(Integer)
     gestational_week = Column(Integer)
     created_at = Column(DateTime, default=datetime.utcnow)
 
     # Relationships
     records = relationship("Record", back_populates="patient")
     facts = relationship("ExtractedFact", back_populates="patient")
 
 
 class Record(Base):
@@ -69,10 +70,19 @@
 
 
 class Verification(Base):
     __tablename__ = "verifications"
 
     id = Column(String, primary_key=True, default=generate_uuid)
     fact_id = Column(String, ForeignKey("extracted_facts.id"), nullable=False)
     source_type = Column(String, nullable=False)
     value = Column(String)
     verified_at = Column(DateTime, default=datetime.utcnow)
+
+
+class WhatsAppReceipt(Base):
+    __tablename__ = "whatsapp_receipts"
+    id = Column(String, primary_key=True)
+    patient_id = Column(String, nullable=False)
+    record_id = Column(String, nullable=True)
+    status = Column(String, nullable=False)
+    created_at = Column(DateTime, default=datetime.utcnow)
```

### Modified file: backend/app/database.py

```diff
--- a/backend/app/database.py
+++ b/backend/app/database.py
@@ -30,10 +30,17 @@
 def get_db():
     """
     Creates a database session for each API request.
     FastAPI calls this automatically.
     """
     db = SessionLocal()
     try:
         yield db
     finally:
         db.close()
+
+
+def upgrade_patient_phone(bind):
+    columns = {column["name"] for column in inspect(bind).get_columns("patients")}
+    if "phone_number" not in columns:
+        with bind.begin() as connection:
+            connection.execute(text("ALTER TABLE patients ADD COLUMN phone_number VARCHAR"))
```

### Modified file: backend/app/schemas.py

```diff
--- a/backend/app/schemas.py
+++ b/backend/app/schemas.py
@@ -2,29 +2,31 @@
 from typing import Optional, List
 from datetime import datetime
 
 
 # ----- Patient -----
 
 class PatientCreate(BaseModel):
     name: str
     age: int
     gestational_week: int
+    phone_number: str | None = None
 
 
 class PatientResponse(BaseModel):
     model_config = ConfigDict(from_attributes=True)
 
     id: str
     name: str
     age: int
     gestational_week: int
+    phone_number: str | None = None
     created_at: datetime
     record_count: int = 0
     conflict_count: int = 0
     pending_count: int = 0
 
 
 # ----- Extracted Fact -----
 
 class FactResponse(BaseModel):
     model_config = ConfigDict(from_attributes=True)
```

### Modified file: backend/app/routers/patients.py

```diff
--- a/backend/app/routers/patients.py
+++ b/backend/app/routers/patients.py
@@ -24,20 +24,21 @@
 
 @router.post("/", response_model=PatientResponse)
 def create_patient(
     patient: PatientCreate,
     db: Session = Depends(get_db)
 ):
     """Create a new patient."""
 
     db_patient = Patient(
         name=patient.name,
+        phone_number=patient.phone_number,
         age=patient.age,
         gestational_week=patient.gestational_week,
     )
 
     db.add(db_patient)
     db.commit()
     db.refresh(db_patient)
 
     return db_patient
```

### Modified file: frontend/carelink-app/src/pages/Dashboard.jsx

```diff
--- a/frontend/carelink-app/src/pages/Dashboard.jsx
+++ b/frontend/carelink-app/src/pages/Dashboard.jsx
@@ -3,20 +3,21 @@
 import API, { readCache, writeCache, removeCache, errorMessage } from "../api";
 
 function Dashboard() {
   const [patients, setPatients]   = useState([]);
   const [loading, setLoading]     = useState(true);
   const [showForm, setShowForm]   = useState(false);
   const [search, setSearch]       = useState("");
   const [name, setName]           = useState("");
   const [age, setAge]             = useState("");
   const [week, setWeek]           = useState("");
+  const [phone, setPhone] = useState("");
   const [creating, setCreating]   = useState(false);
   const [error, setError]         = useState(null);
   const navigate = useNavigate();
   const touchStart = useRef(null);
 
   const loadPatients = useCallback(async () => {
     try {
       setLoading(true);
       setError(null);
       const res = await API.get("/patients/");
@@ -31,24 +32,24 @@
     }
   }, []);
 
   useEffect(() => { loadPatients(); }, [loadPatients]);
 
   const createPatient = async (e) => {
     e.preventDefault();
     setCreating(true);
     try {
       await API.post("/patients/", {
-        name: name.trim(), age: parseInt(age), gestational_week: parseInt(week),
+        ...(phone.trim() ? { phone_number: phone.trim() } : {}), name: name.trim(), age: parseInt(age), gestational_week: parseInt(week),
       });
       setShowForm(false);
-      setName(""); setAge(""); setWeek("");
+      setName(""); setAge(""); setWeek(""); setPhone("");
       loadPatients();
     } catch (err) {
       setError(errorMessage(err));
     } finally {
       setCreating(false);
     }
   };
 
   const deletePatient = async (e, patientId) => {
     e.stopPropagation();
@@ -155,20 +156,21 @@
               />
               <input
                 className="input"
                 aria-label="Gest. Week" placeholder="Gest. Week"
                 type="number" min="1" max="42"
                 value={week}
                 onChange={e => setWeek(e.target.value)}
                 required
               />
             </div>
+            <label htmlFor="whatsapp-number">WhatsApp number (optional)</label><input id="whatsapp-number" type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
             <div style={{ display: "flex", gap: 8 }}>
               <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
               <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={creating}>
                 {creating ? "Creating..." : "✓ Create Patient"}
               </button>
             </div>
           </form>
         </div>
       )}
```

### Modified file: backend/requirements.txt

```diff
--- a/backend/requirements.txt
+++ b/backend/requirements.txt
@@ -3,10 +3,12 @@
 SQLAlchemy==2.1.4
 pydantic==2.14.1
 python-dotenv==1.2.4
 python-multipart==0.0.32
 Pillow==12.3.0
 qrcode[pil]==8.2
 paddleocr==2.10.0
 paddlepaddle==3.1.1
 google-genai==2.30.1
 httpx==0.28.1
+requests>=2.32.3,<3
+twilio>=9,<10
```

### Modified file: backend/.env.example

```diff
--- a/backend/.env.example
+++ b/backend/.env.example
@@ -1,2 +1,8 @@
 GEMINI_API_KEY=paste_your_actual_key_here
 GEMINI_MODEL=gemini-3.8-flash
+TWILIO_ACCOUNT_SID=
+TWILIO_AUTH_TOKEN=
+TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
+FRONTEND_URL=http://localhost:3000
+# Exact public HTTPS webhook URL, required behind a tunnel/reverse proxy:
+TWILIO_WEBHOOK_URL=
```


### New file: backend/app/services/journey_links.py

```python
import os
from urllib.parse import urlsplit
from fastapi import HTTPException


def journey_url(patient_id, origin=None):
    origin = origin or os.getenv("FRONTEND_URL", "http://localhost:3000")
    parsed = urlsplit(origin)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.username or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        raise HTTPException(400, "Invalid frontend origin")
    return f"{origin.rstrip('/')}/patient/{patient_id}"

```
