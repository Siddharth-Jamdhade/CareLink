// CareLink Mobile - MobileApp.jsx - enhanced 2026-11-05
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { FiHome, FiFolder, FiHeart, FiCalendar, FiUser, FiArrowRight, FiUpload, FiCheckCircle, FiRefreshCw, FiShield, FiLogOut, FiSearch } from 'react-icons/fi';
import API, { backendOrigin, errorMessage } from '../api';
import { clearPatientCache, getConsent, saveConsent, withdrawConsent } from '../consent';
import RecordDetails from '../RecordDetails';
import { CloudNfcLink } from '../HardwareActions';
import { calculateEDD, displayDate, EDD_HELP } from './dates';
import { getWeekInfo } from './weekInfo';
import MovementDiary from './MovementDiary';
import './mobile.css';

const BabyScene = lazy(() => import('./BabyScene'));
const ILLUSTRATION = 'Educational illustration based on pregnancy stage. This is not a scan or live view of your baby.';
const labels = {
  en: { home: 'Home', records: 'Records', baby: 'My Baby', appointments: 'Appointments', profile: 'Profile', greeting: 'A little closer, every day.', subtitle: 'Your care, connected.', upload: 'Add a document' },
  hi: { home: 'होम', records: 'रिकॉर्ड', baby: 'मेरा शिशु', appointments: 'अपॉइंटमेंट', profile: 'प्रोफ़ाइल', greeting: 'हर दिन, थोड़ा और करीब।', subtitle: 'आपकी देखभाल, एक साथ।', upload: 'दस्तावेज़ जोड़ें' },
  mr: { home: 'मुख्यपृष्ठ', records: 'नोंदी', baby: 'माझे बाळ', appointments: 'भेटी', profile: 'प्रोफाइल', greeting: 'दररोज, थोडे अधिक जवळ.', subtitle: 'तुमची काळजी, एकत्र.', upload: 'कागदपत्र जोडा' },
};
const tabs = [['home', FiHome], ['records', FiFolder], ['baby', FiHeart], ['appointments', FiCalendar], ['profile', FiUser]];
const shown = value => value === null || value === undefined || value === '' ? 'Not recorded' : value;
const parse = value => { try { const list = JSON.parse(value || '[]'); return Array.isArray(list) ? list : []; } catch { return []; } };

function Model({ week, compact }) { return <Suspense fallback={<div className="cl-model-loading" role="status">Loading illustration…</div>}><BabyScene week={week} compact={compact} /></Suspense>; }
function DueDate({ profile }) {
  return <><div className="cl-eyebrow">{profile.revised_edd ? "CLINICIAN-REVISED DUE DATE" : "ESTIMATED DUE DATE"}</div><div className="cl-due-date">{displayDate(profile.effective_edd)}</div><small className="cl-helper">{EDD_HELP}</small>{profile.revised_edd && <p className="cl-muted">Clinician-revised: {displayDate(profile.revised_edd)} · {profile.edd_source}<br />Reason: {profile.edd_reason}<br />LMP calculation: {displayDate(profile.calculated_edd)}</p>}<p className="cl-muted">This is an estimate. Clinician-confirmed dating may differ.</p></>;
}

