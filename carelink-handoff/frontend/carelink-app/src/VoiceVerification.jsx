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
