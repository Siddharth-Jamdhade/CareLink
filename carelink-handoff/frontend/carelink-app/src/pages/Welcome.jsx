import React, { useState } from "react";
import { FiHeart, FiFileText, FiShield, FiArrowRight } from "react-icons/fi";
import { saveConsent } from "../consent";

export default function Welcome({ onAccept }) {
  const [accepted, setAccepted] = useState(false);
  const offline = false;
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState("");
  function proceed(e) {
    e.preventDefault();
    if (!accepted) return;
    try { onAccept(saveConsent(offline)); }
    catch { setError("Your browser could not save your choice. Enable site storage and try again."); }
  }
  return <main className="welcome">
    <div className="welcome-brand"><span className="app-symbol"><FiHeart /></span> CareLink <span className="free-label">FREE TO USE</span></div>
    <section className="welcome-hero">
      <span className="eyebrow">CONNECTED MATERNAL CARE</span>
      <h1>Every visit.<br />One connected<br /><em>care journey.</em></h1>
      <p>Keep records together, prepare for the next consultation, and make every handoff clearer.</p>
      <div className="journey-preview" aria-hidden="true"><span className="preview-icon"><FiFileText /></span><div><strong>A little clarity. A lot of care.</strong><p>Capture → Review → Continue care</p></div><FiHeart /></div>
    </section>
    <form className="consent-card" onSubmit={proceed}>
      <span className="eyebrow"><FiShield /> YOUR CHOICE, FIRST</span>
      <h2>Let’s start with your consent</h2>
      <p>CareLink sends patient details and records to your configured care server. Record uploads use OCR and Google Gemini to extract information. A health worker must review the results.</p>
      <details><summary>Understand how your information is used</summary><p>Names, age, pregnancy week, uploaded images and extracted fields are stored on the server. A record’s image and text may be sent to Google Gemini for processing. Camera access is requested only when you tap Start camera; microphone and location are not requested.</p><p>Patient records are available online to signed-in patients and assigned care workers. Patient data is not saved offline. Withdrawing device consent clears old local caches; server records remain with the care team.</p><p>Use synthetic records until clinical and deployment reviews are complete.</p></details>
      <label className="consent-choice"><input type="checkbox" checked={accepted} onChange={e => { setAccepted(e.target.checked); setDeclined(false); }} /><span><strong>I understand and agree to this use</strong><small>Required to open the care workspace.</small></span></label>

      {error && <p role="alert" className="alert alert-danger">{error}</p>}
      {declined && <p role="status" className="alert alert-info">Your choice is respected. The workspace stays closed and no patient data is requested. You can return whenever you’re ready.</p>}
      <button className="btn btn-primary welcome-continue" disabled={!accepted}>Agree and continue <FiArrowRight /></button>
      <button type="button" className="decline-button" onClick={() => { setAccepted(false); setDeclined(true); }}>Not now</button>
      <p className="welcome-footnote">No subscription. No payment details. Your choices stay in your control.</p>
    </form>
  </main>;
}
