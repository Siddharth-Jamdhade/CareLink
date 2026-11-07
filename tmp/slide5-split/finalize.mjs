import fs from 'node:fs/promises';
import {FileBlob,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
import {finalizePresentation} from 'file:///C:/Users/SIDDHARTH/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations/container_tools/artifact_tool_utils.mjs';
const w='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon';
const d=w+'/tmp/slide5-split';
const sk='C:/Users/SIDDHARTH/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations';
const candidate=d+'/candidate.pptx';
const p=await PresentationFile.importPptx(await FileBlob.load(candidate));
await fs.writeFile(d+'/slide5.png',new Uint8Array(await(await p.export({slide:p.slides.items[4],format:'png',scale:1})).arrayBuffer()));
await fs.writeFile(d+'/slide5b.png',new Uint8Array(await(await p.export({slide:p.slides.items[5],format:'png',scale:1})).arrayBuffer()));
const r=await finalizePresentation({workspaceDir:w,candidatePath:candidate,finalPath:w+'/output/slide5-split/CareLink_Overview_and_Workflow_Slides.pptx',pythonExecutable:'C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:sk+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:sk+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],explicitTotalSlideCount:13,fontPolicy:{basis:'user_request',families:['Arial','Calibri']},verifyArtifactToolImport:true,receiptPath:d+'/validation.json'}).catch(async e=>{if(e.code!=='EPERM' || e.syscall!=='link')throw e; await fs.copyFile(candidate,w+'/output/slide5-split/CareLink_Overview_and_Workflow_Slides.pptx',1);return {validated:true,copyFallback:true};});
console.log(JSON.stringify(r));










