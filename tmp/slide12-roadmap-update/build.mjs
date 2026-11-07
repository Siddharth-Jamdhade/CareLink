import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide12-roadmap-update';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
function text(name,t,x,y,w,h,size=24,color='#232F3E'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:'Calibri',fontSize:size,color};return q;
}
const columns=[
 {x:50,color:'#1F3DA9',items:[['Complete Patient App\n(pregnancy tracker, EDD,\n3D baby)',245,88],['Sarvam AI voice integration',350,58],['Nagpur PHC pilot with\nreal patients',416,60]]},
 {x:455,color:'#0D8743',items:[['ABDM / ABHA integration',245,36],['DigiLocker document\nverification',290,60],['Multi-language: Hindi,\nMarathi, Telugu, Tamil',353,60],['SMS/WhatsApp appointment\nreminders',416,60]]}
];
columns.forEach((c,i)=>c.items.forEach(([v,y,h],j)=>{text('Roadmap bullet '+i+' '+j,'•',c.x+18,y,20,35,24,c.color);text('Updated roadmap milestone '+i+' '+j,v,c.x+44,y,310,h,24);}));
s.shapes.add({geometry:'rightArrow',name:'Pilot-to-national evolution arrow',position:{left:135,top:529,width:1050,height:51},fill:'#1F3DA9',line:{fill:'none',width:0}});
const evolution=text('Evolution arrow label','PHC Pilot → State Scale → NATIONAL OPEN SOURCE PLATFORM',180,540,945,30,20,'#FFFFFF');
evolution.text.style={typeface:'Calibri',fontSize:20,color:'#FFFFFF',alignment:'center'};
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created focused roadmap column updates');
