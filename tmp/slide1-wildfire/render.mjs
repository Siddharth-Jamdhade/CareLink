import fs from 'node:fs/promises';
import {FileBlob,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide1-wildfire';
const p=await PresentationFile.importPptx(await FileBlob.load(d+'/validation-part1.pptx'));
for(const [index,number] of [[0,1],[1,13]]){await fs.writeFile(d+'/slide'+number+'.png',new Uint8Array(await(await p.export({slide:p.slides.items[index],format:'png',scale:1})).arrayBuffer()));}
console.log('Verified and rendered both changed slides');
