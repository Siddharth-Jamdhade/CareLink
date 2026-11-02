import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { normalizeBackend, errorMessage } from "../api";
import { withdrawConsent, clearPatientCache } from "../consent";

import { hardwareSetting } from "../HardwareActions";

const SERVER_LAN_IP = "10.171.182.204";
const SERVER_URL = `http://${SERVER_LAN_IP}:8000`;

export default function Settings({ onWithdraw }) {
  const [nfc, setNfc] = useState(() => hardwareSetting("nfc_writer"));
  const [hardwareMessage, setHardwareMessage] = useState("");
  const [host, setHost] = useState(() => {
    try { return localStorage.getItem("carelink_backend_host") || ""; }
    catch { return ""; }
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault(); setBusy(true);
    try {
      const origin = normalizeBackend(host);
      localStorage.setItem("carelink_backend_host", host.trim());
      setMessage("Address saved. Checking connection...");
      await axios.get(`${origin}/api/health`, { timeout: 8000 });
      setMessage("Connected successfully!");
    } catch (err) {
      setMessage(err.response || err.request ? `Address saved. ${errorMessage(err)}` : err.message);
    } finally { setBusy(false); }
  }

  return (
    <main className="container">
      <Link to="/dashboard">Back to Patients</Link>
      <header className="section-heading"><h1>Settings</h1><p>Your connection, wherever care happens.</p></header>

      <form className="card settings-card" onSubmit={save}>
        <h2>Backend connection</h2>
        <div style={{background:"#e8f5e9",border:"2px solid #4caf50",borderRadius:10,padding:"14px 18px",marginBottom:18}}>
          <p style={{margin:0,fontWeight:700,fontSize:16}}>📱 Connecting from your phone?</p>
          <p style={{margin:"8px 0 12px",fontSize:14}}>
            Your PC Wi-Fi IP is: <code style={{background:"#fff",padding:"3px 10px",borderRadius:4,fontWeight:700,fontSize:16,border:"1px solid #4caf50"}}>{SERVER_LAN_IP}</code>
          </p>
          <button type="button" className="btn btn-primary" style={{fontSize:14,padding:"8px 18px"}} onClick={() => setHost(SERVER_URL)}>
            Tap to use {SERVER_LAN_IP}
          </button>
        </div>
        <label htmlFor="backend">Server address</label>
        <input id="backend" className="input" value={host} onChange={e => setHost(e.target.value)} placeholder={`e.g. ${SERVER_URL}`} style={{marginBottom:8}} />
        <p style={{fontSize:13,color:"#666",margin:"0 0 12px"}}>Leave blank when accessing from this PC. On mobile, tap the green button above.</p>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Checking..." : "Save and test connection"}</button>
        {message && <p role="status" style={{marginTop:10,fontWeight:600,color:message.includes("successfully")?"#2e7d32":"#c62828"}}>{message}</p>}
      </form>

      <form className="card settings-card" onSubmit={e => {
        e.preventDefault();
        const valid = value => !value.trim() || (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(value.trim()) && value.trim().split(".").length === 4 && value.trim().split(".").every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255));
        if (!valid(nfc)) { setHardwareMessage("Enter private LAN IPv4 addresses without ports."); return; }
        try { localStorage.setItem("carelink_nfc_writer_ip", nfc.trim()); setHardwareMessage("Hardware settings saved."); } catch { setHardwareMessage("Unable to save browser settings."); }
      }}><h2>Hardware</h2><label htmlFor="nfc-ip">ESP32 NFC Writer IP</label><input className="input" id="nfc-ip" value={nfc} onChange={e => setNfc(e.target.value)} placeholder="192.168.1.51" /><button className="btn btn-primary">Save hardware</button><p role="status">{hardwareMessage}</p></form>

      <section className="card settings-card">
        <span className="eyebrow">YOU'RE IN CONTROL</span>
        <h2>Privacy &amp; consent</h2>
        <p>Free to use, with no subscription or payment details.</p>
        <p>Offline patient storage is disabled. Records require an authenticated server connection.</p>
        <p>Uploads are processed by your care server, OCR and Google Gemini. Use synthetic records only in this prototype.</p>
        <button className="btn btn-ghost" onClick={() => { try { clearPatientCache(); setMessage("Saved patient data cleared."); } catch { setMessage("Unable to clear browser storage."); } }}>Clear offline patient data</button>
        <p>Withdrawing closes the workspace and clears local patient data. Server records remain.</p>
        <button className="btn btn-outline" onClick={() => { if (window.confirm("Withdraw consent and clear patient data saved on this device? Server records will remain.")) { try { withdrawConsent(); onWithdraw(); } catch { setMessage("Unable to clear storage. Clear site data in browser settings."); } } }}>Withdraw consent</button>
        <p role="status">{message}</p>
      </section>

      <section className="card settings-card">
        <h2>Ready for demo day</h2>
        <p>Keep your phone and PC on the same Wi-Fi. Backend runs on 0.0.0.0:8000 so phones can reach it over the network.</p>
        <p>Gallery upload works when live camera is unavailable. Live camera requires HTTPS or localhost.</p>
        <p>CareLink 1.0.0</p>
      </section>
    </main>
  );
}
