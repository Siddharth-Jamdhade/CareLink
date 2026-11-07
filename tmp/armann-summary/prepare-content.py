from pathlib import Path
import json,re
S=[]
def section(key,title,x,baseline,width,start,end,items):return {'key':key,'title':title,'x':x,'headerBaseline':baseline,'width':width,'firstBaseline':start,'lastBaseline':end,'items':[{'text':t,'kind':'subhead' if t.startswith(('A. ','B. ')) else 'bullet'} for t in items]}
S.append({'title':'WildFire | CareLink','code':'O2S22M','titleX':20.4,'titleBaseline':506.244,'codeBaseline':489,'logo':{'x':616.5077,'top':9.546,'width':316.5023,'height':48.0003},'sections':[
section('team','About the Team / Organisation',38.66394,461.22,426.35,103,341,[
'A. Engineering team',
'<b>4</b> engineers + <b>1</b> doctor; third-year B.Tech IoT, YCCE.',
'<b>Siddharth Jamdhade</b>: lead architect; Gemini AI, OCR, RAG.',
'<b>Abhay Harne</b>: frontend; React portal, dashboard, 9-column care.',
'<b>Anaghraj Singh Thakur</b>: backend; FastAPI, ChromaDB, verification.',
'<b>Rajveer Rajput</b>: hardware; ESP32-C3, RFID-RC522, NFC wristband integration.',
'Yeshwantrao Chavan College of Engineering (YCCE), Nagpur.',
'RTM Nagpur University; Department: Internet of Things (IoT).',
'B. Doctor background and role (team-reported)',
'<b>Dr. Tanmay Gawali</b>: MBBS intern; clinical ANC validator.',
'Lokmanya Tilak Municipal Medical College & Hospital, Mumbai.',
'Reviewed 15 ANC templates and structured extraction formats.',
'Validated extraction accuracy and MoHFW four-visit protocol rules.',
'Tested verification edge cases and doctor review workflows.',
'Safety oversight: AI never makes clinical decisions.'
]),
section('problem','Problem Statement (use case specific)',38.66394,174.57,426.35,390,502,[
'Maternal health records fragment across facilities and referrals.',
'Paper ANC cards get lost, damaged, or forgotten.',
'Receiving hospitals lack accessible, longitudinal pregnancy histories.',
'WHO: India accounted for 7.2% of global maternal deaths (2023).',
'Users: nurses/ANMs, doctors, and pregnant patients.',
'Settings: PHCs, CHCs, district hospitals, private maternity clinics.',
'Missing gestational history complicates referral assessment and continuity.'
]),
section('solution','AI Solution Description',486.26,461.53,447.75,103,195,[
'₹50 NFC wristband links each registered patient’s pregnancy record.',
'Tap scanner; authenticated Doctor Portal retrieves records; <3 seconds reported.',
'Doctor Portal: directory, search; 9 care columns (labs/USG/ABHA/visits).',
'Upload ANC images; OCR and Gemini AI extract facts.',
'RAG suggests fields; nurses confirm, doctors review exceptions.',
'Verified data populates columns and strengthens the knowledge base.',
'Patient App planned: gestational progress, EDD, diet, 3D fetus.',
'Private patient credentials; app and voice remain in development.'
]),
section('technology','Technology and Tools Used',486.26,320.40,447.75,244,344,[
'NFC: ₹50 silicone wristband, RFID-RC522 reader, ESP32-C3.',
'AI: Gemini 2.5 Flash; PaddleOCR offline handwriting extraction.',
'RAG: ChromaDB, Gemini embeddings, 15 ANC templates, self-learning feedback.',
'Backend: Python 3.12, FastAPI, SQLAlchemy, SQLite/cloud sync.',
'Frontend: React 19, Framer Motion, Axios; Docker deployment.',
'Voice: Sarvam AI Hindi/Marathi; integration in progress.',
'Rules: MoHFW ANC minimum schedule; WHO guidance referenced.',
'Planned: ABDM/ABHA, DigiLocker, REST-based hospital integration.'
]),
section('features','Key Features of the solution',486.26,167.22,447.75,397,502,[
'₹50 NFC identification: reported <3-second retrieval at connected facilities.',
'OCR + Gemini AI: structured ANC facts, never diagnoses.',
'RAG auto-fill: 15 templates; 80% reported template matches.',
'Self-learning: clinician-approved corrections enrich the ChromaDB knowledge base.',
'ANC checks: flags missing tests for clinical verification.'
]) ]})
S.append({'title':'WildFire | CareLink','code':'O2S22M','titleX':17.906,'titleBaseline':494.57236,'codeBaseline':474,'logo':{'x':625.29776,'top':12,'width':316.50227,'height':48.0003},'sections':[
section('sprint','Build Sprint Progress',59.25598,440.87,397.10,123,228,[
'Week 1: FastAPI/SQLite, PaddleOCR, Gemini AI extraction.',
'Week 2: 3 conflict checks, ANC rules, confidence badges.',
'Week 3: 15-template RAG, ChromaDB, NFC scanner prototype.',
'Week 4: Doctor Portal, 9 columns, accounts, cloud sync.',
'NFC wristband-to-record flow tested end-to-end; doctor queue operational.',
'Evolution: OCR, AI, RAG, then band-and-portal platform.',
'In progress: Patient App and Sarvam Hindi/Marathi voice.',
'Planned app: gestational tracker, EDD, diet, 3D baby.'
]),
section('validation','User Validation and AI Evaluation',59.25598,290.12,397.10,275,477,[
'Reported tests: 20+ synthetic ANC images; 15 RAG scenarios.',
'3 tested conflict types: 100% detected; limited sample.',
'Extraction accuracy: 85-92%; RAG template matches: 80%.',
'Unnecessary doctor-review routing: <5% reported.',
'ANC flag accuracy: 100% reported; denominator unavailable.',
'NFC tap-to-record: <3 seconds; 4 test patients registered.',
'Data-entry reduction: ~87% target, 15 to 2 minutes.',
'Doctor feedback: handoff enables history before consultation.',
'Improvements: confidence badges, danger-sign checklist, 12→3 routine clicks.',
'RAG mismatch: doctor review before any verified save.',
'Limitations: faded OCR documents; pregnancy-only knowledge base.',
'No real-PHC clinical validation; Patient App unfinished.',
'Performance figures reported; raw logs and denominators unavailable.'
]),
section('safety','Safety and Responsible AI',474.29,440.47,414.75,123,224,[
'AI never diagnoses, prescribes, or scores clinical risk.',
'Every extraction UNVERIFIED until mandatory human confirmation.',
'Danger signs: 0% confidence; mandatory doctor review.',
'Low-confidence RAG mismatches route to doctor verification.',
'NFC stores link only; authenticated portal authorizes record access.',
'Consent and identifier redaction required before cloud AI processing.',
'Planned app access restricted to each patient’s own records.',
'₹50 NFC tap reduces literacy barriers; voice in progress.'
]),
section('deployment','Deployment and Sustainability Plan',474.29,294.37,414.75,269,357,[
'PHC setup: computer, internet, Android phone, ₹1,500 scanner.',
'Per patient: reusable ₹50 NFC wristband.',
'Facility setup: ~₹4,300, including first-year domain and training.',
'Monthly: ₹0-1,300; API target ~₹0.35/record, usage dependent.',
'Scale: 1 Nagpur PHC, 5 PHCs, proposed NHM rollout.',
'Planned national open-source adoption; subsidies and partners remain prospective.',
'Planned integrations: ABDM/ABHA, DigiLocker, hospital REST APIs.',
'Pilot estimates exclude devices, internet, support, production infrastructure.'
]),
section('links','Supporting Links',473.29,163.42,415.75,401,459,[
'MVP: carelink-hospital-portal-sj.jamdhadesiddharth69.chatgpt.site',
'Code: github.com/Siddharth-Jamdhade/CareLink',
'Demo walkthrough: link pending',
'Knowledge base: 15 templates, 8 symptom maps (team-reported).',
'Evidence: WHO MMEIG 2025; MoHFW ANC standards.'
]) ]})
for page in S:
 for sec in page['sections']:
  for item in sec['items']:
   value=re.sub(r'</?b>','',item['text']);count=len(value.split())
   if item['kind']=='bullet' and count>10:print('LONG',sec['key'],count,value)
Path('tmp/armann-summary/content.json').write_text(json.dumps(S,indent=2,ensure_ascii=False),encoding='utf-8')
print('Saved summary copy for 2 slides')
