import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide8-sprint-update';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
const blue='#1F3DA9',green='#0D8743',gray='#232F3E';
function text(name,t,x,y,w,h,size=23,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:font,fontSize:size,color,bold,alignment};return q;
}
function rect(name,x,y,w,h,color=blue,r=0){return s.shapes.add({geometry:r?'roundRect':'rect',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:color,width:2},...(r?{borderRadius:r}:{})});}
const weeks=[
 ['Foundation',['FastAPI + SQLite','PaddleOCR integration','Gemini AI extraction']],
 ['Intelligence Layer',['Three conflict checks','MoHFW ANC checker','Confidence + review']],
 ['RAG + NFC Hardware',['15 knowledge base\ntemplates','ChromaDB + RAG\npipeline','ESP32 + RFID-RC522\nNFC scanner prototype']],
 ['Portals + Integration',['Doctor Portal: directory\n+ 9 record columns','NFC band → scanner →\npatient auto-load','Patient account\ncreation (unique ID)']]
];
weeks.forEach(([title,items],i)=>{
 const x=50+i*305;
 rect('Week '+(i+1)+' timeline card',x,124,265,280,blue,12);
 text('Week '+(i+1),'WEEK '+(i+1),x+12,138,241,39,30,blue,true,'Arial','center');
 text('Week theme '+i,title,x+10,183,245,32,22,gray,true,'Arial','center');
 items.forEach((b,j)=>{
  const y=(i<2?235:225)+j*(i<2?52:59);
  text('Complete icon '+i+' '+j,'✓',x+14,y-2,23,34,27,green,true,'Arial');
  text('Milestone '+i+' '+j,b,x+43,y,211,i<2?34:55,22,gray);
 });
 if(i<3)s.shapes.add({geometry:'rightArrow',name:'Week progression '+i,position:{left:x+276,top:252,width:24,height:20},fill:blue,line:{fill:'none',width:0}});
});
async function photo(name,path,x,y,w,h,crop){const b=await fs.readFile(path);s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/jpeg',alt:name,fit:'contain',position:{left:x,top:y,width:w,height:h},crop});}
await photo('AI extraction table screenshot','C:/Users/SIDDHARTH/Downloads/WhatsApp Image 2026-11-06 at 22.05.06 (2).jpeg',50,423,265,136,{left:0.04,top:0.075,right:0.13,bottom:0.285});
await photo('Missing ANC record flags screenshot','C:/Users/SIDDHARTH/Downloads/WhatsApp Image 2026-11-07 at 09.45.56.jpeg',355,423,265,136,{left:0.04,top:0.62,right:0.04,bottom:0.165});
text('Extraction evidence caption','AI-extracted structured data\nfrom handwritten ANC card',50,564,265,49,20,gray,false,'Calibri','center');
text('ANC flags evidence caption','Auto-flags missing ANC records\nagainst MoHFW protocol',355,564,265,49,20,gray,false,'Calibri','center');
text('Completed milestone legend','✓ Completed milestones',660,428,265,32,21,green,true,'Calibri','center');
rect('Patient app and voice progress',965,424,265,99,blue,8);
text('Patient app and voice status','↻ Patient App +\nSarvam voice —\nin progress',979,432,237,84,23,blue,true,'Calibri','center');
text('Evolution heading','SOLUTION EVOLUTION',50,610,1180,28,24,blue,true,'Arial');
const stages=[{x:50,w:225,label:'OCR only'},{x:283,w:225,label:'OCR+AI'},{x:516,w:270,label:'OCR+AI+RAG'},{x:794,w:436,label:'Full Platform (Band + Portal + App)'}];
stages.forEach(({x,w,label},i)=>{
 s.shapes.add({geometry:'chevron',name:'Evolution stage '+i,position:{left:x,top:641,width:w,height:43},fill:i===3?green:blue,line:{fill:'#FFFFFF',width:1}});
 text('Evolution label '+i,label,x+34,i===3?651:649,w-64,32,i===3?21:24,'#FFFFFF',true,'Arial','center');
});
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created updated four-week timeline and evidence crops');
