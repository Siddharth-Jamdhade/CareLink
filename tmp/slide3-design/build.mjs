import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const dir='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide3-design';
const p=Presentation.create({slideSize:{width:1280,height:720}});
const s=p.slides.add();s.background.fill='#FFFFFF';
function text(name,t,x,y,w,h,size=28,color='#232F3E',bold=false,font='Calibri'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={fontFamily:font,fontSize:size,color,bold};return q;
}
function card(name,x,color){return s.shapes.add({geometry:'rect',name,position:{left:x,top:360,width:570,height:276},fill:'#FFFFFF',line:{fill:color,width:2}});}
text('Problem headline','Missing records. Delayed decisions. Mothers at risk.',50,130,855,46,34,'#232F3E',true,'Arial');
text('India mortality share','7.2%',50,196,250,110,104,'#C62828',true,'Arial');
text('Statistic label','of global maternal deaths',322,216,555,40,30);
text('Statistic location','India • 2023',322,260,500,36,28,'#5D6A79');
const bytes=await fs.readFile('C:/Users/SIDDHARTH/Downloads/ChatGPT Image Nov 7, 2026, 01_34_33 AM.png');
s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:'image/png',alt:'Illustrative crumpled ANC card, synthetic sample',fit:'contain',position:{left:930,top:128,width:300,height:200}});
text('Image disclosure','Illustrative ANC card • Synthetic sample',930,332,305,20,14,'#5D6A79');
card('Problem card',50,'#C62828');card('Current limitations card',660,'#5D6A79');
text('Problem card heading','The Problem',74,380,520,42,30,'#C62828',true,'Arial');
text('Limitations card heading','Why Current Solutions Fail',684,380,520,42,30,'#1F3DA9',true,'Arial');
const left=['Paper ANC cards lost or damaged','Referral teams lack prior patient history','Repeated questions delay consultations','Emergency handoffs lack patient history'];
left.forEach((t,i)=>{text('Problem icon '+i,'❌',74,438+i*46,32,38,25,'#C62828');text('Problem bullet '+i,t,116,438+i*46,480,38,25);});
const right=['Paper records need digital conversion','Handwriting needs structured extraction','PHC nurses need assisted data entry'];
right.forEach((t,i)=>{text('Gap icon '+i,['📄','✍️','👩‍⚕️'][i],684,438+i*55,36,44,25);text('Gap bullet '+i,t,726,438+i*55,480,44,25);});
text('WHO source','WHO et al., 2025 • Estimates for 2023',50,649,1160,24,15,'#5D6A79');
s.speakerNotes.text='Source: WHO, UNICEF, UNFPA, World Bank Group and UNDESA/Population Division (2025), Trends in maternal mortality 2000 to 2023. India accounted for 7.2% of global maternal deaths in 2023. https://www.who.int/publications/i/item/9789240108462/\nPhoto: user-supplied generated illustration, labeled synthetic sample.\nWorkflow gaps are problem framing, not quantified prevalence or an exhaustive competitor assessment. Maternal mortality burden is context, not a causal estimate for missing records.';
await(await PresentationFile.exportPptx(p)).save(dir+'/content.pptx');
try{await fs.writeFile(dir+'/content.png',new Uint8Array(await(await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));}catch(e){console.log('Render:',e.message)}
console.log('Content created');


