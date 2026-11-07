import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const dir='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide10-design';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();s.background.fill='#FFFFFF';
const blue='#1F3DA9',green='#0D8743',gray='#232F3E',light='#5D6A79';
function text(name,t,x,y,w,h,size=24,color=gray,bold=false,font='Calibri',alignment='left'){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={fontFamily:font,fontSize:size,color,bold,alignment};return q;
}
text('Pilot budget label','INDICATIVE PILOT BUDGET',50,123,620,28,22,blue,true,'Arial');
text('Monthly budget','₹0–1,300/month',50,156,620,68,57,green,true,'Arial');
text('Budget scope','Per facility • Usage-dependent estimate',50,226,620,28,22,light);
text('Unit cost','~₹0.35 / record',50,265,340,49,39,green,true,'Arial');
text('Unit scope','API target\nExcludes fixed costs',420,268,250,49,19,light);
text('Setup heading','SETUP: ₹2,800–4,300*',50,324,620,31,23,blue,true,'Arial');
function table(values,y,height,colWidths,rowHeights){
 const size=y>=540?17:19;
 const t=s.tables.add({rows:values.length,columns:2,left:50,top:y,width:620,height,columnWidths:colWidths,values});
 t.styleOptions={headerRow:true,bandedRows:false};t.borders.assign({fill:light,width:0.6,style:'solid'});
 t.cells.block({row:0,column:0,rowCount:values.length,columnCount:2}).assign({fill:'#FFFFFF',textStyle:{fontFamily:'Calibri',fontSize:size,color:gray},margins:{left:10,right:7,top:3,bottom:3},anchor:'center'});
 for(let r=0;r<values.length;r++){t.rows[r].height=rowHeights[r];if(r>0)t.getCell(r,1).text.style={fontFamily:'Calibri',fontSize:size,bold:true,color:green};}
 t.cells.block({row:0,column:0,rowCount:1,columnCount:2}).assign({fill:blue,textStyle:{fontFamily:'Arial',fontSize:19,bold:true,color:'#FFFFFF'}});return t;
}
table([['Setup item','Budget'],['Server setup (demo)','₹0 • Free tier'],['Staff training','₹2,000 • One-time'],['NFC unit (optional)','₹1,500 / unit'],['Domain (annual)','₹800 / year']],361,150,[360,260],[28,29,29,29,29]);
text('Monthly heading','MONTHLY RUNNING COSTS',50,515,620,28,21,blue,true,'Arial');
table([['Component','Budget / month'],['Gemini API','₹0–500'],['Sarvam voice','₹0–300'],['Pilot hosting','₹0–500']],545,100,[360,260],[25,25,25,25]);
text('Setup footnote','*First-year domain included; one NFC unit optional.',50,658,620,20,15,light);
text('Scaling heading','PROPOSED SCALE-UP',735,123,495,29,22,blue,true,'Arial');
const steps=[['1 PHC Pilot','Nagpur • 3 months'],['5 PHCs','Maharashtra • 6 months'],['State Rollout','Proposed NHM partnership'],['National Open-Source','Adoption + implementation partners']];
steps.forEach(([title,sub],i)=>{
 const y=165+i*105;
 s.shapes.add({geometry:'roundRect',name:'Scale phase '+(i+1),position:{left:735,top:y,width:495,height:77},fill:'#FFFFFF',line:{fill:i===0?green:blue,width:2},borderRadius:10});
 text('Scale phase title '+i,title,753,y+9,459,36,i===3?27:30,i===0?green:blue,true,'Arial','center');
 text('Scale phase detail '+i,sub,750,y+47,465,26,21,gray,false,'Calibri','center');
 if(i<3)s.shapes.add({geometry:'downArrow',name:'Scale progression '+i,position:{left:972,top:y+83,width:22,height:16},fill:green,line:{fill:'none',width:0}});
});
text('Deployment needs','PHC computer + internet • Android phone',735,575,495,29,22,gray,false,'Calibri','center');
text('Deployment options','Hospital server / paid hosting • NFC optional',735,608,495,27,20,light,false,'Calibri','center');
text('Sustainability','Sustainability: low costs + open-source + partners',735,646,495,34,19,green,true,'Calibri','center');
s.speakerNotes.text='All rupee figures are user-supplied planning estimates, not provider quotations or measured spending. Setup calculation: training 2000 + first-year domain 800 + optional one NFC unit 1500 + demo setup 0 = INR 2800 to 4300. Domain is recurring annually. Monthly indicative maximum = Gemini 500 + Sarvam 300 + hosting 500 = INR 1300. INR 0.35 per record is an unvalidated API cost target, excludes fixed costs, and lacks a specified token/audio/record-volume assumption. Do not infer a guaranteed production facility cost. Existing computer/Android phone, staff time, internet, storage, backups, security, support, taxes and durable production hosting are excluded. Render free services are for demos/testing and not recommended for production: https://render.com/docs/free . Free web services spin down after inactivity and local filesystem data is ephemeral, so production SQLite requires durable storage or hospital-hosted infrastructure. Gemini official pricing: https://ai.google.dev/gemini-api/docs/pricing . Sarvam pricing: https://docs.sarvam.ai/api/getting-started/pricing . Scaling phases and NHM partnership are proposed, not confirmed partnerships or approved subsidies. Funding-free sustainability and guaranteed reduction in doctor interventions are not established.';
await(await PresentationFile.exportPptx(p)).save(dir+'/content.pptx');
await fs.writeFile(dir+'/content.png',new Uint8Array(await(await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
console.log('Slide 10 content created');
