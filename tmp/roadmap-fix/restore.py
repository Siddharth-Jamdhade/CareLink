from pathlib import Path
import zipfile,posixpath,copy
from lxml import etree as E
D=Path(__file__).parent;W=D.parents[1]
src=W/'output/slide12/CareLink_Closing_Draft.pptx'
reference=W/'output/slide11/CareLink_Roadmap_Updated.pptx'
with zipfile.ZipFile(src) as z:data={n:z.read(n) for n in z.namelist()}
with zipfile.ZipFile(reference) as z:
 for n in ['ppt/slides/slide11.xml','ppt/slides/_rels/slide11.xml.rels']:
  data[n]=z.read(n)
P='http://schemas.openxmlformats.org/presentationml/2006/main';A='http://schemas.openxmlformats.org/drawingml/2006/main';RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships';R='http://schemas.openxmlformats.org/package/2006/relationships'
ns={'p':P,'a':A}
slide=E.fromstring(data['ppt/slides/slide11.xml'])
required=['Pilot-to-national roadmap arrow','Rollout vision','Public availability commitment','GitHub repository']
for name in required:assert slide.xpath('boolean(//p:cNvPr[@name=$name])',namespaces=ns,name=name),name
# Give the restored group explicit, readable object names in PowerPoint's selection pane.
for el in slide.xpath('//p:cNvPr',namespaces=ns):
 if el.get('name') in required:el.set('name','Roadmap restored - '+el.get('name'))
data['ppt/slides/slide11.xml']=E.tostring(slide,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(D/'full-candidate.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for n,v in data.items():z.writestr(n,v)
# Create a clean one-slide replacement containing only reachable package parts.
single=copy.deepcopy(data)
pres=E.fromstring(single['ppt/presentation.xml']);ids=pres.find('{'+P+'}sldIdLst')
rels=E.fromstring(single['ppt/_rels/presentation.xml.rels'])
rid=next(x.get('Id') for x in rels if x.get('Target')=='slides/slide11.xml')
for el in list(ids):
 if el.get('{'+RN+'}id')!=rid:ids.remove(el)
for rel in list(rels):
 if rel.get('Type','').endswith('/slide') and rel.get('Id')!=rid:rels.remove(rel)
single['ppt/presentation.xml']=E.tostring(pres,encoding='utf-8',xml_declaration=True)
single['ppt/_rels/presentation.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
seen=set()
def visit(part):
 if part in seen or part not in single:return
 seen.add(part)
 relpath=posixpath.join(posixpath.dirname(part),'_rels',posixpath.basename(part)+'.rels') if part else '_rels/.rels'
 if relpath in single:
  seen.add(relpath)
  for rel in E.fromstring(single[relpath]):
   if rel.get('TargetMode')=='External':continue
   target=rel.get('Target','')
   path=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(part),target))
   visit(path)
seen.add('_rels/.rels')
for rel in E.fromstring(single['_rels/.rels']):
 if rel.get('TargetMode')!='External':visit(rel.get('Target','').lstrip('/'))
ct=E.fromstring(single['[Content_Types].xml'])
for el in list(ct):
 if el.get('PartName') and el.get('PartName').lstrip('/') not in seen:ct.remove(el)
single['[Content_Types].xml']=E.tostring(ct,encoding='utf-8',xml_declaration=True);seen.add('[Content_Types].xml')
with zipfile.ZipFile(D/'single-candidate.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for n in seen:
  if n in single:z.writestr(n,single[n])
print('Restored arrow, open-source line and GitHub; full deck and one-slide replacement prepared')
