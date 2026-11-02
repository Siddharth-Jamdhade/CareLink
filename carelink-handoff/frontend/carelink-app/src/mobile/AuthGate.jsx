import React, { createContext, useEffect, useState } from 'react';
import API, { errorMessage } from '../api';
import { clearPatientCache } from '../consent';
import './mobile.css';

export const AccountContext = createContext(null);
export default function AuthGate({ children }) {
  const [account, setAccount] = useState(null), [checking, setChecking] = useState(true);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { clearPatientCache(); API.get('/auth/me').then(r => setAccount(r.data)).catch(e => { if (e.response?.status !== 401) setError(errorMessage(e)); }).finally(() => setChecking(false)); }, []);
  async function login(e) {
    e.preventDefault(); setBusy(true); setError('');
    const form = new FormData(e.currentTarget);
    try { const r = await API.post('/auth/login', { username: form.get('username'), password: form.get('password') }); setAccount(r.data); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  async function logout() {
    try { await API.post('/auth/logout'); clearPatientCache(); setAccount(null); }
    catch (err) { setError(`Sign-out could not complete. ${errorMessage(err)} Please retry when connected.`); }
  }
  if (checking) return <main className="cl-app cl-login" role="status">Connecting to CareLink…</main>;
  if (account) return <AccountContext.Provider value={{ ...account, logout }}>{error && <div role="alert" style={{padding:16,background:'#fff0e9',color:'#813b28'}}>{error}</div>}{children({ ...account, logout })}</AccountContext.Provider>;
  return <main className="cl-app cl-login"><div className="cl-brand">✳ <span>CareLink</span><small>MOBILE</small></div><div className="cl-login-art" aria-hidden="true">♡</div><p className="cl-eyebrow">TOGETHER, THROUGH EVERY STAGE</p><h1>A little support.<br />A more connected journey.</h1><p>Your records, your care team, and your pregnancy journey. All in one place.</p><form onSubmit={login}><h2>Welcome back</h2><label>Username<input name="username" autoComplete="username" required maxLength="100" /></label><label>Password<input type="password" name="password" autoComplete="current-password" required maxLength="256" /></label><button className="cl-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely →'}</button>{error && <p role="alert" className="cl-error">{error}</p>}</form><p className="cl-muted">Your care team provides your account. Patient records are only available after sign-in.</p></main>;
}
