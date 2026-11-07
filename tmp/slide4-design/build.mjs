import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const dir='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide4-design';
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
 {x:50,icon:'👩‍⚕️',role:'Nurses / ANMs',action:'Feeds data',detail:'AI forms',color:blue},
 {x:470,icon:'👨‍⚕️',role:'PHC / CHC Doctors',action:'Verifies cases',detail:'Flags + summaries',color:blue},
 {x:890,icon:'🏥',role:'Referral Hospital Doctors',action:'Scans QR',detail:'Patient history',color:green}
];
users.forEach((u,i)=>{
 rect('User card '+i,u.x,136,340,210,u.color);
 text('User icon '+i,u.icon,u.x+135,146,70,65,48,u.color,false,'Calibri','center');
 text('User role '+i,u.role,u.x+12,216,316,32,23,gray,true,'Arial','center');
 text('User action '+i,u.action,u.x+12,257,316,42,33,u.color,true,'Arial','center');
 text('Workflow detail '+i,u.detail,u.x+12,305,316,28,22,light,false,'Calibri','center');
});
[405,825].forEach((x,i)=>s.shapes.add({geometry:'rightArrow',name:'Workflow arrow '+i,position:{left:x,top:230,width:50,height:24},fill:blue,line:{fill:'none',width:0}}));
text('Illustrative case','Illustrative case: Lakshmi, 26 • 32 weeks',50,369,1180,36,27,gray,true,'Arial');
text('Presenting scenario','Severe headache • District Hospital • Paper records at home',50,409,1180,34,25,light);
rect('Before panel',50,462,570,159,red,red);
rect('After panel',660,462,570,159,green,green);
text('Before heading','WITHOUT CareLink',74,479,520,38,29,'#FFFFFF',true,'Arial');
text('After heading','WITH CareLink',684,479,520,38,29,'#FFFFFF',true,'Arial');
text('Before point 1','✕  Paper records unavailable',74,531,520,36,27,'#FFFFFF');
text('Before point 2','✕  Missing history slows assessment',74,573,520,36,27,'#FFFFFF');
text('After point 1','✓  QR scan retrieves pregnancy history',684,531,520,36,27,'#FFFFFF');
text('After point 2','✓  30-second history access target',684,573,520,36,27,'#FFFFFF');
text('Settings','PHCs • CHCs • District Hospitals • Private Clinics • Urban Slum Centres',50,645,1180,27,21,light,false,'Calibri','center');
s.speakerNotes.text='Illustrative, fictional workflow scenario supplied by the user. The 30-second history retrieval is a design/performance target, not a measured result. The proposed workflow supports access to records, clinician review and assessment; it does not promise immediate treatment or a quantified reduction in treatment delay. Support staff may assist data entry within local role permissions. No real patient data is shown.';
await(await PresentationFile.exportPptx(p)).save(dir+'/content.pptx');
await fs.writeFile(dir+'/content.png',new Uint8Array(await(await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
console.log('Slide 4 content created');
