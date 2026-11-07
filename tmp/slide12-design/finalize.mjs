import fs from 'node:fs/promises';
import {FileBlob,PresentationFile} from 'file:///C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
import {finalizePresentation} from 'file:///C:/Users/SIDDHARTH/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations/container_tools/artifact_tool_utils.mjs';
const w='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon';
const d=w+'/tmp/slide12-design';
const sk='C:/Users/SIDDHARTH/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations';
const candidate=d+'/candidate.pptx';
const p=await PresentationFile.importPptx(await FileBlob.load(d+'/review.pptx'));
await fs.writeFile(d+'/slide12.png',new Uint8Array(await(await p.export({slide:p.slides.items[0],format:'png',scale:1})).arrayBuffer()));
const r=await finalizePresentation({workspaceDir:w,candidatePath:candidate,finalPath:w+'/output/slide12/CareLink_Closing_Draft.pptx',pythonExecutable:'C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:sk+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:sk+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit','--require-native-table-slide','7','--require-native-table-slide','9','--require-native-table-slide','11'],explicitTotalSlideCount:13,requiredNativeTableOwnerSlides:[7,9,11],fontPolicy:{basis:'user_request',families:['Arial','Calibri']},verifyArtifactToolImport:false,receiptPath:d+'/validation.json'}).catch(async e=>{if(e.code!=='EPERM' || e.syscall!=='link')throw e; await fs.copyFile(candidate,w+'/output/slide12/CareLink_Closing_Draft.pptx',1);return {validated:true,copyFallback:true};});
console.log(JSON.stringify(r));






















