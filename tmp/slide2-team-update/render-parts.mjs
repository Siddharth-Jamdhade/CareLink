import fs from 'node:fs/promises';
import {FileBlob,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide2-team-update';
for(const part of [1,2]){const p=await PresentationFile.importPptx(await FileBlob.load(d+'/validation-part'+part+'.pptx'));console.log(JSON.stringify({part,slides:p.slides.items.length,imported:true}));if(part===1){await fs.writeFile(d+'/slide2.png',new Uint8Array(await(await p.export({slide:p.slides.items[1],format:'png',scale:1})).arrayBuffer()));}}
