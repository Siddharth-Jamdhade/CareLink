import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const dir='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide11-design';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();s.background.fill='#FFFFFF';
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',light='#5D6A79';
function text(name,t,x,y,w,h,size=25,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={fontFamily:font,fontSize:size,color,bold,alignment};return q;
}
const cols=[
 ['3 Months',blue,['Complete Sarvam voice integration','Nagpur PHC pilot','Postnatal + neonatal knowledge base']],
 ['6–12 Months',green,['ABDM ecosystem integration','Hindi, Marathi, Telugu, Tamil','Zero-connectivity PWA','ESP32 live vitals capture']],
 ['Long-term Vision',gray,['National open-source platform','NHM Maharashtra partnership','TB, diabetes + pediatrics']]
];
cols.forEach(([heading,color,bullets],i)=>{
 const x=50+i*405;
 s.shapes.add({geometry:'rect',name:'Roadmap column '+i,position:{left:x,top:157,width:370,height:329},fill:'#FFFFFF',line:{fill:color,width:2}});
 s.shapes.add({geometry:'rect',name:'Roadmap tab '+i,position:{left:x,top:157,width:370,height:67},fill:color,line:{fill:color,width:0}});
 text('Roadmap heading '+i,heading,x+12,174,346,42,i===2?29:32,'#FFFFFF',true,'Arial','center');
 bullets.forEach((b,j)=>{
  text('Roadmap bullet marker '+i+' '+j,'•',x+18,252+j*54,20,35,25,color,true);
  text('Roadmap milestone '+i+' '+j,b,x+44,252+j*54,310,49,24,gray);
 });
});
s.shapes.add({geometry:'rightArrow',adjustmentList:[{name:'adj1',formula:'val 85000'}],name:'Pilot-to-national roadmap arrow',position:{left:50,top:539,width:1180,height:67},fill:blue,line:{fill:'none',width:0}});
text('Rollout vision','PHC Pilot → State Scale → National Open-Source Platform',70,558,1090,42,30,'#FFFFFF',true,'Arial','center');
text('Public availability commitment','Open-source commitment: YES',50,646,515,33,25,green,true,'Arial');
const link=text('GitHub repository','🔗 github.com/Siddharth-Jamdhade/CareLink',605,650,625,31,22,blue,false,'Calibri','right');
link.hyperlink={uri:'https://github.com/Siddharth-Jamdhade/CareLink',isExternal:true};
s.speakerNotes.text='Roadmap supplied by user. Three-month, 6-12-month and long-term items are planned, not delivered functionality or secured partnerships. ABDM integration is proposed; no certification or approval claimed. Offline-first/zero-connectivity PWA does not imply cloud Gemini or cloud speech transcription can operate offline. ESP32 live vitals capture requires appropriate sensors, engineering validation and clinician review; current NFC wristband is identification hardware, not a validated vital-sign monitor. National-first novelty claim omitted because it was not substantiated. Open-source release is a commitment supplied by user. Repository URL https://github.com/Siddharth-Jamdhade/CareLink was supplied by user; public availability and license could not be verified in this session. Columns and roadmap arrow are editable native PowerPoint shapes, not native SmartArt.';
await(await PresentationFile.exportPptx(p)).save(dir+'/content.pptx');
await fs.writeFile(dir+'/content.png',new Uint8Array(await(await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
console.log('Slide 11 content created');

