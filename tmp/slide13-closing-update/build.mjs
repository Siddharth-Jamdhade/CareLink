import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide13-closing-update';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
const blue='#1F3DA9',green='#0D8743',gray='#232F3E';
function text(name,t,x,y,w,h,size=22,color=gray,bold=false,font='Calibri',italic=false){
 const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 q.text=t;q.text.insets=0;q.text.style={typeface:font,fontSize:size,color,bold,italic,alignment:'center'};return q;
}
text('Closing team identity','Siddharth Jamdhade (Solo) • [Team Code]',100,347,1080,35,22,green,true,'Arial');
const website='carelink-hospital-portal-sj.jamdhadesiddharth69.chatgpt.site';
const web=text('Closing website','Website: '+website,80,401,1120,32,22,blue);
web.hyperlink={uri:'https://'+website,isExternal:true};
text('Closing demo placeholder','Demo: [YouTube link]',80,439,1120,32,22,gray);
const github=text('Closing GitHub','GitHub: github.com/Siddharth-Jamdhade/CareLink',80,477,1120,32,22,blue);
github.hyperlink={uri:'https://github.com/Siddharth-Jamdhade/CareLink',isExternal:true};
text('Closing email placeholder','Email: [your email]',80,515,1120,32,22,gray);
text('Closing maternal-health tagline',"₹50 band. One tap. Every mother's story — safe, digital, connected.",70,581,1140,40,26,green,false,'Calibri',true);
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');
console.log('Created clean closing contact details and tagline');
