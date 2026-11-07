import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide5-hero';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',muted='#5D6A79';
function text(name,t,x,y,w,h,size=24,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:font,fontSize:size,color,bold,alignment};return q;
}
function rect(name,x,y,w,h,color,fill='none',width=1.5,style='solid'){return s.shapes.add({geometry:'rect',name,position:{left:x,top:y,width:w,height:h},fill,line:{fill:color,width,style}});}
const cols=[{x:50,icon:'🏷️',title:'NFC Wristband (₹50)',color:blue},{x:455,icon:'🖥️',title:'Doctor Portal (Website)',color:blue},{x:860,icon:'📱',title:'Patient App',color:green}];
for(const [i,c] of cols.entries()){
 rect('Column '+i,c.x,120,370,520,c.color,'none',1.5);
 text('Column icon '+i,c.icon,c.x+155,131,60,48,39,c.color,false,'Calibri','center');
 text('Column title '+i,c.title,c.x+12,183,346,37,27,c.color,true,'Arial','center');
}
function bullet(name,t,x,y,h=31){text(name+' bullet','•',x,y,17,h,24,green);return text(name,t,x+20,y,320,h,24,gray);}
const wrist=['Silicone band with NFC chip','Given at registration','Tap scanner → auto-identify','Links to cloud patient record','Cost: ₹50 per band'];
wrist.forEach((t,i)=>bullet('Wristband feature '+i,t,68,235+i*37));
const doctor=[['Password-protected workspace',235,31],['Patient directory + search',272,31],['9 columns: Labs, USG, ABHA,\nSupplements, etc.',309,57],['RAG-assisted data entry',371,31],['Doctor review queue',408,31],['Upload + AI extraction',445,31]];
doctor.forEach(([t,y,h],i)=>bullet('Doctor feature '+i,t,473,y,h));
const patient=[['Unique ID + password\nat registration',235,57],['Pregnancy progress tracker',297,31],['EDD, diet plans, 3D baby view',334,31],['Appointment reminders',371,31],['Private: sees ONLY own data',408,31]];
patient.forEach(([t,y,h],i)=>bullet('Patient feature '+i,t,878,y,h));
async function photo(name,path,x,y,w,h,crop){const b=await fs.readFile(path);return s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt:name,fit:'contain',position:{left:x,top:y,width:w,height:h},...(crop?{crop}:{})});}
await photo('Blue NFC silicone wristband','C:/Users/SIDDHARTH/OneDrive/Pictures/Screenshots/Screenshot 2026-11-07 164035.png',102,450,266,177);
await photo('Doctor Portal dashboard','C:/Users/SIDDHARTH/OneDrive/Pictures/Screenshots/Screenshot 2026-11-07 164805.png',470,478,340,145);
rect('Patient app development placeholder',880,449,330,76,'#7C858D','#F2F2F2',1.5,'dash');
text('Patient app status','App — Under Development',892,469,306,37,23,gray,true,'Calibri','center');
await photo('Patient account creation confirmation','C:/Users/SIDDHARTH/OneDrive/Pictures/Screenshots/Screenshot 2026-11-06 230659.png',886,533,318,78,{left:0,top:0,right:0,bottom:0.755});
text('Account creation proof label','Portal account creation proof',878,615,334,24,18,muted,false,'Calibri','center');
rect('CareLink product equation bar',50,651,1180,34,blue,blue,0);
text('CareLink product equation','CareLink = ₹50 Band + Doctor Portal + Patient App + AI Engine',62,653,1156,31,25,'#FFFFFF',true,'Calibri','center');
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created editable three-column content');
