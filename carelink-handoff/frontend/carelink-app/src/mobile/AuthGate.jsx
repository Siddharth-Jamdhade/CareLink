import React, { createContext, useEffect, useState } from 'react';
import API, { backendOrigin, errorMessage } from '../api';
import { clearPatientCache } from '../consent';
import './mobile.css';

export const AccountContext = createContext(null);
export default function AuthGate({ children }) {
  const [account, setAccount] = useState(null), [checking, setChecking] = useState(true);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [serverInput, setServerInput] = useState(() => localStorage.getItem('carelink_backend_host') || '');

  useEffect(() => {
    clearPatientCache();
    API.get('/auth/me')
      .then(r => setAccount(r.data))
      .catch(e => { if (e.response?.status !== 401) setError(errorMessage(e)); })
      .finally(() => setChecking(false));
  }, []);

  async function login(e) {
    e.preventDefault(); setBusy(true); setError('');
    const form = new FormData(e.currentTarget);
    try {
      const r = await API.post('/auth/login', { username: form.get('username'), password: form.get('password') });
      setAccount(r.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try { await API.post('/auth/logout'); clearPatientCache(); setAccount(null); }
    catch (err) { setError(`Sign-out could not complete. ${errorMessage(err)} Please retry when connected.`); }
  }

  function saveServer(e) {
    e.preventDefault();
    try {
      const trimmed = serverInput.trim();
      if (trimmed) {
        localStorage.setItem('carelink_backend_host', trimmed);
      } else {
        localStorage.removeItem('carelink_backend_host');
      }
      window.location.reload();
    } catch {
      setError('Could not save server address.');
    }
  }

  if (checking) return <main className="cl-app cl-login" role="status">Connecting to CareLink…</main>;
  if (account) return <AccountContext.Provider value={{ ...account, logout }}>{error && <div role="alert" style={{padding:16,background:'#fff0e9',color:'#813b28'}}>{error}</div>}{children({ ...account, logout })}</AccountContext.Provider>;

  return (
    <main className="cl-app cl-login">
      <div className="cl-brand">✳ <span>CareLink</span><small>MOBILE</small></div>
      <div className="cl-login-art" aria-hidden="true">♡</div>
      <p className="cl-eyebrow">TOGETHER, THROUGH EVERY STAGE</p>
      <h1>A little support.<br />A more connected journey.</h1>
      <p>Your records, your care team, and your pregnancy journey. All in one place.</p>
      <form onSubmit={login}>
        <h2>Welcome back</h2>
        <label>Username<input name="username" autoComplete="username" required maxLength="100" /></label>
        <label>Password<input type="password" name="password" autoComplete="current-password" required maxLength="256" /></label>
        <button className="cl-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely →'}</button>
        {error && <p role="alert" className="cl-error">{error}</p>}
      </form>
      <p className="cl-muted">Your care team provides your account. Patient records are only available after sign-in.</p>
      <div style={{marginTop: 18, textAlign: 'center', fontSize: '0.85rem'}}>
        <button
          type="button"
          onClick={() => setShowServer(s => !s)}
          style={{background: 'none', border: 'none', color: '#4a6b65', textDecoration: 'underline', cursor: 'pointer', padding: 4}}
        >
          ⚙ Server: {backendOrigin()}
        </button>
        {showServer && (
          <form onSubmit={saveServer} style={{marginTop: 10, padding: 12, background: '#f0f5f3', borderRadius: 8}}>
            <label style={{display: 'block', marginBottom: 6, fontSize: '0.8rem', color: '#2c4a45'}}>
              Backend Server URL
              <input
                type="text"
                value={serverInput}
                onChange={e => setServerInput(e.target.value)}
                placeholder="https://carelink-app.onrender.com"
                style={{display: 'block', width: '100%', padding: '6px 10px', marginTop: 4, borderRadius: 4, border: '1px solid #9bbcb5', boxSizing: 'border-box'}}
              />
            </label>
            <div style={{display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8}}>
              <button type="submit" className="cl-primary" style={{padding: '4px 12px', fontSize: '0.8rem'}}>Save & Reload</button>
              <button type="button" onClick={() => { setServerInput(''); localStorage.removeItem('carelink_backend_host'); window.location.reload(); }} style={{padding: '4px 12px', fontSize: '0.8rem'}}>Reset to Default</button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
