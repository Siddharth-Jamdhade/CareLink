import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { errorMessage } from "../api";
import RecordDetails from "../RecordDetails";
import { streamExtraction } from "../streamExtraction";
const FIELD_LABELS = { visit_date: "Visit Date", facility_name: "Facility", document_type: "Document", gestational_week: "Week" };
function fieldValue(field, value) {
  if (field === "visit_date" && /^\d{4}-\d{2}-\d{2}$/.test(value || "")) return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return Array.isArray(value) ? value.join(", ") : String(value ?? "Not found");
}
export default function CameraCapture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const video = useRef(null), stream = useRef(null), active = useRef(true), request = useRef(null), locked = useRef(false);
  const [streaming, setStreaming] = useState(false), [loading, setLoading] = useState(false), [result, setResult] = useState(null), [error, setError] = useState("");
  const [progress, setProgress] = useState({ message: "Uploading image...", fields: {} });
  function onProgress(event, data) {
    if (!active.current) return;
    if (event === "status") setProgress(p => ({ ...p, message: data.message }));
    if (event === "field") setProgress(p => ({ ...p, fields: { ...p.fields, [data.field]: data.value } }));
  }
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
        setProgress({ message: "Uploading image...", fields: {} });
        request.current = new AbortController();
        try {
          const response = await streamExtraction(id, form, request.current.signal, onProgress);
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
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Live camera requires HTTPS or localhost. Choose an image from your gallery below.");
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!active.current) { camera.getTracks().forEach(t => t.stop()); return; }
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
    setProgress({ message: "Uploading image...", fields: {} });
        request.current = new AbortController();
    try { const response = await streamExtraction(id, form, request.current.signal, onProgress); if (active.current) setResult(response.data); }
    catch (err) { if (active.current) setError(err.message || errorMessage(err)); }
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
    {loading && <section className="processing card" role="status"><div className="spinner" /><h2>{progress.message}</h2><div aria-live="polite">{Object.entries(progress.fields).map(([field, value]) => <p className="live-field" key={field}><strong>{FIELD_LABELS[field] || field.replaceAll("_", " ")}: </strong>{fieldValue(field, value)} ✓</p>)}</div><small>This may take a minute. Keep this page open.</small></section>}
    {result && <section className="animate-in"><div className="section-heading"><span className="badge badge-unverified">Review required</span><h2>Record added to the journey</h2><p>Check the extracted fields against the source document.</p></div><RecordDetails data={result.extracted_data} /><div className="stats-row"><div className="stat-card"><div className="num">{Math.round((result.confidence || 0) * 100)}%</div><div className="label">Extraction confidence</div></div><div className="stat-card"><div className="num">{result.conflicts?.length || 0}</div><div className="label">Conflicts to review</div></div></div><div className="capture-actions"><button className="btn btn-primary" onClick={() => navigate(`/patient/${id}`)}>View full journey</button><button className="btn btn-ghost" onClick={() => { setResult(null); setAuthorized(false); }}>Add another record</button></div></section>}
  </main>;
}
