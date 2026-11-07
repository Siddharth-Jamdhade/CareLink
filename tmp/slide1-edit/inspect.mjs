import fs from 'node:fs/promises';
import { FileBlob, PresentationFile } from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const deck=await PresentationFile.importPptx(await FileBlob.load('C:/Users/SIDDHARTH/Downloads/CareLink_Phase 2.pptx'));
console.log((await deck.inspect({kind:'slide,textbox,image,layout',maxChars:14000})).ndjson);
const s=deck.slides.items[0];
await fs.writeFile('tmp/slide1-edit/before.png',new Uint8Array(await (await deck.export({slide:s,format:'png',scale:1})).arrayBuffer()));
await fs.writeFile('tmp/slide1-edit/before-layout.json',await (await s.export({format:'layout'})).text());

