import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const dir='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide9-design';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();s.background.fill='#FFFFFF';
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',light='#5D6A79',red='#C62828',orange='#D97706';
function text(name,t,x,y,w,h,size=24,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={fontFamily:font,fontSize:size,color,bold,alignment};return q;
}
function rect(name,x,y,w,h,color,radius=0){s.shapes.add({geometry:radius?'roundRect':'rect',name,position:{left:x,top:y,width:w,height:h},fill:'#FFFFFF',line:{fill:color,width:2},...(radius?{borderRadius:radius}:{})});}
[[50,blue],[455,orange],[860,green]].forEach(([x,color],i)=>rect('Safeguard card '+i,x,146,370,260,color,10));
text('Privacy heading','🔒 Data Privacy',69,170,332,42,28,blue,true,'Arial');
text('Limitations heading','⚠️ AI Limitations',474,170,332,42,28,orange,true,'Arial');
text('Oversight heading','👁️ Human Oversight',879,170,332,42,27,green,true,'Arial');
const privacy=['Consent before digitization','SQLite + cloud AI processing','Redaction + training: verify'];
privacy.forEach((t,i)=>text('Privacy point '+i,'• '+t,70,236+i*51,330,45,22,gray));
const limits=['OCR → UNVERIFIED facts','Hallucinations → source checks','RAG mismatch → doctor review'];
limits.forEach((t,i)=>text('AI limitation '+i,'• '+t,475,236+i*51,330,45,22,gray));
['AI\nsuggests','Nurse\nreviews','Doctor\nverifies'].forEach((label,i)=>{
 const x=879+i*111;
 rect('Review stage '+i,x,235,98,66,green,7);
 text('Review stage label '+i,label,x+5,244,88,52,18,green,true,'Arial','center');
 if(i<2)s.shapes.add({geometry:'rightArrow',name:'Review connector '+i,position:{left:x+100,top:260,width:10,height:14},fill:green,line:{fill:'none',width:0}});
});
text('Flagged case review','Flagged cases → doctor',880,323,330,30,22,gray,false,'Calibri','center');
text('Corrections feedback','Corrections → knowledge base',880,362,330,30,22,gray,false,'Calibri','center');
rect('Absolute safety rules',50,441,1180,178,red);
text('Safety rules heading','NON-NEGOTIABLE SAFETY RULES',72,454,1136,31,24,red,true,'Arial');
text('Never diagnose rule','🚫 AI NEVER diagnoses, prescribes, or scores risk.',72,495,1136,43,34,red,true,'Arial');
text('Human confirmation rule','🚫 Human confirmation before record finalization.',72,544,1136,35,27,gray,true,'Arial');
text('Danger signs rule','🚫 Detected danger signs → 0% match confidence → doctor.',72,582,1136,34,26,gray,true,'Arial');
text('Accessibility line','♿ Hindi/Marathi voice: in progress • Large buttons • Low-end phones • Offline OCR; cloud AI/voice online',50,645,1180,30,20,light,false,'Calibri','center');
s.speakerNotes.text='Source review: carelink-handoff/backend/app/services/llm_extractor.py sends document image bytes and OCR text to Gemini. No identifier redaction is apparent in this extraction function. Extraction includes administrative facts and verbatim documented diagnoses/symptoms/medications, with no clinical inference, diagnosis, risk scoring, treatment advice or numeric clinical measurement extraction. carelink-handoff/backend/app/routers/records.py persists unverified/conflict drafts before review. Human confirmation before finalization is the safety boundary; never auto-saves would misstate draft persistence. carelink-handoff/backend/rag_pipeline.py sets retrieval confidence to zero and routes configured detected danger signs to the doctor. Retrieval similarity is not a clinical accuracy or risk probability. No claim of perfect danger-sign detection, a fixed 20% doctor review rate, no cloud transmission or verified provider no-training terms is made. Voice remains in progress per supplied sprint status. Consent and privacy requirements are design commitments; full implementation and provider-policy compliance were not audited.';
await(await PresentationFile.exportPptx(p)).save(dir+'/content.pptx');
await fs.writeFile(dir+'/content.png',new Uint8Array(await(await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
console.log('Slide 9 content created');

