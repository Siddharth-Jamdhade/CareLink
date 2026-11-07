import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide1-edit';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
function text(name,t,x,y,w,h,size,color,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:font,fontSize:size,color,bold,alignment};return q;
}
text('CareLink title','CareLink',125,294,1030,112,96,'#1F3DA9',true,'Arial','center');
text('CareLink subtitle','NFC-Powered Maternal Health Platform —\nAI Record Digitization, RAG Smart Entry & Secure Handoff',125,414,1030,76,28,'#232F3E',false,'Calibri','center');
text('CareLink team name','TEAM NAME  Siddharth Jamdhade (Solo)',150,548,615,40,23,'#0D8743',true);
text('CareLink team code','TEAM CODE  [my code]',780,548,270,40,23,'#1F3DA9',true);
text('CareLink tagline',"₹50 band. One tap. Every mother's story — safe.",150,612,880,38,26,'#0D8743');
const img=await fs.readFile('C:/Users/SIDDHARTH/OneDrive/Pictures/Screenshots/Screenshot 2026-11-07 164035.png');
s.images.add({blob:img.buffer.slice(img.byteOffset,img.byteOffset+img.byteLength),contentType:'image/png',alt:'Blue NFC silicone wristband',fit:'contain',position:{left:1060,top:546,width:166,height:122}});
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created editable slide content');

