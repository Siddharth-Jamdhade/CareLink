export const CONSENT_KEY = "carelink_consent_v1";
export function getConsent() {
  try {
    const value = JSON.parse(localStorage.getItem(CONSENT_KEY));
    return value?.version === 1 && value.accepted === true ? value : null;
  } catch { return null; }
}
export function clearPatientCache() {
  Object.keys(localStorage).filter(k => /:(patients|journey-.*)$/.test(k) || k === "patients_cache" || k.startsWith("journey-")).forEach(k => localStorage.removeItem(k));
}
export function saveConsent(offline) {
  offline = false;
  if (!offline) clearPatientCache();
  const value = { version: 1, accepted: true, offline, recordedAt: new Date().toISOString() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  return value;
}
export function withdrawConsent() {
  clearPatientCache();
  localStorage.removeItem(CONSENT_KEY);
}
