import fs from 'node:fs/promises';
import { FileBlob, PresentationFile } from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const d='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon/tmp/slide6-nfc-flow';
const p=await PresentationFile.importPptx(await FileBlob.load(d+'/candidate.pptx'));
await fs.writeFile(d+'/slide6.png',new Uint8Array(await(await p.export({slide:p.slides.items[5],format:'png',scale:1})).arrayBuffer()));
console.log('Rendered Slide 6');
