import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide9-validation';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
const blue='#1F3DA9',green='#0D8743',gray='#232F3E';
function text(name,t,x,y,w,h,size=22,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:font,fontSize:size,color,bold,alignment};return q;
}
const values=[['Metric','Result'],['Fact extraction accuracy','85–92%'],['Tested conflict types detected','100%'],['RAG template match rate','80%'],['False doctor referral','<5%'],['Data entry time reduction','87%'],['NFC tap → record load','<3 sec']];
const table=s.tables.add({rows:7,columns:2,left:50,top:164,width:310,height:328,columnWidths:[212,98],values});
table.styleOptions={headerRow:true,bandedRows:false};table.borders.assign({fill:'#A5AFBC',width:0.7,style:'solid'});
table.cells.block({row:0,column:0,rowCount:7,columnCount:2}).assign({fill:'#FFFFFF',textStyle:{typeface:'Calibri',fontSize:20,color:gray},margins:{left:8,right:6,top:1,bottom:1},anchor:'center'});
for(let r=0;r<7;r++){table.rows[r].height=r===0?28:50;if(r>0)table.getCell(r,1).text.style={typeface:'Arial',fontSize:r===1?20:23,bold:true,color:green,alignment:'center'};}
table.cells.block({row:0,column:0,rowCount:1,columnCount:2}).assign({fill:blue,textStyle:{typeface:'Arial',fontSize:20,bold:true,color:'#FFFFFF'}});
text('Live system validation heading','LIVE SYSTEM\nVALIDATION',388,164,277,55,23,blue,true,'Arial');
const checks=[
 ['4 patients registered\nsuccessfully',224,49],
 ['Patient credentials\ngenerated securely',276,49],
 ['9 record columns functional',328,28],
 ['NFC wristband →\nauto-identification working',365,49],
 ['RAG data entry →\nform pre-fill working',417,49],
 ['Doctor review queue →\ncases flagged correctly',469,49]
];
checks.forEach(([value,y,h],i)=>{text('Validation green check '+i,'✅',388,y-2,26,32,22,green);text('Portal validation '+i,value,419,y,246,h,21,gray);});
text('Patient app limitation icon','⚠️',705,649,32,35,23,'#5D6A79');
text('Patient app limitation','Patient App under development',749,651,471,38,24,gray);
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created metrics table, live validation and app limitation');
