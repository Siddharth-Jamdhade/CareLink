import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const dir='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide8-design';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();s.background.fill='#FFFFFF';
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',light='#5D6A79';
function text(name,t,x,y,w,h,size=24,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={fontFamily:font,fontSize:size,color,bold,alignment};return q;
}
text('Results heading','REPORTED PROTOTYPE RESULTS',50,126,610,31,23,blue,true,'Arial');
const values=[['Metric','Result'],['Fact extraction accuracy','85–92%'],['Tested conflict types detected','100%'],['RAG template match rate','80%'],['False doctor referral','<5%'],['Data entry time reduction','87%']];
const t=s.tables.add({rows:6,columns:2,left:50,top:168,width:610,height:284,columnWidths:[410,200],values});
t.styleOptions={headerRow:true,bandedRows:false};
t.borders.assign({fill:light,width:0.7,style:'solid'});
t.cells.block({row:0,column:0,rowCount:6,columnCount:2}).assign({fill:'#FFFFFF',textStyle:{fontFamily:'Calibri',fontSize:24,color:gray},margins:{left:12,right:8,top:5,bottom:5},anchor:'center'});
for(let r=0;r<6;r++){
 t.rows[r].height=r===0?38:49;
 if(r>0)t.getCell(r,1).text.style={fontFamily:'Arial',fontSize:36,bold:true,color:green,alignment:'center'};
}
t.cells.block({row:0,column:0,rowCount:1,columnCount:2}).assign({fill:blue,textStyle:{fontFamily:'Arial',fontSize:22,bold:true,color:'#FFFFFF'}});
text('Synthetic test scope','20+ synthetic ANC images • 15 RAG scenarios',50,477,610,27,21,light);
text('Conflict test scope','3 conflict types • MoHFW protocol checks',50,506,610,27,21,light);
text('Improvements heading','IMPROVEMENTS MADE',50,548,610,30,23,blue,true,'Arial');
text('Emergency improvement','✅ Emergency danger signs: manual entry',50,586,610,28,22,gray);
text('Confidence improvement','🟢 🟡 🔴 Confidence badges for review',50,618,610,28,22,gray);
text('Click improvement','✅ Routine nurse clicks: 12 → 3',50,650,610,28,22,gray);
s.shapes.add({geometry:'roundRect',name:'Doctor feedback quote box',position:{left:705,top:160,width:525,height:236},fill:'#FFFFFF',line:{fill:green,width:2},borderRadius:12});
text('Doctor feedback icon','👨‍⚕️',725,177,48,48,35);
text('Doctor feedback heading','DOCTOR FEEDBACK',786,183,420,31,23,green,true,'Arial');
text('Doctor quote','“QR code handoff is the\nmost practical feature — full\nhistory before patient enters\nmy room”',730,233,475,145,27,gray,false,'Calibri');
text('Limitations heading','LIMITATIONS',705,434,525,32,23,blue,true,'Arial');
const limitations=['Faded documents reduce OCR quality','Pregnancy-only knowledge base','Real PHC scale untested'];
limitations.forEach((b,i)=>{
 text('Limitation icon '+i,'⚠️',705,481+i*56,32,35,23,light);
 text('Limitation '+i,b,749,483+i*56,471,38,24,gray);
});
s.speakerNotes.text='Prototype evaluation figures and doctor quotation provided by user. Raw test records, denominators and evaluation procedures not supplied; do not treat as independently validated clinical performance. Reported scope: 20+ synthetic handwritten and printed ANC images; 15 ANC RAG scenarios; three intentionally tested conflict types detected; automated MoHFW protocol checks. 100% conflict detection refers only to tested types, not all possible conflicts. Extraction accuracy 85-92%, template match 80%, false doctor referral under 5%, and data-entry time reduction 87% are reported figures. Quote is unverified user-supplied feedback, with no clinician identity or endorsement credentials asserted. Improvement items: manual emergency danger signs, confidence badges, routine nurse clicks reduced 12 to 3. Limitations: faded documents, pregnancy-only knowledge base, no real PHC-scale testing.';
await(await PresentationFile.exportPptx(p)).save(dir+'/content.pptx');
await fs.writeFile(dir+'/content.png',new Uint8Array(await(await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
console.log('Slide 8 content created');
