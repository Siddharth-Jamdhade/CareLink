import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API, { readCache, writeCache, removeCache, errorMessage } from "../api";

function Dashboard() {
  const [patients, setPatients]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [search, setSearch]       = useState("");
  const [name, setName]           = useState("");
  const [age, setAge]             = useState("");
  const [week, setWeek]           = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating]   = useState(false);
  const [error, setError]         = useState(null);
  const navigate = useNavigate();
  const touchStart = useRef(null);

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/patients/");
      setPatients(res.data);
      writeCache("patients", res.data);
    } catch {
      setError("Cannot reach server. Showing cached data.");
      const cached = readCache("patients");
      if (Array.isArray(cached)) setPatients(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const createPatient = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await API.post("/patients/", {
        ...(phone.trim() ? { phone_number: phone.trim() } : {}), name: name.trim(), age: parseInt(age), gestational_week: parseInt(week),
      });
      setShowForm(false);
      setName(""); setAge(""); setWeek(""); setPhone("");
      loadPatients();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const deletePatient = async (e, patientId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this patient and all their records? This cannot be undone.")) return;
    try {
      await API.delete(`/patients/${patientId}`);
      const remaining = patients.filter(p => p.id !== patientId);
      setPatients(remaining); writeCache("patients", remaining); removeCache(`journey-${patientId}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const weekColor = (w) => {
    if (w >= 36) return "#FF4757";
    if (w >= 28) return "#FFA502";
    return "#2ED573";
  };

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container" onTouchStart={e => { touchStart.current = window.scrollY === 0 ? e.touches[0].clientY : null; }} onTouchEnd={e => { if (touchStart.current !== null && e.changedTouches[0].clientY - touchStart.current > 90 && !loading) loadPatients(); touchStart.current = null; }}>

      {/* ── Header ── */}
      <div className="page-header animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>Care<span>Link</span></h1>
            <p>Consultation-ready patient journeys</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative", zIndex: 1 }}>
            <button
              onClick={() => navigate("/settings")}
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "8px 10px", color: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
              title="Settings"
            >⚙️</button>
            <button
              className="btn btn-sm"
              onClick={() => setShowForm(f => !f)}
              style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", backdropFilter: "blur(4px)" }}
            >{showForm ? "✕ Close" : "+ New"}</button>
          </div>
        </div>

        {/* Mini stats strip */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, position: "relative", zIndex: 1 }}>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{patients.length}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: 1, textTransform: "uppercase" }}>Patients</div>
          </div>
          <div style={{ background: "rgba(46,213,115,0.15)", border: "1px solid rgba(46,213,115,0.3)", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#2ED573" }}>
              {patients.filter(p => p.gestational_week <= 36).length}
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: 1, textTransform: "uppercase" }}>Weeks 1–36</div>
          </div>
          <div style={{ background: "rgba(255,71,87,0.15)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#FF4757" }}>
              {patients.filter(p => p.gestational_week > 36).length}
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: 1, textTransform: "uppercase" }}>Week 37+</div>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="alert alert-warning animate-fade" style={{ marginBottom: 12 }}>
          <span>📴</span>
          <div>
            {error}{" "}
            <button
              onClick={loadPatients}
              style={{ background: "none", border: "none", color: "#B7620A", fontWeight: 800, cursor: "pointer", textDecoration: "underline", fontSize: 12 }}
            >Retry</button>
          </div>
        </div>
      )}

      {/* ── New Patient Form ── */}
      {showForm && (
        <div className="card animate-fade" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>👶 New Patient</h3>
          <form onSubmit={createPatient}>
            <input
              className="input"
              aria-label="Patient full name" placeholder="Patient full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{ marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input
                className="input"
                aria-label="Age" placeholder="Age"
                type="number" min="10" max="60"
                value={age}
                onChange={e => setAge(e.target.value)}
                required
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
            <label htmlFor="whatsapp-number">WhatsApp number (optional)</label><input id="whatsapp-number" type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={creating}>
                {creating ? "Creating..." : "✓ Create Patient"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Search ── */}
      {patients.length > 0 && (
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="input"
            aria-label="Search patients..." placeholder="Search patients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      <button className="btn btn-ghost refresh" disabled={loading} onClick={loadPatients}>{loading ? "Refreshing…" : "Refresh patients"}</button>
      {/* ── Patient List ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 82, borderRadius: 16 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state animate-in">
          <span className="icon">{search ? "🔍" : "👩‍⚕️"}</span>
          <h3>{search ? "No patients found" : "No patients yet"}</h3>
          <p>{search ? `No results for "${search}"` : 'Tap "+ New" to add the first patient'}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className="card animate-in"
              style={{ padding: "14px 16px", cursor: "pointer", animationDelay: `${i * 0.04}s` }}
              role="link" tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" && e.target === e.currentTarget) navigate(`/patient/${p.id}`); }}
              onClick={() => navigate(`/patient/${p.id}`)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${weekColor(p.gestational_week)}20, ${weekColor(p.gestational_week)}40)`,
                  border: `2px solid ${weekColor(p.gestational_week)}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  👩
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#5C6B8A" }}>Age {p.age}</span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#D0D5E8" }} />
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: weekColor(p.gestational_week) + "18",
                      color: weekColor(p.gestational_week),
                    }}>
                      Week {p.gestational_week}
                      {p.gestational_week >= 36 ? " 🔴" : p.gestational_week >= 28 ? " 🟡" : " 🟢"}
                    </span>
                  </div>
                </div>

                <span className={`badge badge-${p.conflict_count ? "conflict" : "missing"}`}>{p.record_count || 0} records{p.conflict_count ? ` · ${p.conflict_count} conflicts` : p.pending_count ? ` · ${p.pending_count} pending` : ""}</span>
                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    onClick={(e) => deletePatient(e, p.id)}
                    style={{ background: "none", border: "none", color: "#D0D5E8", fontSize: 16, cursor: "pointer", padding: "6px", borderRadius: 8, lineHeight: 1 }}
                    title="Delete patient"
                  >🗑</button>
                  <div style={{ fontSize: 18, color: "#6C3CE1", fontWeight: 700 }}>›</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
