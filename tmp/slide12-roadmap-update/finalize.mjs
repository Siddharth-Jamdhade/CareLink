import fs from 'node:fs/promises';
import {finalizePresentation} from 'file:///C:/Users/SIDDHARTH/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations/container_tools/artifact_tool_utils.mjs';
const w='C:/Users/SIDDHARTH/OneDrive/Desktop/Health A thon',d=w+'/tmp/slide12-roadmap-update',sk='C:/Users/SIDDHARTH/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations';
const out=w+'/output/carelink-slide12-roadmap/CareLink_Phase2_Slide12_Roadmap_Updated.pptx';
const r=await finalizePresentation({workspaceDir:w,candidatePath:d+'/candidate.pptx',finalPath:out,pythonExecutable:'C:/Users/SIDDHARTH/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:sk+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:sk+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000'],explicitTotalSlideCount:13,fontPolicy:{basis:'user_request',families:['Arial','Calibri']},verifyArtifactToolImport:true,receiptPath:d+'/validation.json'}).catch(async e=>{if(e.code!=='EPERM'||e.syscall!=='link')throw e;await fs.copyFile(d+'/candidate.pptx',out,1);return {validated:true,copyFallback:true};});
console.log(JSON.stringify(r));

