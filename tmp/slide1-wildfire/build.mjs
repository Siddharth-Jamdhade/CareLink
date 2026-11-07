import fs from 'node:fs/promises';
import {Presentation,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide1-wildfire';
const p=Presentation.create({slideSize:{width:1280,height:720}}),s=p.slides.add();
for(const [name,value,x,w,color] of [['CareLink team name','TEAM NAME  WildFire',150,615,'#0D8743'],['CareLink team code','TEAM CODE  O2S22M',780,270,'#1F3DA9']]){const q=s.shapes.add({geometry:'textbox',name,position:{left:x,top:548,width:w,height:40},fill:'none',line:{fill:'none',width:0}});q.text=value;q.text.insets=0;q.text.style={typeface:'Calibri',fontSize:23,color,bold:true,alignment:'left'};}
await(await PresentationFile.exportPptx(p)).save(d+'/content.pptx');console.log('Created confirmed team identity fields');
