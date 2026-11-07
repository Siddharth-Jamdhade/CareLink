import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide11-cost-update';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',light='#5D6A79';
function text(name,t,x,y,w,h,size=22,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:font,fontSize:size,color,bold,alignment};return q;
}
text('Pilot budget label','INDICATIVE PILOT BUDGET',50,123,620,28,22,blue,true,'Arial');
text('Per-patient wristband wow factor','₹50/patient',50,151,620,72,64,green,true,'Arial');
s.shapes.add({geometry:'rect',name:'Complete digitization callout box',position:{left:50,top:232,width:620,height:53},fill:'none',line:{fill:blue,width:2}});
text('Complete digitization callout','₹50/patient + ₹1,300/month =\nComplete maternal health digitization',62,234,596,52,22,blue,true,'Calibri','center');
text('Setup heading','ONE-TIME SETUP',50,296,300,28,23,blue,true,'Arial');
text('Domain accounting qualifier','Includes first-year domain',350,300,320,22,16,light,false,'Calibri','right');
const setup=[['Setup item','Budget'],['NFC wristband (per patient)','₹50'],['RFID-RC522 scanner (per facility)','₹1,500'],['Server setup (Render free)','₹0'],['Domain name','₹800/year'],['Staff training','₹2,000 one-time'],['TOTAL per facility','~₹4,300 + ₹50/patient']];
function table(name,values,y,heights,sizes=19){
 const t=s.tables.add({rows:values.length,columns:2,left:50,top:y,width:620,height:heights.reduce((a,b)=>a+b,0),columnWidths:[380,240],values});
 t.styleOptions={headerRow:true,bandedRows:false};t.borders.assign({fill:'#A5AFBC',width:0.6,style:'solid'});
 t.cells.block({row:0,column:0,rowCount:values.length,columnCount:2}).assign({fill:'#FFFFFF',textStyle:{typeface:'Calibri',fontSize:sizes,color:gray},margins:{left:9,right:7,top:3,bottom:3},anchor:'center'});
 for(let r=0;r<values.length;r++){t.rows[r].height=heights[r];if(r>0)t.getCell(r,1).text.style={typeface:'Calibri',fontSize:sizes,bold:true,color:green};}
 t.cells.block({row:0,column:0,rowCount:1,columnCount:2}).assign({fill:blue,textStyle:{typeface:'Arial',fontSize:19,bold:true,color:'#FFFFFF'}});
 return t;
}
const setupTable=table('Facility setup costs',setup,326,[26,30,36,30,30,30,30],19);
setupTable.cells.block({row:6,column:0,rowCount:1,columnCount:2}).assign({fill:green,textStyle:{typeface:'Calibri',fontSize:19,bold:true,color:'#FFFFFF'}});
setupTable.getCell(6,1).text.style={typeface:'Calibri',fontSize:19,bold:true,color:'#FFFFFF'};
text('Monthly running costs heading','MONTHLY RUNNING COSTS',50,544,620,26,21,blue,true,'Arial');
table('Monthly running costs',[['Component','Budget / month'],['Gemini API','₹0–500'],['Sarvam voice','₹0–300'],['Pilot hosting','₹0–500']],571,[24,24,24,24],17);
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created updated cost tables and per-patient highlight');
