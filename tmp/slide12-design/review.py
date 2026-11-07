from pathlib import Path
import zipfile
from lxml import etree as E
D=Path(__file__).parent
with zipfile.ZipFile(D/'candidate.pptx') as z:data={n:z.read(n) for n in z.namelist()}
P='http://schemas.openxmlformats.org/presentationml/2006/main';R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
pres=E.fromstring(data['ppt/presentation.xml']);ids=pres.find('{'+P+'}sldIdLst')
rels=E.fromstring(data['ppt/_rels/presentation.xml.rels'])
rid=next(x.get('Id') for x in rels if x.get('Target')=='slides/slide12.xml')
for el in list(ids):
 if el.get('{'+R+'}id')!=rid:ids.remove(el)
for rel in list(rels):
 if rel.get('Type','').endswith('/slide') and rel.get('Id')!=rid:rels.remove(rel)
data['ppt/_rels/presentation.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
data['ppt/presentation.xml']=E.tostring(pres,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(D/'review.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for n,v in data.items():z.writestr(n,v)
print('Single-slide review package created')

