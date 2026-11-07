import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide6-nfc-flow';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
const blue='#1F3DA9',green='#0D8743',gray='#232F3E';
function text(name,t,x,y,w,h,size=24,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:font,fontSize:size,color,bold,alignment};return q;
}
function rect(name,x,y,w,h,color=blue,width=2){return s.shapes.add({geometry:'rect',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:color,width}});}
function line(name,x,y,w,h,arrow=false,color=blue,width=2.5){return s.shapes.add({geometry:'connector',name,kind:'straight',position:{left:x,top:y,width:w,height:h},line:{fill:color,width},...(arrow?{tail:{type:'triangle',width:'med',length:'med'}}:{})});}
rect('Primary NFC input',470,106,360,86,green,3);
text('NFC primary label','🏷️ NFC WRISTBAND',480,112,340,39,31,green,true,'Arial','center');
text('NFC scan action','Patient taps scanner',480,153,340,31,25,gray,false,'Calibri','center');
line('Primary NFC down arrow',650,192,0,32,true,green,3);
rect('CareLink AI engine',490,224,320,154,blue,2.5);
text('AI engine heading','CARELINK AI',506,232,288,35,29,blue,true,'Arial','center');
text('OCR engine','PaddleOCR',506,275,288,29,25,gray,false,'Calibri','center');
text('Gemini engine','Gemini 2.5',506,307,288,29,25,gray,false,'Calibri','center');
text('RAG engine','RAG Pipeline',506,339,288,29,25,gray,false,'Calibri','center');
rect('Secondary photo input',100,238,245,55);
text('Photo input label','📸 Upload Photo',110,247,225,38,27,blue,true,'Calibri','center');
rect('Secondary voice input',100,315,245,55);
text('Voice input label','🎤 Voice Input',110,324,225,38,27,blue,true,'Calibri','center');
line('Photo to AI',345,265.5,145,0,true);
line('Voice to AI',345,342.5,145,0,true);
line('AI to branch',650,378,0,23);
line('Portal split',385,401,645,0);
line('Doctor branch',385,401,0,24,true);
line('Patient branch',1030,401,0,24,true);
rect('Doctor Portal output',220,425,330,70,blue,2.5);
text('Doctor Portal label','🖥️ DOCTOR PORTAL',230,430,310,35,27,blue,true,'Arial','center');
text('Doctor record columns','9 record columns',230,465,310,28,24,gray,false,'Calibri','center');
rect('Patient App output',860,425,340,70,green,2.5);
text('Patient App label','📱 PATIENT APP',870,430,320,35,27,green,true,'Arial','center');
text('Patient pregnancy dashboard','Pregnancy dashboard',870,465,320,28,24,gray,false,'Calibri','center');
line('Doctor to verification',385,495,0,17,true,green);
text('Matched record outcome','✅ RAG match → Verified → stored to columns',65,515,535,34,24,green);
text('New information outcome','🔄 New info → Doctor review → RAG learns',65,551,535,34,24,blue);
const img=await fs.readFile('C:/Users/SIDDHARTH/OneDrive/Pictures/Screenshots/Screenshot 2026-11-07 163830.png');
s.images.add({blob:img.buffer.slice(img.byteOffset,img.byteOffset+img.byteLength),contentType:'image/png',alt:'Care at a glance Doctor Portal screenshot',fit:'contain',position:{left:610,top:415,width:180,height:156}});
text('Care screenshot caption','Care at a glance',610,573,180,23,17,gray,false,'Calibri','center');
text('Target impact qualification','TARGET IMPACT • Pilot validation pending',50,599,1180,27,22,gray,true,'Calibri');
const stats=[['87%','Faster Entry'],['100%','Digital'],['30 sec','Handoff'],['Self-Learning','']];
stats.forEach(([value,label],i)=>{
 const x=50+i*300;rect('Impact card '+i,x,630,280,52,blue,1.5);
 if(label){text('Impact value '+i,value,x+10,631,260,30,29,blue,true,'Arial','center');text('Impact label '+i,label,x+10,661,260,22,19,gray,false,'Calibri','center');}
 else text('Impact value '+i,value,x+10,640,260,36,28,blue,true,'Arial','center');
});
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created editable NFC-first flowchart');
