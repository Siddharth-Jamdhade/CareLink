import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const dir='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide5-flow';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();s.background.fill='#FFFFFF';
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',light='#5D6A79';
function text(name,t,x,y,w,h,size=24,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={fontFamily:font,fontSize:size,color,bold,alignment};return q;
}
function node(name,t,x,y,w,color=blue){
 const q=s.shapes.add({geometry:'roundRect',name,position:{left:x,top:y,width:w,height:64},fill:'#FFFFFF',line:{fill:color,width:2},borderRadius:10});
 q.text=t;q.text.insets=4;q.text.style={fontFamily:'Arial',fontSize:23,bold:true,color,alignment:'center',verticalAlignment:'middle'};return q;
}
function line(name,x,y,w,h,color=blue){s.shapes.add({geometry:'line',name,position:{left:x,top:y,width:w,height:h},line:{fill:color,width:2.5}});}
function arrow(name,x,y,w=28,color=blue){s.shapes.add({geometry:'rightArrow',name,position:{left:x,top:y-8,width:w,height:16},fill:color,line:{fill:'none',width:0}});}
const paths=[['📸 Upload Photo','PaddleOCR','Gemini AI',150,blue],['🎤 Voice Input','Sarvam AI','RAG',245,blue],['🏷️ NFC Wristband','ESP32 Scan','Patient ID',340,green]];
paths.forEach(([a,b,c,y,col],i)=>{
 node('Input '+i,a,50,y,200,col);node('Process '+i,b,290,y,160,col);node('Output '+i,c,490,y,160,col);
 arrow('Input arrow '+i,258,y+32,24,col);arrow('Process arrow '+i,458,y+32,24,col);
 line('Merge arm '+i,650,y+32,30,0,col);
});
line('Merge spine',680,182,0,190);
arrow('Merged input arrow',680,277,32);
node('Patient record','Patient Record',720,245,160);
arrow('Record review arrow',888,277,24);
node('Clinical verification','Doctor Verifies',920,245,155,green);
arrow('Verified QR arrow',1083,277,24,green);
node('QR output','QR Code',1115,245,115,green);
text('OCR function','Handwriting → structured data',290,219,360,24,17,light,false,'Calibri','center');
text('Voice function','Speech to text → form suggestions',290,314,360,24,17,light,false,'Calibri','center');
text('NFC function','PN532 NFC reader → record lookup',290,409,360,24,17,light,false,'Calibri','center');
async function imageFile(path,alt,x,y,w,h){const bytes=await fs.readFile(path);s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:'image/png',alt,fit:'contain',position:{left:x,top:y,width:w,height:h}});}
await imageFile('C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/output/imagegen/carelink-nfc-hospital.png','Synthetic wristband closeup',50,420,180,115);
text('Hardware caption','Physical hardware — tap to identify patient instantly',250,450,580,62,24,gray,true,'Arial');
text('Wristband disclosure','AI-generated illustration',50,537,180,19,13,light,false,'Calibri','center');
await imageFile('C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/output/imagegen/carelink-nfc-identification-illustration.png','Conceptual NFC patient identification illustration',950,365,280,188);
text('Illustration disclosure','AI-generated concept',950,555,280,20,13,light,false,'Calibri','center');
text('Target qualifier','TARGET IMPACT • Pilot validation pending',50,568,1160,26,19,light,true,'Arial');
const stats=[['87%','Faster Data Entry','15 min → 2 min'],['100%','Records Digital','Digitization target'],['30 sec','Emergency Handoff','QR access target'],['Self-Learning','Gets Smarter Daily','Doctor-approved feedback']];
stats.forEach(([value,label,sub],i)=>{
 const x=50+i*300;
 s.shapes.add({geometry:'rect',name:'Impact card '+i,position:{left:x,top:602,width:280,height:74},fill:'#FFFFFF',line:{fill:blue,width:1.5}});
 text('Impact value '+i,value,x+8,605,264,37,i===3?28:36,blue,true,'Arial','center');
 text('Impact label '+i,label,x+8,643,264,25,20,gray,false,'Calibri','center');
});
s.speakerNotes.text='Target impact, not measured clinical or deployment results. Fifteen to two minutes is an 86.7% reduction in entry time, rounded to 87%, not an 87% increase in entry speed. 100% refers to the proposed digitization target, not proven nationwide record availability. Thirty seconds is a QR access target. Self-learning describes the proposed doctor-approval feedback loop; automatic learning and daily improvement are not demonstrated. The 40% consultation-time reduction was not included because no supporting evaluation was supplied. NFC retrieves an identifier and looks up the associated record; it does not extract clinical history from the wristband. PN532 is the NFC reader; ESP32-C3 is its controller. Both images are AI-generated illustrations, not actual prototype or deployment photographs. Photo and voice outputs must be reviewed by the doctor before QR handoff.';
await(await PresentationFile.exportPptx(p)).save(dir+'/content.pptx');
await fs.writeFile(dir+'/content.png',new Uint8Array(await(await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
console.log('Flowchart content created');
