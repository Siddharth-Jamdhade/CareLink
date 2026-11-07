import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const dir='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide6-design';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();s.background.fill='#FFFFFF';
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',light='#5D6A79';
function text(name,t,x,y,w,h,size=24,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={fontFamily:font,fontSize:size,color,bold,alignment};return q;
}
text('Stack heading','TECH STACK',50,125,570,30,23,blue,true,'Arial');
text('Architecture heading','SYSTEM ARCHITECTURE',690,125,540,30,23,blue,true,'Arial');
const values=[['Component','Technology'],['Frontend','React 19 • Framer Motion • Axios'],['Backend','Python 3.12 • FastAPI\nSQLAlchemy • SQLite'],['OCR','PaddleOCR • Offline text capture'],['AI Model','Gemini 2.5 Flash • Multimodal'],['RAG Pipeline','ChromaDB + Gemini Embeddings'],['Voice Input','Sarvam AI • Hindi / Marathi STT'],['Hardware','ESP32-C3 + PN532 NFC wristband'],['Deployment','Render / Docker']];
const table=s.tables.add({rows:9,columns:2,left:50,top:163,width:570,height:302,columnWidths:[139,431],values});
table.styleOptions={headerRow:true,bandedRows:false};
table.borders.assign({fill:light,width:0.6,style:'solid'});
table.cells.block({row:0,column:0,rowCount:9,columnCount:2}).assign({fill:'#FFFFFF',textStyle:{fontFamily:'Calibri',fontSize:19,color:gray},margins:{left:10,right:7,top:5,bottom:5},anchor:'center'});
for(let r=0;r<9;r++){
 table.rows[r].height=r===2?49:32;
 table.getCell(r,0).text.style={fontFamily:'Calibri',fontSize:19,color:r===0?'#FFFFFF':blue,bold:true};
}
table.cells.block({row:0,column:0,rowCount:1,columnCount:2}).assign({fill:blue,textStyle:{fontFamily:'Arial',fontSize:20,bold:true,color:'#FFFFFF'}});
const nodes=[
 [163,72,'React Frontend ↔ FastAPI Backend',''],
 [268,96,'AI Layer','PaddleOCR • Gemini • RAG • Sarvam'],
 [397,72,'SQLite DB + Knowledge Base',''],
 [502,72,'QR Code + Patient Summary','']
];
nodes.forEach(([y,h,label,sub],i)=>{
 s.shapes.add({geometry:'roundRect',name:'Architecture stage '+i,position:{left:690,top:y,width:540,height:h},fill:'#FFFFFF',line:{fill:i===3?green:blue,width:2},borderRadius:12});
 text('Architecture label '+i,label,708,y+(sub?11:21),504,38,27,i===3?green:blue,true,'Arial','center');
 if(sub){text('AI tools',sub,705,y+51,510,28,23,gray,false,'Calibri','center');}
 if(i<3)s.shapes.add({geometry:'downArrow',name:'Architecture connector '+i,position:{left:950,top:y+h+7,width:20,height:22},fill:green,line:{fill:'none',width:0}});
});
const bytes=await fs.readFile('C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/output/imagegen/carelink-hardware-flatlay.png');
s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:'image/png',alt:'AI-generated concept of ESP32-C3 and PN532 NFC components with wristband and coin',fit:'contain',position:{left:50,top:481,width:225,height:127}});
text('Hardware caption','ESP32-C3 + PN532',295,502,325,33,26,blue,true,'Arial');
text('Hardware purpose','NFC patient identification',295,541,325,30,23,gray);
text('Hardware disclosure','AI-generated hardware concept',295,578,325,23,16,light);
s.shapes.add({geometry:'rect',name:'AI administrative scope',position:{left:50,top:626,width:1180,height:47},fill:'#FFFFFF',line:{fill:green,width:2}});
text('AI boundary','⚠️ AI extracts data ONLY. It NEVER diagnoses or prescribes.',65,636,1150,34,27,gray,true,'Arial','center');
s.speakerNotes.text='Technology stack supplied by user; versions and implementation status not independently verified. PaddleOCR is labeled offline text capture to avoid guaranteeing handwriting accuracy. Gemini extracts administrative facts; no diagnosis or prescribing. RAG supports knowledge-base retrieval and form prefilling; no verified 80% metric supplied. Sarvam provides speech-to-text for the proposed Hindi/Marathi workflow. Diagram is a simplified logical architecture, not an assertion that frontend/backend, AI and database run in strict sequence. Generated hardware concept is not an actual prototype photograph or reliable wiring schematic.';
await(await PresentationFile.exportPptx(p)).save(dir+'/content.pptx');
await fs.writeFile(dir+'/content.png',new Uint8Array(await(await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
console.log('Slide 6 content created');
