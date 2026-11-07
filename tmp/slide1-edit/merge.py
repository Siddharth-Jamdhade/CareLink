from pathlib import Path
from lxml import etree as E
import zipfile,copy,posixpath,json
D=Path(__file__).parent
src=Path(r'C:\Users\SIDDHARTH\Downloads\CareLink_Phase 2.pptx')
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
R='http://schemas.openxmlformats.org/package/2006/relationships';RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
with zipfile.ZipFile(src) as z:data={n:z.read(n) for n in z.namelist()}
with zipfile.ZipFile(D/'content.pptx') as z:content={n:z.read(n) for n in z.namelist()}
root=E.fromstring(data['ppt/slides/slide1.xml']);tree=root.find('p:cSld/p:spTree',ns)
preserved=[]
for el in list(tree):
 pr=el.find('.//p:cNvPr',ns)
 if pr is not None and pr.get('id') in ['89','90','91','92']:tree.remove(el)
 elif pr is not None:preserved.append((pr.get('id'),E.tostring(el)))
rels=E.fromstring(data['ppt/slides/_rels/slide1.xml.rels']);generated=E.fromstring(content['ppt/slides/_rels/slide1.xml.rels']);mapping={}
for rel in generated:
 if rel.get('Type').endswith('/image'):
  rid='rIdCareLinkWristband';mapping[rel.get('Id')]=rid
  old=posixpath.normpath(posixpath.join('ppt/slides',rel.get('Target'))).lstrip('/')
  data['ppt/media/carelink_slide1_wristband.png']=content[old]
  E.SubElement(rels,'{'+R+'}Relationship',Id=rid,Type=rel.get('Type'),Target='../media/carelink_slide1_wristband.png')
new=E.fromstring(content['ppt/slides/slide1.xml']).find('p:cSld/p:spTree',ns)
for i,el in enumerate(list(new)[2:],start=900):
 el=copy.deepcopy(el)
 for pr in el.findall('.//p:cNvPr',ns):pr.set('id',str(i))
 for n in el.iter():
  for key,value in list(n.attrib.items()):
   if key.startswith('{'+RN+'}') and value in mapping:n.set(key,mapping[value])
 tree.append(el)
data['ppt/slides/slide1.xml']=E.tostring(root,encoding='utf-8',xml_declaration=True)
data['ppt/slides/_rels/slide1.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
ct=E.fromstring(data['[Content_Types].xml']); CT='http://schemas.openxmlformats.org/package/2006/content-types'
if not any(el.get('Extension')=='png' for el in ct):
 E.SubElement(ct,'{'+CT+'}Default',Extension='png',ContentType='image/png');data['[Content_Types].xml']=E.tostring(ct,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(D/'candidate.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for n,v in data.items():z.writestr(n,v)
with zipfile.ZipFile(src) as z:
 changed=[n for n in z.namelist() if z.read(n)!=data[n]]
 assert set(changed)<= {'ppt/slides/slide1.xml','ppt/slides/_rels/slide1.xml.rels','[Content_Types].xml'},changed
for id,blob in preserved:
 found=[el for el in tree if (pr:=el.find('.//p:cNvPr',ns)) is not None and pr.get('id')==id]
 assert len(found)==1 and E.tostring(found[0])==blob,id
print(json.dumps({'changed_parts':changed,'other_slides':'byte-identical','template_elements':'unchanged','slide_count':13}))
