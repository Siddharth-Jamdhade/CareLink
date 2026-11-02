import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
export default function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    API.get("/health", { timeout: 3500, signal: controller.signal }).catch(() => {}).finally(() => { if (active) navigate("/dashboard", { replace: true }); });
    return () => { active = false; controller.abort(); };
  }, [navigate]);
  return <main className="splash"><div className="brand-mark">+</div><h1>CareLink</h1><p>Every record. One connected journey.</p><div className="spinner" /><p role="status">Connecting to your care workspace…</p><Link to="/dashboard">Continue to patients</Link></main>;
}
