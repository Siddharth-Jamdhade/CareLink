import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide10-nfc-privacy';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
const blue='#1F3DA9',green='#0D8743',gray='#232F3E';
function text(name,t,x,y,w,h,size=20,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:font,fontSize:size,color,bold,alignment};return q;
}
['• Consent before digitization','• SQLite + cloud AI processing','• Redaction + training: verify'].forEach((v,i)=>text('Existing privacy point '+i,v,70,208+i*22,330,23,18,gray));
const points=[['NFC band stores ONLY a unique link —\nno medical data on the band',278],['Band is useless without hospital scanner\n+ authenticated portal',320],['Patient App shows ONLY their own data\n— no cross-patient access',362]];
points.forEach(([v,y],i)=>{text('NFC privacy lock '+i,'🔒',67,y-1,23,28,17,blue);text('NFC privacy point '+i,v,92,y,313,42,17.5,gray);});
text('NFC affordability accessibility','♿ ₹50 band — affordable for all economic backgrounds',50,655,680,28,20,gray);
text('NFC literacy accessibility','♿ NFC = no literacy needed — just tap',755,655,475,28,20,gray);
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created focused privacy and accessibility additions');
