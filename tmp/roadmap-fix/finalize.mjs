import fs from 'node:fs/promises';
import {FileBlob,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
import {finalizePresentation} from 'file:///C:/Users/SIDDHARTH/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations/container_tools/artifact_tool_utils.mjs';
const w='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon',d=w+'/tmp/roadmap-fix',out=w+'/output/roadmap-fix';
const sk='C:/Users/SIDDHARTH/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations';
const p=await PresentationFile.importPptx(await FileBlob.load(d+'/single-candidate.pptx'));
await fs.writeFile(out+'/roadmap-preview.png',new Uint8Array(await(await p.export({slide:p.slides.items[0],format:'png',scale:1})).arrayBuffer()));
for(const type of ['single','full']){
 const candidatePath=d+'/'+type+'-candidate.pptx',finalPath=out+(type==='single'?'/CareLink_Roadmap_Replacement.pptx':'/CareLink_Deck_Roadmap_Fixed.pptx');
 const isFull=type==='full';
 await finalizePresentation({workspaceDir:w,candidatePath,finalPath,pythonExecutable:'C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:sk+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:sk+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit',...(isFull?['--require-native-table-slide','7','--require-native-table-slide','9','--require-native-table-slide','11']:[])],explicitTotalSlideCount:isFull?13:1,requiredNativeTableOwnerSlides:isFull?[7,9,11]:[],fontPolicy:{basis:'user_request',families:['Arial','Calibri']},verifyArtifactToolImport:!isFull,receiptPath:d+'/'+type+'-validation.json'}).catch(async e=>{if(e.code!=='EPERM'||e.syscall!=='link')throw e;await fs.copyFile(candidatePath,finalPath,1);});
 console.log(type+' saved');
}
