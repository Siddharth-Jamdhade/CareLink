from pathlib import Path
from lxml import etree as E
import zipfile,posixpath,json
D=Path('tmp/slide2-team-update');n={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
with zipfile.ZipFile(D/'candidate.pptx') as z:original={name:z.read(name) for name in z.namelist()}
for group,keep in [(1,set(range(1,8))),(2,set(range(8,14)))]:
 data=original.copy();p=E.fromstring(data['ppt/presentation.xml']);ids=p.find('p:sldIdLst',n);rels=E.fromstring(data['ppt/_rels/presentation.xml.rels']);byid={r.get('Id'):r for r in rels};remove=set()
 for number,slideid in enumerate(list(ids),1):
  if number in keep:continue
  rid=slideid.get('{'+n['r']+'}id');rel=byid[rid];part=posixpath.normpath(posixpath.join('ppt',rel.get('Target'))).lstrip('/');rp=posixpath.join(posixpath.dirname(part),'_rels',posixpath.basename(part)+'.rels')
  if rp in data:
   for r in E.fromstring(data[rp]):
    if r.get('Type').endswith('/notesSlide'):
     note=posixpath.normpath(posixpath.join(posixpath.dirname(part),r.get('Target'))).lstrip('/');remove.add(note);remove.add(posixpath.join(posixpath.dirname(note),'_rels',posixpath.basename(note)+'.rels'))
  remove.update([part,rp]);ids.remove(slideid);rels.remove(rel)
 for name in remove:data.pop(name,None)
 ct=E.fromstring(data['[Content_Types].xml'])
 for el in list(ct):
  if el.get('PartName','').lstrip('/') in remove:ct.remove(el)
 data['[Content_Types].xml']=E.tostring(ct,encoding='utf-8',xml_declaration=True);data['ppt/presentation.xml']=E.tostring(p,encoding='utf-8',xml_declaration=True);data['ppt/_rels/presentation.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
 out=D/f'validation-part{group}.pptx'
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
  for name,value in data.items():z.writestr(name,value)
 print(json.dumps({'part':group,'slides':sorted(keep)}))
