import React, { useState } from "react";
import API, { errorMessage } from "./api";

export function hardwareSetting(name) {
  try { return localStorage.getItem(`carelink_${name}_ip`) || ""; } catch { return ""; }
}

export function CloudNfcLink({ patientId }) {
  const [link, setLink] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
  async function prepare() {
    setBusy(true); setError(''); setCopied(false);
    try { const result = await API.get(`/patients/${patientId}/nfc-link`); setLink(result.data); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <section><h3>NFC patient band</h3><p>The band opens the latest cloud history and consultation summary. The reader must sign in with permission for this patient.</p><button disabled={busy} onClick={prepare}>{busy ? 'Preparing link…' : 'Prepare NFC band link'}</button>{link && <><label>Write this as an NDEF URL on the band<input aria-label="NFC band URL" readOnly value={link.url} onFocus={e => e.target.select()} /></label><button onClick={async () => { try { await navigator.clipboard.writeText(link.url); setCopied(true); } catch { setError('Select and copy the URL above.'); } }}>Copy NFC link</button>{copied && <p role="status">Link copied. Write it using an NFC-capable phone or nearby reader.</p>}<p>{link.instructions}</p></>}{error && <p role="alert">{error}</p>}</section>;
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
  return <section><CloudNfcLink key={patientId} patientId={patientId} /><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn btn-outline" disabled={disabled || !!busy} onClick={run}>📡 Write NFC using local ESP32</button></div>
    {message && <p role="status" className="card">{message}<button className="btn btn-ghost" onClick={() => setMessage("")}>Dismiss</button></p>}
    {busy === "nfc" && <div className="hardware-modal" role="dialog" aria-modal="true" aria-label="Write NFC"><div className="card"><h2>Hold the NFC wristband near the reader now…</h2><p role="status">Waiting up to 10 seconds for a tag.</p></div></div>}
  </section>;
}
