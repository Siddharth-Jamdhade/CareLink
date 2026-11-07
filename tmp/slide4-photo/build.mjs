import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const dir='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide4-photo';
const p=Presentation.create({slideSize:{width:1280,height:720}});
const s=p.slides.add();s.background.fill='#FFFFFF';
const blue='#1F3DA9',gray='#232F3E',light='#5D6A79',green='#0D8743',red='#C62828';
function text(name,t,x,y,w,h,size=26,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={fontFamily:font,fontSize:size,color,bold,alignment};return q;
}
function rect(name,x,y,w,h,color,fill='#FFFFFF'){
 return s.shapes.add({geometry:'rect',name,position:{left:x,top:y,width:w,height:h},fill,line:{fill:color,width:2}});
}
const users=[
 {x:50,icon:'👩‍⚕️',role:'Nurses / ANMs',action:'Feeds data',detail:'Tap → preloaded form',color:blue},
 {x:360,icon:'👨‍⚕️',role:'PHC / CHC Doctors',action:'Verifies cases',detail:'Flags + summaries',color:blue},
 {x:670,icon:'🏥',role:'Referral Hospital Doctors',action:'Scans QR',detail:'Patient history',color:green}
];
users.forEach((u,i)=>{
 rect('User card '+i,u.x,136,260,200,u.color);
 text('User icon '+i,u.icon,u.x+95,146,70,65,48,u.color,false,'Calibri','center');
 text('User role '+i,u.role,u.x+12,216,236,32,i===2?18:20,gray,true,'Arial','center');
 text('User action '+i,u.action,u.x+12,254,236,42,29,u.color,true,'Arial','center');
 text('Workflow detail '+i,u.detail,u.x+12,301,236,28,20,light,false,'Calibri','center');
});
[320,630].forEach((x,i)=>s.shapes.add({geometry:'rightArrow',name:'Workflow arrow '+i,position:{left:x,top:230,width:30,height:24},fill:blue,line:{fill:'none',width:0}}));
const photo=await fs.readFile('C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/output/imagegen/carelink-nfc-hospital.png');
s.images.add({blob:photo.buffer.slice(photo.byteOffset,photo.byteOffset+photo.byteLength),contentType:'image/png',alt:'AI-generated illustration of nurse tapping a CareLink NFC wristband',fit:'contain',position:{left:980,top:136,width:250,height:167}});
text('AI image disclosure','AI-generated illustration',980,305,250,22,15,light,false,'Calibri','center');
text('Hardware caption','ESP32-C3 NFC Patient Wristband — built in-house',980,329,250,48,17,gray,false,'Calibri','center');
text('Illustrative case','Illustrative case: Lakshmi, 26 • 32 weeks',50,365,1180,36,27,gray,true,'Arial');
text('Presenting scenario','Severe headache • District Hospital • Paper records at home',50,405,1180,34,25,light);
rect('Before panel',50,453,570,194,red,red);
rect('After panel',660,453,570,194,green,green);
text('Before heading','WITHOUT CareLink',74,470,520,38,29,'#FFFFFF',true,'Arial');
text('After heading','WITH CareLink',684,470,520,38,29,'#FFFFFF',true,'Arial');
text('Before point 1','✕  Paper records unavailable',74,518,520,36,27,'#FFFFFF');
text('Before point 2','✕  Missing history slows assessment',74,562,520,36,27,'#FFFFFF');
text('After point 1','✓  QR scan retrieves pregnancy history',684,518,520,36,27,'#FFFFFF');
text('After point 2','✓  30-second history access target',684,562,520,36,27,'#FFFFFF');
text('After NFC point','🏷️ Tap wristband → patient ID auto-loaded',684,606,520,34,24,'#FFFFFF');
text('Settings','PHCs • CHCs • District Hospitals • Private Clinics • Urban Slum Centres',50,657,1180,23,19,light,false,'Calibri','center');
s.speakerNotes.text='Illustrative, fictional workflow scenario supplied by the user. The 30-second history retrieval is a design/performance target, not a measured result. The proposed workflow supports access to records, clinician review and assessment; it does not promise immediate treatment or a quantified reduction in treatment delay. Support staff may assist data entry within local role permissions. No real patient data is shown.';
await(await PresentationFile.exportPptx(p)).save(dir+'/content.pptx');
await fs.writeFile(dir+'/content.png',new Uint8Array(await(await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
console.log('Slide 4 content created');



