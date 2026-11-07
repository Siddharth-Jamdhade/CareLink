import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide4-hero';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',light='#5D6A79',red='#C62828';
function text(name,t,x,y,w,h,size=24,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:font,fontSize:size,color,bold,alignment};return q;
}
function rect(name,x,y,w,h,color,fill='none',width=2){return s.shapes.add({geometry:'rect',name,position:{left:x,top:y,width:w,height:h},fill,line:{fill:color,width}});}
const users=[{x:50,icon:'👩‍⚕️',role:'Nurses / ANMs',action:'Feeds data',detail:'Tap → preloaded form',color:blue},{x:460,icon:'👨‍⚕️',role:'PHC / CHC Doctors',action:'Verifies cases',detail:'Flags + summaries',color:blue},{x:870,icon:'🏥',role:'Referral Hospital Doctors',action:'Scans QR',detail:'Patient history',color:green}];
users.forEach((u,i)=>{
 rect('User card '+i,u.x,108,360,153,u.color);
 text('User icon '+i,u.icon,u.x+155,116,50,35,30,u.color,false,'Calibri','center');
 text('User role '+i,u.role,u.x+10,153,340,29,23,gray,true,'Arial','center');
 text('User action '+i,u.action,u.x+10,187,340,34,29,u.color,true,'Arial','center');
 text('Workflow detail '+i,u.detail,u.x+10,226,340,26,22,light,false,'Calibri','center');
});
[421,831].forEach((x,i)=>s.shapes.add({geometry:'rightArrow',name:'Workflow arrow '+i,position:{left:x,top:179,width:28,height:24},fill:blue,line:{fill:'none',width:0}}));
rect('NFC wristband hero',50,277,1180,224,blue,'none',3);
text('Core product headline','🏷️ ₹50 NFC WRISTBAND — The Core Product',65,287,1150,45,33,blue,true,'Arial','center');
text('Hero registration','Every patient gets one at registration',305,344,690,34,27,gray);
text('Hero tap workflow','Nurse taps scanner → record auto-loads',305,385,690,34,27,gray);
text('Hero tap simplicity','No manual ID. No barcodes. One tap.',305,426,690,34,27,green,true);
async function photo(name,path,x,y,w,h){const b=await fs.readFile(path);s.images.add({name,blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:path.endsWith('.png')?'image/png':'image/jpeg',alt:name,fit:'contain',position:{left:x,top:y,width:w,height:h}});}
await photo('Blue NFC silicone wristband','C:/Users/SIDDHARTH/OneDrive/Pictures/Screenshots/Screenshot 2026-11-07 164035.png',67,322,214,143);
await photo('In-house RFID-RC522 scanner prototype','C:/Users/SIDDHARTH/Downloads/WhatsApp Image 2026-11-07 at 16.42.36.jpeg',1010,320,202,151.5);
text('Hardware caption','₹50 NFC Band + RFID-RC522 Scanner — built in-house',80,473,1120,25,21,gray,true,'Calibri','center');
text('Illustrative case','Illustrative case: Lakshmi, 26 • 32 weeks',50,509,1180,28,23,gray,true,'Arial');
text('Presenting scenario','Severe headache • District Hospital • Paper records at home',50,538,1180,25,22,light);
rect('Before panel',50,570,570,108,red,red,0);
rect('After panel',660,570,570,108,green,green,0);
text('Before heading','WITHOUT CareLink',72,576,530,30,26,'#FFFFFF',true,'Arial');
text('After heading','WITH CareLink',682,576,530,30,26,'#FFFFFF',true,'Arial');
text('Before point 1','✕  Paper records unavailable',72,612,530,27,23,'#FFFFFF');
text('Before point 2','✕  Missing history slows assessment',72,643,530,27,23,'#FFFFFF');
text('After point 1','✓  QR scan retrieves pregnancy history',682,605,530,29,23,'#FFFFFF');
text('After point 2','✓  30-second history access target',682,628,530,29,23,'#FFFFFF');
text('After NFC point','🏷️ Tap wristband → patient ID auto-loaded',682,651,530,29,22,'#FFFFFF');
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created Slide 4 hero content');

