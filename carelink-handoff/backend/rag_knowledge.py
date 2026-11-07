"""Shared ingestion and conservative form policy; never invent patient findings."""
import json
import os
import re
from pathlib import Path

KB_PATH = Path(os.getenv('CARELINK_KB_PATH', Path(__file__).parent / 'data/pregnancy_knowledge_base.json'))
CLINICAL_KEYS = ('diagnosis', 'medication', 'treatment', 'management', 'dose', 'action_if', 'normal', 'advice', 'confidence', 'frequency', 'risk_category')

def field_paths(value, prefix=''):
    result = []
    if isinstance(value, dict):
        for key, item in value.items():
            path = f'{prefix}.{key}' if prefix else key
            if any(term in key.lower() for term in CLINICAL_KEYS):
                continue
            result += field_paths(item, path) if isinstance(item, dict) else [path]
    return result

def build_documents(path=KB_PATH):
    """Each template, reference, symptom map and danger-sign item is indexed separately."""
    kb = json.loads(Path(path).read_text(encoding='utf-8-sig'))
    documents = []
    for group, values in kb.items():
        if group == 'metadata':
            continue
        if isinstance(values, list):
            items = [(str(i), value) for i, value in enumerate(values)]
        elif isinstance(values, dict):
            items = list(values.items())
        else:
            continue
        for key, value in items:
            if not isinstance(value, (dict, list)):
                continue
            data = value if isinstance(value, dict) else {'items': value}
            doc_id = str(data.get('id') or f'{group}-{key}')
            title = str(data.get('title') or data.get('symptom') or data.get('condition') or data.get('full_name') or key.replace('_', ' '))
            paths = field_paths(data.get('standard_fields', data))
            # Retrieval content remains a reference. Generated form values come ONLY from nurse input.
            documents.append({'id': doc_id, 'title': title, 'content': json.dumps(data, ensure_ascii=False), 'metadata': {
                'id': doc_id, 'title': title, 'trimester': str(data.get('trimester', 'Any')),
                'flag_for_doctor': bool(data.get('flag_for_doctor', group in ('common_complications_templates', 'danger_signs_checklist'))),
                'risk_category': str(data.get('risk_category', data.get('standard_fields', {}).get('risk_category', 'Not assessed'))),
                'confidence_note': str(data.get('confidence_note', 'User-supplied draft reference; not clinically validated')),
                'source': 'knowledge_base', 'source_review_status': 'unreviewed', 'group': group,
                'field_paths': json.dumps(paths), 'source_file': Path(path).name,
            }})
    return documents

def query_text(data):
    # Names, address, patient ID and phone are deliberately excluded from embedding input.
    return json.dumps({key: data.get(key) for key in ('gestational_week', 'trimester', 'chief_complaint', 'vitals', 'symptoms')}, ensure_ascii=False)

def danger_signs(data):
    """Conservative review routing, not a diagnosis or a complete clinical triage system."""
    text = ' '.join([str(data.get('chief_complaint', '')), *data.get('symptoms', [])]).lower()
    checks = [('Vaginal bleeding', r'\b(?:heavy\s+|vaginal\s+|pv\s+)?bleeding\b'), ('Severe headache / vision changes', r'severe headache|blurred vision|visual disturbance'),
              ('Convulsions / fits', r'convulsions?|seizures?|\bfits\b'), ('Severe abdominal pain', r'severe abdominal pain'),
              ('Breathing difficulty / chest pain', r'breathless|difficulty breathing|chest pain'), ('Fluid leakage', r'leaking|gush of fluid|watery discharge'),
              ('Reduced fetal movements', r'(?:reduced|absent|no|decreased) (?:fetal |foetal |baby )?movements'), ('High fever', r'high fever|fever with chills')]
    found = []
    for name, pattern in checks:
        for match in re.finditer(pattern, text):
            before = text[max(0, match.start()-30):match.start()]
            if re.search(r'(?:no|denies|without|not having)\s+(?:\w+\s+){0,2}$', before) and name != 'Reduced fetal movements':
                continue
            found.append(name)
            break
    bp = re.fullmatch(r'\s*(\d{2,3})\s*/\s*(\d{2,3})\s*', str(data.get('vitals', {}).get('bp', '')))
    if bp and (int(bp[1]) >= 140 or int(bp[2]) >= 90):
        found.append('Recorded BP requires clinician review')
    return list(dict.fromkeys(found + data.get('danger_signs', [])))

def form_from_input(data):
    """A matching template cannot establish a patient's normal exam, diagnosis or prescriptions."""
    return {'gestational_week': data.get('gestational_week'), 'trimester': data.get('trimester'),
            'chief_complaint': data.get('chief_complaint', ''), 'vitals': data.get('vitals', {}), 'symptoms': data.get('symptoms', []),
            'observations': '', 'documented_diagnosis': '', 'documented_medications': '', 'tests_followups': '', 'next_appointment': ''}

def feedback_document(case_id, verified_form):
    # Only a reusable field structure enters the global KB. Never reuse patient values/notes as training material.
    fields = sorted(field_paths(verified_form))
    return {'id': 'verified-' + case_id, 'title': 'Doctor-reviewed data-entry structure',
            'content': json.dumps({'title': 'Doctor-reviewed data-entry structure', 'field_paths': fields}),
            'metadata': {'id': 'verified-' + case_id, 'title': 'Doctor-reviewed data-entry structure', 'trimester': str(verified_form.get('trimester', 'Any')),
                         'source': 'doctor_verified', 'flag_for_doctor': False, 'risk_category': 'Not assessed',
                         'confidence_note': 'Reviewed form structure only; not a clinical protocol', 'field_paths': json.dumps(fields), 'case_id': case_id}}
