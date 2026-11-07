import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const dir='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide5-design';
const p=Presentation.create({slideSize:{width:1280,height:720}});
const s=p.slides.add();s.background.fill='#FFFFFF';
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',light='#5D6A79';
function text(name,t,x,y,w,h,size=24,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={fontFamily:font,fontSize:size,color,bold,alignment};return q;
}
text('Solution equation','CareLink = Digitize Past + Smart-Enter Present + QR Handoff',50,148,1180,48,30,gray,true,'Arial');
const features=[
 ['📸','AI Document Scanning','ANC photo → structured data',blue],
 ['🧠','RAG Smart Entry','Knowledge base prefills forms',blue],
 ['🔍','Conflict Detection','Dates, duplicates, mismatches',green],
 ['✅','Doctor Verification','Edge cases flagged for review',green],
 ['📱','QR Code Handoff','Scan QR → patient summary',blue],
 ['🔄','Self-Learning Loop','Doctor feedback improves forms',green]
];
features.forEach(([icon,name,desc,color],i)=>{
 const x=50+(i%2)*390,y=225+Math.floor(i/2)*126;
 s.shapes.add({geometry:'rect',name:name+' card',position:{left:x,top:y,width:370,height:110},fill:'#FFFFFF',line:{fill:color,width:2}});
 text(name+' icon',icon,x+16,y+15,43,42,31,color);
 text(name+' heading',name,x+68,y+20,288,34,24,color,true,'Arial');
 text(name+' description',desc,x+18,y+72,337,29,21,gray);
});
const bytes=await fs.readFile('C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/output/imagegen/carelink-nfc-identification-illustration.png');
s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:'image/png',alt:'AI-generated flat illustration of pregnant woman wearing NFC wristband and doctor viewing patient history',fit:'contain',position:{left:845,top:236,width:385,height:310}});
text('Illustration caption','NFC + QR patient identification',845,555,385,30,22,blue,true,'Arial','center');
text('Illustration disclosure','AI-generated concept illustration',845,588,385,24,16,light,false,'Calibri','center');
s.speakerNotes.text='User-supplied CareLink feature descriptions. No independently validated time savings, 80/20 split or automatic model improvement measurements supplied. Self-learning card describes a proposed doctor-feedback loop. Built-in imagegen illustration saved as output/imagegen/carelink-nfc-identification-illustration.png. Illustration is conceptual; actual NFC identification requires close-range tapping. QR code is illustrative. Bottom region intentionally reserved for a later editable workflow.';
await(await PresentationFile.exportPptx(p)).save(dir+'/content.pptx');
await fs.writeFile(dir+'/content.png',new Uint8Array(await(await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
console.log('Slide 5 content created');

