import React, { useState, useEffect, useCallback, useContext } from "react";
import { AccountContext } from "../mobile/AuthGate";
import { useParams, useNavigate } from "react-router-dom";
import API, { backendOrigin, readCache, writeCache, removeCache, errorMessage } from "../api";
import RecordDetails from "../RecordDetails";

import HardwareActions from "../HardwareActions";
import VoiceVerification from "../VoiceVerification";

const STATUS_COLORS = {
  verified: { bg: "#E0FFF5", dot: "#2ED573", text: "#00795A", label: "✓ Verified" },
  unverified: { bg: "#FFF3E0", dot: "#FFA502", text: "#E65100", label: "⏳ Confirm" },
  conflict: { bg: "#FFE8EA", dot: "#FF4757", text: "#C0392B", label: "⚡ Conflict" },
  missing: { bg: "#F0F0F5", dot: "#A4B0CC", text: "#5C6B8A", label: "? Missing" },
};

function PatientJourney() {
  const account = useContext(AccountContext);
  const canVerify = account?.role !== 'patient';
  const { id } = useParams();
  const navigate = useNavigate();
  const [journey, setJourney] = useState(null);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const loadJourney = useCallback(async () => {
    try {
      setError("");
      const res = await API.get(`/patients/${id}/journey`);
      setJourney(res.data); setOffline(false);
      writeCache(`journey-${id}`, res.data);
    } catch (err) {
      setError(errorMessage(err)); setOffline(true);
      if (err.response?.status === 404) { removeCache(`journey-${id}`); setJourney(null); }
      else setJourney(readCache(`journey-${id}`));
    }
  }, [id]);
  useEffect(() => { setJourney(null); loadJourney(); }, [loadJourney]);
  const confirmFact = async (factId, conflict = false) => {
    if (conflict && !window.confirm("Use this record as the verified source? Linked conflicting records will be marked for review.")) return;
    setBusy(true);
    try {
      await API.post(`/verify/${factId}/${conflict ? "resolve-conflict" : "confirm"}`, conflict ? undefined : { source_type: "health_worker", value: "confirmed" });
      await loadJourney();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  if (!journey) return <main className="container"><button className="btn btn-ghost" onClick={() => navigate("/dashboard")}>← Patients</button><p role="status">{error || "Loading patient journey…"}</p>{error && <button className="btn btn-primary" onClick={loadJourney}>Retry</button>}</main>;
  function parseList(value) { try { const items = JSON.parse(value || "[]"); return Array.isArray(items) ? items : []; } catch { return []; } }

  function renderJourney(data) {
    const p = data.patient;
    return (
      <div className="container">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <button className="btn btn-ghost" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer", fontSize: 18, color: "#6C3CE1" }}>← Back</button>
          <span style={{ fontSize: 12, color: "#A4B0CC" }}>{offline && "📴 Offline"}</span>
        </div>

        <div className="patient-header" style={{ background: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{p.name}</h2>
          <p style={{ color: "#5C6B8A", fontSize: 13 }}>Age {p.age} · Week {p.gestational_week} · ID: {p.id.slice(0, 8)}</p>
        </div>

        {error && <div className="alert alert-warning" role="alert">{error} {offline && "Showing saved data; changes are disabled."}<button onClick={loadJourney}>Retry</button></div>}
        <div className="stats-row">{["verified", "unverified", "conflict"].map(status => <div className="stat-card" key={status}><div className="num">{data.facts.filter(f => f.status === status).length}</div><div className="label">{status === "unverified" ? "Pending" : status}</div></div>)}</div>
        {!data.facts.length && <div className="empty-state"><h3>Your journey starts here</h3><p>Add a record to create a source-linked timeline.</p></div>}
        {/* Missing Items Alerts */}
        {data.missing_items.map((m, i) => (
          <div key={i} style={{ background: "#FFF3E0", border: "1px solid #FFD93D", borderRadius: 10, padding: 10, marginBottom: 8, fontSize: 12, color: "#E65100" }}>
            ⚠️ {m.message}
          </div>
        ))}

        {/* Timeline */}
        <div style={{ position: "relative", paddingLeft: 36, borderLeft: "3px solid #E8ECF4", marginLeft: 14, marginTop: 10 }}>
          {data.facts.map((fact, i) => {
            const s = STATUS_COLORS[fact.status] || STATUS_COLORS.unverified;
            return (
              <div key={fact.id} style={{ marginBottom: 16, position: "relative" }}>
                {/* Dot */}
                <div style={{ position: "absolute", left: -45, top: 6, width: 16, height: 16, borderRadius: "50%", background: s.dot, border: "3px solid #fff", boxShadow: `0 0 0 2px ${s.dot}` }} />

                {/* Card */}
                <div style={{ background: s.bg, border: `1px solid ${s.dot}30`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: s.text }}>
                      {fact.visit_date || "Date unclear"} — {fact.facility_name || "Unknown facility"}
                    </span>
                    <span className={`badge badge-${fact.status}`}>{s.label}</span>
                  </div>

                  <div style={{ fontSize: 12, color: "#5C6B8A", marginBottom: 6 }}>
                    {fact.document_type} {fact.gestational_week && `· Week ${fact.gestational_week}`}
                  </div>

                  {/* Confidence Bar */}
                  <RecordDetails data={fact} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "#E8ECF4", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${fact.confidence * 100}%`, height: "100%", background: fact.confidence > 0.8 ? "#2ED573" : fact.confidence > 0.6 ? "#FFA502" : "#FF4757", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#5C6B8A" }}>{Math.round(fact.confidence * 100)}%</span>
                  </div>

                  {/* Pending Items */}
                  {fact.pending_items && (() => {
                    try {
                      const items = JSON.parse(fact.pending_items);
                      return items.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                          {items.map((item, j) => (
                            <span key={j} style={{ background: "#EDE5FF", color: "#6C3CE1", padding: "2px 8px", borderRadius: 50, fontSize: 10, fontWeight: 600 }}>{item}</span>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })()}

                  {/* Conflict Details */}
                  {fact.status === "conflict" && fact.conflict_details && (
                    <div style={{ background: "#FFE8EA", padding: 8, borderRadius: 6, fontSize: 11, color: "#C0392B", marginBottom: 8 }}>
                      ⚡ {parseList(fact.conflict_details).map(c => c.message).filter(Boolean).join("; ")}
                    </div>
                  )}

                  {canVerify && fact.status !== "verified" && <VoiceVerification fact={fact} disabled={offline || busy} onVerified={loadJourney} />}
                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {fact.source_image_path && (
                      <button onClick={() => setSelectedImage(`${backendOrigin()}/${fact.source_image_path.replace(/^\//, "")}`)}
                        style={{ background: "none", border: "1px solid #6C3CE1", color: "#6C3CE1", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        📎 View Source
                      </button>
                    )}
                    {canVerify && fact.status !== "verified" && (
                      <button disabled={offline || busy} onClick={() => confirmFact(fact.id, fact.status === "conflict")}
                        style={{ background: "#2ED573", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        {fact.status === "conflict" ? "Resolve conflict" : "Verify"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <HardwareActions patientId={id} disabled={offline || busy} />
        {/* Bottom Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 40 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={offline} onClick={() => navigate(`/capture/${id}`)}>📸 Add Record</button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => window.open(`${backendOrigin()}/api/patients/${id}/qr?frontend_origin=${encodeURIComponent(window.location.origin)}`, "_blank", "noopener,noreferrer")}>📱 QR Code</button>
        </div>

        {/* Source Image Modal */}
        {selectedImage && (
          <div role="dialog" aria-modal="true" aria-label="Source image" onClick={() => setSelectedImage(null)}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "pointer" }}>
            <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}>
              <button className="btn btn-ghost" onClick={() => setSelectedImage(null)}>Close source</button><img src={selectedImage} alt="Source" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 8 }} />
              <div style={{ textAlign: "center", color: "#fff", marginTop: 10, fontSize: 13 }}>📎 Source Image — tap anywhere to close</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return renderJourney(journey);
}

export default PatientJourney;
