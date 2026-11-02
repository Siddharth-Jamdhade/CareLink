import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PatientJourney from "./pages/PatientJourney";
import CameraCapture from "./pages/CameraCapture";
import Splash from "./pages/Splash";
import Settings from "./pages/Settings";
import "./App.css";
import Welcome from "./pages/Welcome";
import MobileNav from "./MobileNav";
import { getConsent } from "./consent";
import AuthGate from "./mobile/AuthGate";
import MobileApp from "./mobile/MobileApp";

function Portal() {
  const [consent, setConsent] = useState(getConsent);
  if (!consent) return <Welcome onAccept={setConsent} />;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/patient/:id" element={<PatientJourney />} />
        <Route path="/capture/:id" element={<CameraCapture />} />
        <Route path="/settings" element={<Settings onWithdraw={() => setConsent(null)} />} />
      </Routes>
      <MobileNav />
    </BrowserRouter>
  );
}

function App() {
  return <AuthGate>{account => window.location.pathname.startsWith('/mobile') || (account.role === 'patient' && ['/', '/dashboard'].includes(window.location.pathname)) ? <MobileApp account={account} /> : <><div style={{padding:12, background:'#e4f2ef',display:'flex',gap:20}}><a href="/mobile">CareLink Mobile</a><button onClick={account.logout}>Sign out</button></div><Portal /></>}</AuthGate>;
}

export default App;
