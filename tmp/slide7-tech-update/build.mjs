import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide7-tech-update';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',light='#B9C2CC';
function text(name,t,x,y,w,h,size=24,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:font,fontSize:size,color,bold,alignment};return q;
}
function rect(name,x,y,w,h,color=blue,width=2){return s.shapes.add({geometry:'rect',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:color,width}});}
function line(name,x,y,w,h,arrow=false,color=green){return s.shapes.add({geometry:'connector',name,kind:'straight',position:{left:x,top:y,width:w,height:h},line:{fill:color,width:2.5},...(arrow?{tail:{type:'triangle',width:'med',length:'med'}}:{})});}
text('Stack heading','TECH STACK',50,120,620,31,24,blue,true,'Arial');
text('Architecture heading','SYSTEM ARCHITECTURE',710,120,520,31,24,blue,true,'Arial');
const values=[['Component','Technology'],['⭐ NFC Hardware','₹50 silicone band + RFID-RC522\n+ ESP32-C3'],['Doctor Portal','React 19, Framer Motion'],['Patient App','Under development'],['Backend','Python 3.12, FastAPI, SQLAlchemy'],['Database','SQLite + Cloud sync'],['OCR','PaddleOCR (offline, handwriting)'],['AI Model','Gemini 2.5 Flash (multimodal)'],['RAG Pipeline','ChromaDB + Gemini Embeddings'],['Voice','Sarvam AI (Hindi/Marathi)']];
const table=s.tables.add({rows:10,columns:2,left:50,top:160,width:620,height:448,columnWidths:[176,444],values});
table.styleOptions={headerRow:true,bandedRows:false};
table.borders.assign({fill:light,width:0.7,style:'solid'});
table.cells.block({row:0,column:0,rowCount:10,columnCount:2}).assign({fill:'#FFFFFF',textStyle:{typeface:'Calibri',fontSize:22,color:gray},margins:{left:9,right:7,top:6,bottom:5},anchor:'center'});
for(let r=0;r<10;r++){
 table.rows[r].height=r===0?36:r===1?60:44;
 table.getCell(r,0).text.style={typeface:'Calibri',fontSize:22,color:r===0||r===1?'#FFFFFF':blue,bold:true};
}
table.cells.block({row:0,column:0,rowCount:1,columnCount:2}).assign({fill:blue,textStyle:{typeface:'Arial',fontSize:22,bold:true,color:'#FFFFFF'}});
table.cells.block({row:1,column:0,rowCount:1,columnCount:2}).assign({fill:green,textStyle:{typeface:'Calibri',fontSize:22,bold:true,color:'#FFFFFF'}});
rect('NFC Band node',710,164,130,64,green,2.5);
text('NFC band label','NFC\nBand',718,172,114,54,24,green,true,'Arial','center');
rect('RFID scanner node',870,164,160,64);
text('RFID scanner label','RFID-RC522\n+ ESP32',876,172,148,54,23,blue,true,'Arial','center');
rect('FastAPI Backend node',1060,164,170,64);
text('FastAPI Backend label','FastAPI\nBackend',1066,172,158,54,24,blue,true,'Arial','center');
line('Band to scanner',840,196,30,0,true);
line('Scanner to backend',1030,196,30,0,true);
rect('AI Layer node',1060,265,170,60);
text('AI Layer label','AI Layer',1068,279,154,36,27,blue,true,'Arial','center');
line('Backend to AI',1145,228,0,37,true);
line('AI output spine',1145,325,0,24);
line('Portal branch',825,349,320,0);
line('Doctor Portal branch',825,349,0,26,true);
line('Patient App branch',1115,349,0,26,true);
rect('Doctor Portal node',710,375,230,62,blue,2.5);
text('Doctor Portal label','Doctor Portal',718,391,214,35,26,blue,true,'Arial','center');
rect('Patient App node',1000,375,230,62,green,2.5);
text('Patient App label','Patient App',1008,391,214,35,26,green,true,'Arial','center');
async function photo(name,path,type,x,y,w,h){const b=await fs.readFile(path);s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:type,alt:name,fit:'contain',position:{left:x,top:y,width:w,height:h}});}
await photo('Actual RFID-RC522 scanner close-up','C:/Users/SIDDHARTH/Downloads/WhatsApp Image 2026-11-07 at 16.42.36 (1).jpeg','image/jpeg',735,454,230,150);
await photo('Blue NFC silicone wristband','C:/Users/SIDDHARTH/OneDrive/Pictures/Screenshots/Screenshot 2026-11-07 164035.png','image/png',1000,454,230,150);
text('Hardware price caption','RFID-RC522 scanner (₹1,500) + NFC band (₹50)',710,611,520,28,22,gray,true,'Calibri','center');
rect('AI safety boundary',50,648,1180,36,green,1.5);
text('AI safety statement','⚠️ AI extracts data ONLY. It NEVER diagnoses or prescribes.',65,649,1150,34,27,gray,true,'Arial','center');
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created native tech table and dual-portal diagram');
