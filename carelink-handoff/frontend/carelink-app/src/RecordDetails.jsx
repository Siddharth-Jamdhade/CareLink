import React from "react";

const fields = [
  ["provider_name", "Doctor / provider"],
  ["visit_date", "Visit date"],
  ["facility_name", "Hospital / clinic"],
  ["document_type", "Document type"],
  ["documented_diagnosis", "Diagnosis / suspected condition (as written)"],
  ["documented_symptoms", "Symptoms (as written)"],
  ["documented_medications", "Medicines / instructions (as written)"],
  ["gestational_week", "Pregnancy week"],
  ["next_appointment", "Next appointment"],
  ["pending_items", "Tests / follow-ups recorded"],
  ["confidence_notes", "Unclear details / extraction notes"],
];
function display(value) {
  if (value == null || value === "" || value === "null") return "Not recorded or unreadable";
  if (Array.isArray(value)) return value.length ? value.join(" · ") : "Not recorded or unreadable";
  if (typeof value === "string" && value.startsWith("[")) {
    try { return display(JSON.parse(value)); } catch { return value; }
  }
  return String(value);
}
export default function RecordDetails({ data }) {
  return <section className="record-details" aria-label="Extracted record information">
    <p className="record-review-note">Transcribed from the paper, not an AI diagnosis or treatment recommendation. Check the source before using these details.</p>
    <dl className="record-details-grid">{fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{display(data?.[key])}</dd></div>)}</dl>
  </section>;
}