export default function MobileApp({ account }) {
  const [tab, setTab] = useState('home'), [language, setLanguage] = useState(() => localStorage.getItem('carelink_language') || 'en');
  const [patients, setPatients] = useState([]), [selected, setSelected] = useState(account.patient_id || '');
  const [profile, setProfile] = useState(null), [journey, setJourney] = useState(null), [error, setError] = useState('');
  const [loading, setLoading] = useState(true), [lastSync, setLastSync] = useState(null), [search, setSearch] = useState('');
  const [weekPreview, setWeekPreview] = useState(null), [qr, setQr] = useState(false), [consent, setConsent] = useState(() => !!getConsent());
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [sourceRecord, setSourceRecord] = useState(null);
  const t = labels[language] || labels.en, staff = account.role !== 'patient';
  const loadList = useCallback(async () => {
    setError(''); setLoading(true);
    try { const r = await API.get('/patients/'); setPatients(r.data); if (!account.patient_id) setSelected(current => r.data.some(p => p.id === current) ? current : r.data[0]?.id || ''); }
    catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }, [account.patient_id]);
  const refresh = useCallback(async () => {
    if (!selected) return;
    setLoading(true); setError('');
    try { const [p, j] = await Promise.all([API.get(`/mobile/${selected}/profile`), API.get(`/patients/${selected}/journey`)]); setProfile(p.data); setJourney(j.data); setLastSync(new Date()); }
    catch (e) { setError(errorMessage(e)); setProfile(null); setJourney(null); }
    finally { setLoading(false); }
  }, [selected]);
  useEffect(() => { if (consent) loadList(); }, [loadList, consent]);
  useEffect(() => { setProfile(null); setJourney(null); setWeekPreview(null); if (consent) refresh(); }, [refresh, consent]);
  useEffect(() => { document.documentElement.lang = language; localStorage.setItem('carelink_language', language); }, [language]);
  useEffect(() => { const update = () => { if (!navigator.onLine) setError('You are offline. Records and changes require a connection. Nothing is queued on this device.'); }; window.addEventListener('offline', update); return () => window.removeEventListener('offline', update); }, []);
  function go(next) { setSourceRecord(null); setTab(next); setMessage(''); setQr(false); window.scrollTo({ top: 0, behavior: 'instant' }); }
  const facts = journey?.facts || [], pending = facts.filter(f => f.status !== 'verified').length;
  const appointments = facts.filter(f => f.next_appointment);
  const currentWeek = profile?.weeks;
  const canIllustrate = currentWeek !== null && currentWeek >= 12 && currentWeek <= 40;
  const previewWeek = weekPreview ?? (canIllustrate ? currentWeek : 20);
  const previewing = weekPreview !== null || !canIllustrate;
  const capture = () => window.location.assign(`/capture/${selected}`);
  async function verify(fact) {
    if (fact.status === 'conflict' && !window.confirm('Use this source as verified and flag linked conflicts for review?')) return;
    setBusy(true); setError('');
    try { await API.post(`/verify/${fact.id}/${fact.status === 'conflict' ? 'resolve-conflict' : 'confirm'}`, fact.status === 'conflict' ? undefined : { source_type: 'health_worker', value: 'Reviewed against source document' }); await refresh(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function saveProfile(e) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(e.currentTarget);
    const payload = { profile_version: profile.profile_version, phone_number: form.get('phone_number') || null, emergency_contact: form.get('emergency_contact') || null, lmp: form.get('lmp') || null, confirm_old_lmp: form.get('confirm_old_lmp') === 'on' };
    if (account.role === 'clinician' && form.get('revised_edd')) Object.assign(payload, { revised_edd: form.get('revised_edd'), edd_source: form.get('edd_source'), edd_reason: form.get('edd_reason') });
    try { const r = await API.patch(`/mobile/${selected}/profile`, payload); setProfile(r.data); setLastSync(new Date()); setMessage('Saved to your shared CareLink record.'); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  if (!consent) return <main className="cl-app cl-login"><div className="cl-brand">✳ CareLink</div><h1>Your care. Your choice.</h1><p>CareLink stores your records on your care team’s server and displays source-linked information to you and assigned staff. Uploading a document asks for separate permission to extract administrative information.</p><p>Patient records are not saved offline on this device. We do not request notification permissions or show health details in notifications.</p><button className="cl-primary" onClick={() => { saveConsent(false); setConsent(true); }}>Agree and continue</button><button onClick={account.logout}>Sign out</button></main>;
  return <div className="cl-app" lang={language}>
    <header className="cl-header"><div className="cl-brand">✳ <span>CareLink</span><small>{staff ? 'CARE TEAM' : 'MOBILE'}</small></div><label className="cl-language"><span className="cl-sr">Language</span><select aria-label="Language" value={language} onChange={e => setLanguage(e.target.value)}><option value="en">EN</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option></select></label></header>
    <main className="cl-main" lang="en">
      {staff && <section className="cl-staff"><div className="cl-row"><h2>Assigned patients</h2><a href="/dashboard">Open portal <FiArrowRight /></a></div><label className="cl-search"><FiSearch /><input aria-label="Search assigned patients" placeholder="Search patients" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Patient<select value={selected} onChange={e => { setSelected(e.target.value); setMessage(''); }}>{patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => <option key={p.id} value={p.id}>{p.name} · {p.pending_count} pending</option>)}</select></label>{!patients.length && !loading && <p>No patients assigned. Your administrator can assign existing patients; create new patients in the portal.</p>}</section>}
      {error && <div className="cl-error" role="alert">{error}<button onClick={() => { loadList(); refresh(); }}><FiRefreshCw /> Retry / reload record</button>{error.includes('sign in') && <button onClick={() => window.location.reload()}>Sign in again</button>}</div>}
      {loading && <p className="cl-loading" role="status">Updating your shared record…</p>}
      {profile && journey && <>
        <div className="cl-page-heading"><p className="cl-eyebrow">{tab === 'home' ? 'YOUR PREGNANCY COMPANION' : 'YOUR CARELINK JOURNEY'}</p><h1>{tab === 'home' ? t.greeting : t[tab]}</h1><p>{tab === 'home' ? `${profile.name} · ${t.subtitle}` : tab === 'records' ? 'Every document. One connected story.' : tab === 'baby' ? 'A small wonder, growing week by week.' : tab === 'appointments' ? 'Make space for your next care visit.' : 'Your information, shared with your care team.'}</p></div>
        {tab === 'home' && <>
          <section className="cl-hero"><div className="cl-hero-copy"><span className="cl-pill">{currentWeek !== null ? `TRIMESTER ${profile.trimester}` : 'EXPLORE YOUR JOURNEY'}</span><h2>{currentWeek !== null ? <><b>{currentWeek}</b> weeks <span>+ {profile.days} days</span></> : <>One day<br />at a time.</>}</h2><p>{currentWeek !== null ? `Dating: ${profile.revised_edd ? 'clinician-revised EDD' : 'recorded LMP'}` : 'Add your LMP to see pregnancy dates.'}</p><button className="cl-light" onClick={() => go(currentWeek !== null ? 'baby' : 'profile')}>{currentWeek !== null ? 'Meet your little one' : 'Add pregnancy dates'} <FiArrowRight /></button></div><div className="cl-preview"><Model week={canIllustrate ? currentWeek : 20} compact /><span>ILLUSTRATION · WEEK {canIllustrate ? currentWeek : '20 PREVIEW'}</span></div></section>
          <small className="cl-illustration-label">{ILLUSTRATION}</small>
          <section className="cl-card cl-due"><DueDate profile={profile} />{currentWeek !== null && <><progress aria-label="Pregnancy progress toward 40 weeks" max="40" value={Math.min(currentWeek + profile.days / 7, 40)} /><div className="cl-row cl-muted"><span>Week {currentWeek}</span><span>40 weeks</span></div></>}<button className="cl-text" onClick={() => go('profile')}>Review pregnancy dates <FiArrowRight /></button></section>
          <div className="cl-row cl-section-title"><h2>A little care, today</h2><span>YOUR NEXT STEPS</span></div>
          <button className="cl-action-card" onClick={() => go('appointments')}><span className="cl-icon peach"><FiCalendar /></span><span><strong>Next appointment</strong><small>{appointments[0] ? `${appointments[0].next_appointment} · ${appointments[0].status === 'verified' ? 'Verified record' : 'Pending review'}` : 'Not recorded · view your appointments'}</small></span><FiArrowRight /></button>
          <div className="cl-quick-grid"><button onClick={capture}><FiUpload /><strong>{t.upload}</strong><small>ANC cards, reports & more</small></button><button onClick={() => go('records')}><FiFolder /><strong>Your care records</strong><small>{facts.length} source-linked records</small></button></div>
          {!!pending && <button className="cl-action-card" onClick={() => go('records')}><span className="cl-icon"><FiShield /></span><span><strong>{pending} records need review</strong><small>Pending information is clearly marked.</small></span><FiArrowRight /></button>}
          <aside className="cl-note"><FiHeart /><p>A connected journey, at your pace.<br /><small>CareLink organises your records. Your care team guides your care.</small></p></aside>
        </>}
        {tab === 'baby' && (() => { const weekInfo = getWeekInfo(previewWeek); return <>
          <section className="cl-baby-stage"><div className="cl-row"><span className="cl-pill">{previewing ? 'PREVIEW · NOT YOUR CURRENT WEEK' : 'YOUR CURRENT WEEK'}</span><span>Trimester {previewWeek < 14 ? 1 : previewWeek < 28 ? 2 : 3}</span></div><h2>Week {previewWeek} &mdash; {weekInfo.title}</h2><span className="cl-size-badge" aria-label={`Baby size: ${weekInfo.size}`}>{weekInfo.size}</span><Model week={previewWeek} /><p className="cl-gesture">Drag to rotate · pinch to zoom</p></section>
          <p className="cl-illustration-label">{ILLUSTRATION}</p>
          <section className="cl-card"><label>Explore pregnancy stages<input aria-label="Preview pregnancy week" type="range" min="12" max="40" value={previewWeek} onChange={e => setWeekPreview(Number(e.target.value))} /></label><div className="cl-row"><span>12 weeks</span><span>40 weeks</span></div>{canIllustrate && <button className="cl-text" onClick={() => setWeekPreview(null)}>Return to current week ({currentWeek})</button>}<p className="cl-muted">Stylised stages from 12–40 weeks. Body proportions change between early, middle and later pregnancy; this model does not show clinical measurements.</p></section>
          <section className="cl-card cl-week-info"><p className="cl-eyebrow">GROWING, IN THEIR OWN TIME</p><h2>{weekInfo.title}</h2><p>{weekInfo.body}</p><a href={weekInfo.nhs_url} target="_blank" rel="noreferrer">NHS week {previewWeek} guide ↗</a><p>Movements are commonly first felt between 16 and 24 weeks, usually in the second trimester. Timing varies from person to person.</p><p>Illustrative movements are not observations of your baby and cannot tell you about their health.</p><a href="https://www.nhs.uk/pregnancy/keeping-well/your-babys-movements/" target="_blank" rel="noreferrer">Read the NHS movement guidance ↗</a></section>
          <MovementDiary week={previewWeek} />
          <aside className="cl-care-alert"><strong>Know when to get support</strong><p>Contact your maternity care team promptly if movements are reduced, absent or have changed. Do not wait until the next day. If you have never felt movement by 24 weeks, contact your care team.</p><p className="cl-muted">Educational content and model require local clinical review before patient rollout.</p></aside>
        </>; })()}
        {tab === 'records' && <>
          {staff && <section className="cl-card"><CloudNfcLink key={selected} patientId={selected} /></section>}
          <div className="cl-quick-grid"><button onClick={capture}><FiUpload /><strong>{t.upload}</strong><small>Capture or choose a photo</small></button><button onClick={() => window.location.assign(`/patient/${selected}`)}><FiCheckCircle /><strong>Consultation summary</strong><small>Full source-linked journey</small></button></div>
          <section className="cl-card"><div className="cl-row"><h2>Record review</h2><span className="cl-pill">{pending} pending</span></div><p>{journey.conflicts.length} conflicting records · {journey.missing_items.length} possible documentation gaps</p><p className="cl-muted">Documentation gaps do not confirm gaps in care. Extracted text is not a diagnosis or clinical interpretation.</p>{journey.missing_items.map((gap, i) => <p className="cl-gap" key={i}>{gap.message}</p>)}</section>
          {!facts.length && <section className="cl-empty"><FiFolder /><h2>Your story starts here</h2><p>No documents recorded. Add your first ANC card or report.</p><button className="cl-primary" onClick={capture}>Add your first document</button></section>}
          {facts.map(fact => <article className="cl-card" key={fact.id}><div className="cl-row"><p className="cl-eyebrow">{shown(fact.visit_date)}</p><span className={`cl-status ${fact.status}`}>{fact.status === 'unverified' ? 'Pending review' : fact.status}</span></div><h2>{fact.document_type || 'Document'}</h2><p>{shown(fact.facility_name)} · {shown(fact.provider_name)}</p><RecordDetails data={fact} /><p className="cl-muted">Source: document · {parse(fact.verified_by).join(', ') || 'Not recorded'}</p>{fact.status === 'conflict' && <p className="cl-error">{parse(fact.conflict_details).map(c => c.message).filter(Boolean).join('; ') || 'Conflicting information requires staff review.'}</p>}<p>Follow-up: {parse(fact.pending_items).join(', ') || 'Not recorded'}</p><div className="cl-row"><button className="cl-link-button" onClick={() => setSourceRecord(fact.record_id)}>View source document</button>{staff && fact.status !== 'verified' && <button disabled={busy} onClick={() => verify(fact)}>{fact.status === 'conflict' ? 'Resolve conflict' : 'Verify source'}</button>}</div></article>)}
          <section className="cl-card"><h2>Share with your care team</h2><p>This QR opens the consultation page. The recipient must sign in with an account already authorised for this patient. The QR grants no new access.</p><button onClick={() => setQr(v => !v)}>{qr ? 'Hide QR' : 'Show protected QR'}</button>{qr && <img className="cl-qr" alt="QR to authenticated consultation page" src={`${backendOrigin()}/api/patients/${selected}/qr?frontend_origin=${encodeURIComponent(window.location.origin)}`} />}</section>
        </>}
        {tab === 'appointments' && <>
          <section className="cl-card"><h2>Your recorded appointments</h2><p className="cl-muted">Dates below come from source documents. Confirm the time and place with your care team. CareLink does not book appointments.</p>{!appointments.length && <div className="cl-empty"><FiCalendar /><h3>No appointment recorded</h3><p>Add a referral, prescription or ANC record containing your next appointment.</p><button onClick={capture}>Add appointment document</button></div>}{appointments.map(f => <article className="cl-appointment" key={f.id}><span className="cl-icon peach"><FiCalendar /></span><div><h3>{f.next_appointment}</h3><p>{shown(f.facility_name)}<br />Provider: {shown(f.provider_name)}</p><span className={`cl-status ${f.status}`}>{f.status === 'verified' ? 'Verified source' : 'Pending / conflicting source'}</span><p><button onClick={() => setSourceRecord(f.record_id)}>Review appointment source</button></p></div></article>)}</section>
          <section className="cl-card"><h2>Visit history</h2>{facts.filter(f => f.visit_date).length ? facts.filter(f => f.visit_date).map(f => <p key={f.id}>{f.visit_date} · {shown(f.facility_name)} · {f.status}</p>) : <p>Not recorded</p>}</section>
        </>}
        {tab === 'profile' && <>
          <section className="cl-card cl-identity"><span className="cl-avatar">{profile.name.charAt(0)}</span><div><h2>{profile.name}</h2><p>Age: {shown(profile.age)} · {account.role === 'patient' ? 'Patient' : 'Assigned care team'}</p></div></section>
          <section className="cl-card"><DueDate profile={profile} /><p>Gestational age: {profile.weeks !== null ? `${profile.weeks} weeks, ${profile.days} days · trimester ${profile.trimester}` : 'Not recorded'}<br />Dating source: {profile.dating_source}</p><p className="cl-muted">Recorded portal pregnancy week: {shown(profile.gestational_week)}. This stored entry has no dating reference and is not treated as current gestational age.</p></section>
          <DatingHistory patientId={selected} version={profile.profile_version} /><ProfileForm key={`${profile.id}-${profile.profile_version}`} profile={profile} account={account} busy={busy} onSubmit={saveProfile} />
          {message && <p role="status" className="cl-success">{message}</p>}
        </>}
      </>}
      {(!selected || (!profile && !loading && !error)) && <section className="cl-empty"><h2>No patient record available</h2><p>Your care team needs to link your account to a patient record.</p></section>}
      <footer className="cl-footer"><span><FiShield /> Private, connected care</span><p>{lastSync ? `Last synced ${lastSync.toLocaleString('en-IN')}` : 'Not synced'} · Online records only</p><div className="cl-row"><button onClick={() => { refresh(); loadList(); }}><FiRefreshCw /> Refresh</button><button onClick={account.logout}><FiLogOut /> Sign out</button></div>{tab === 'profile' && <><button onClick={() => { clearPatientCache(); setMessage('Local record caches removed. No patient data is stored offline.'); }}>Remove local record data</button><button onClick={() => { if (window.confirm('Withdraw consent on this device and sign out? Your server records remain with the care team.')) { withdrawConsent(); setConsent(false); account.logout(); } }}>Withdraw device consent</button><p>Navigation supports English, Hindi and Marathi. Clinical and record text currently remains in its source language and requires translation review.</p></>}</footer>
    </main>
    {sourceRecord && <SourceViewer recordId={sourceRecord} onClose={() => setSourceRecord(null)} />}
    <nav className="cl-bottom" aria-label="Patient navigation">{tabs.map(([key, Icon]) => <button key={key} aria-current={tab === key ? 'page' : undefined} className={tab === key ? 'active' : ''} onClick={() => go(key)}><Icon aria-hidden="true" /><span>{t[key]}</span></button>)}</nav>
  </div>;
}

function ProfileForm({ profile, account, busy, onSubmit }) {
  const [lmp, setLmp] = useState(profile.lmp || '');
  return <form className="cl-card cl-profile-form" onSubmit={onSubmit}><h2>Contact & pregnancy details</h2><label>Phone number<input name="phone_number" type="tel" defaultValue={profile.phone_number || ''} maxLength="40" placeholder="Not recorded" /></label><label>Emergency contact<input name="emergency_contact" defaultValue={profile.emergency_contact || ''} maxLength="200" placeholder="Name and phone · Not recorded" /></label><label>First day of last menstrual period (LMP)<input type="date" name="lmp" value={lmp} onChange={e => setLmp(e.target.value)} max={new Date().toLocaleDateString('en-CA')} /></label><p>Calculated EDD: <strong>{calculateEDD(lmp) ? displayDate(calculateEDD(lmp)) : 'Not recorded'}</strong></p><small className="cl-helper">{EDD_HELP}</small><label className="cl-checkbox"><input type="checkbox" name="confirm_old_lmp" /> I checked this date and confirm it if it is more than 45 weeks ago.</label><p className="cl-muted">Leave LMP blank if unknown. Month ends use the last valid day after adding nine months, then add seven days. A clinician-revised date is retained when LMP changes.</p>{account.role === 'clinician' && <fieldset><legend>Clinician dating revision</legend><label>Revised EDD<input name="revised_edd" type="date" defaultValue={profile.revised_edd || ''} /></label><label>Dating source<input name="edd_source" defaultValue={profile.edd_source || ''} maxLength="200" placeholder="For example, dated ultrasound report" /></label><label>Reason for revision<textarea name="edd_reason" defaultValue={profile.edd_reason || ''} maxLength="2000" /></label><p className="cl-muted">The original LMP calculation and revision history are retained.</p></fieldset>}<button className="cl-primary" disabled={busy}>{busy ? 'Saving…' : 'Save to shared record'}</button><p className="cl-muted">Changes are saved online. If another session edits this profile, reload and review before saving again.</p></form>;
}

function DatingHistory({ patientId, version }) {
  const [history, setHistory] = useState(null), [error, setError] = useState(''), [open, setOpen] = useState(false);
  useEffect(() => { setHistory(null); setOpen(false); }, [patientId, version]);
  async function show() {
    if (open) { setOpen(false); return; }
    setError('');
    try { const r = await API.get(`/mobile/${patientId}/dating-history`); setHistory(r.data); setOpen(true); }
    catch (e) { setError(errorMessage(e)); }
  }
  return <section className="cl-card"><h2>Dating history</h2><p className="cl-muted">Previous calculations and clinician revisions remain available.</p><button onClick={show}>{open ? 'Hide dating history' : 'View dating history'}</button>{error && <p role="alert">{error}</p>}{open && (!history?.length ? <p>No dating changes recorded.</p> : history.map((h, i) => <article className="cl-gap" key={i}><strong>{displayDate(h.saved_at.slice(0, 10))} · {h.editor_role}</strong><p>LMP: {displayDate(h.after.lmp)}<br />Calculated: {displayDate(h.before.calculated_edd)} → {displayDate(h.after.calculated_edd)}<br />Clinician EDD: {displayDate(h.after.revised_edd)}<br />Source: {shown(h.after.edd_source)}<br />Reason: {shown(h.after.edd_reason)}</p></article>))}</section>;
}

function SourceViewer({ recordId, onClose }) {
  const dialog = useRef(null);
  const [error, setError] = useState(false), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  useEffect(() => { const element = dialog.current, opener = document.activeElement; element.showModal(); return () => { element.close(); opener?.focus(); }; }, []);
  return <dialog ref={dialog} className="cl-source-dialog" aria-label="Source document" onCancel={onClose}><div className="cl-row"><h2>Source document</h2><button onClick={onClose}>Close document</button></div>{loading && <p role="status">Loading protected document…</p>}{error && <p role="alert">Could not load this document. Check your connection and sign-in.<button onClick={() => { setError(false); setLoading(true); setRetry(n => n + 1); }}>Retry document</button></p>}<img key={retry} src={`${backendOrigin()}/api/auth/document/${recordId}?retry=${retry}`} alt="Original source document for comparison with extracted details" onLoad={() => setLoading(false)} onError={() => { setError(true); setLoading(false); }} /></dialog>;
}
