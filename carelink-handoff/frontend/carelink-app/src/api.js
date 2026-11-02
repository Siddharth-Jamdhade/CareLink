import axios from "axios";

export function normalizeBackend(value) {
  if (!value.trim()) return window.location.port === "3000" ? `${window.location.protocol}//${window.location.hostname}:8000` : window.location.origin;
  const raw = value.trim();
  const url = new URL(raw.includes("://") ? raw : `${window.location.protocol}//${raw}`);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || !["/", "/api"].includes(url.pathname)) throw new Error("Enter a host or HTTP(S) server URL without a path.");
  if (!raw.includes("://") && !url.port) url.port = "8000";
  return url.origin;
}
export function backendOrigin() {
  try { return normalizeBackend(localStorage.getItem("carelink_backend_host") || ""); }
  catch { return normalizeBackend(""); }
}
const API = axios.create({ timeout: 30000, withCredentials: true });
API.interceptors.request.use(config => { config.baseURL = `${backendOrigin()}/api`; config.headers["X-CareLink-Client"] = "1"; return config; });
// Patient records remain online-only until encrypted offline storage is implemented.
export function readCache() { return null; }
export function writeCache() {}
export function removeCache(key) { try { localStorage.removeItem(`${backendOrigin()}:${key}`); } catch {} }
export function errorMessage(error) {
  const detail = error.response?.data?.detail;
  return typeof detail === "string" ? detail : error.response ? "The request could not be completed. Please check your inputs and try again." : "Cannot reach the backend. Check Wi-Fi and the server address in Settings, then retry.";
}
export default API;
