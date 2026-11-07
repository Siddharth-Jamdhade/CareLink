import zipfile,copy,posixpath,json
from lxml import etree as E
from pathlib import Path
D=Path(__file__).parent;W=D.parents[1]
src=W/'output/carelink-slide6-nfc-flow/CareLink_Phase2_Slide6_NFC_Primary.pptx'
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(src) as z:data={n:z.read(n) for n in z.namelist()}
with zipfile.ZipFile(D/'content.pptx') as z:content={n:z.read(n) for n in z.namelist()}
slide=E.fromstring(data['ppt/slides/slide7.xml']);tree=slide.find('p:cSld/p:spTree',ns)
for el in list(tree):
 pr=el.find('.//p:cNvPr',ns)
 if pr is not None and pr.get('id') not in ['130','131','132']:tree.remove(el)
new=E.fromstring(content['ppt/slides/slide1.xml']).find('p:cSld/p:spTree',ns)
R='http://schemas.openxmlformats.org/package/2006/relationships';RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
rels=E.fromstring(data['ppt/slides/_rels/slide7.xml.rels']);generated=E.fromstring(content['ppt/slides/_rels/slide1.xml.rels']);mapping={}
for i,rel in enumerate(generated):
 if rel.get('Type').endswith('/image'):
  rid='rIdCareLinkSlide7Tech'+str(i);mapping[rel.get('Id')]=rid
  old=posixpath.normpath(posixpath.join('ppt/slides',rel.get('Target'))).lstrip('/')
  ext=Path(old).suffix;target='ppt/media/carelink_slide7_tech_'+str(i)+ext
  data[target]=content[old]
  E.SubElement(rels,'{'+R+'}Relationship',Id=rid,Type=rel.get('Type'),Target='../media/'+Path(target).name)
data['ppt/slides/_rels/slide7.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
for i,el in enumerate(list(new)[2:],start=1000):
 el=copy.deepcopy(el)
 for pr in el.findall('.//p:cNvPr',ns):pr.set('id',str(i))
 for n in el.iter():
  for key,value in list(n.attrib.items()):
   if key.startswith('{'+RN+'}') and value in mapping:n.set(key,mapping[value])
 tree.append(el)
data['ppt/slides/slide7.xml']=E.tostring(slide,encoding='utf-8',xml_declaration=True)
ct=E.fromstring(data['[Content_Types].xml']);CT='http://schemas.openxmlformats.org/package/2006/content-types'
for ext,typ in [('png','image/png'),('jpg','image/jpeg'),('jpeg','image/jpeg')]:
 if not any(el.get('Extension')==ext for el in ct):E.SubElement(ct,'{'+CT+'}Default',Extension=ext,ContentType=typ)
data['[Content_Types].xml']=E.tostring(ct,encoding='utf-8',xml_declaration=True)

notesPath=None
for rel in rels:
 if rel.get('Type').endswith('/notesSlide'):
  notesPath=posixpath.normpath(posixpath.join('ppt/slides',rel.get('Target'))).lstrip('/')
if notesPath and notesPath in data:
 note=E.fromstring(data[notesPath])
 for sp in note.findall('.//p:sp',ns):
  ph=sp.find('.//p:ph',ns)
  if ph is not None and ph.get('type')=='body':
   b=sp.find('p:txBody',ns)
   for el in list(b):
    if el.tag.endswith('}p'):b.remove(el)
   par=E.SubElement(b,'{'+ns['a']+'}p');run=E.SubElement(par,'{'+ns['a']+'}r')
   E.SubElement(run,'{'+ns['a']+'}t').text='User-supplied technology stack and hardware prices. Actual scanner and wristband photographs supplied by user. Simplified logical architecture with Doctor Portal and Patient App outputs. Patient App is under development. AI extracts data only and never diagnoses or prescribes. Handwriting recognition is listed as supplied; accuracy was not evaluated here.'
 data[notesPath]=E.tostring(note,encoding='utf-8',xml_declaration=True)

with zipfile.ZipFile(D/'candidate.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for n,v in data.items():z.writestr(n,v)
with zipfile.ZipFile(src) as z:
 changed=[n for n in z.namelist() if z.read(n)!=data[n]]
 assert set(changed)<= {'ppt/slides/slide7.xml','ppt/slides/_rels/slide7.xml.rels','[Content_Types].xml',notesPath},changed
 for id in ['130','131','132']:
  oldroot=E.fromstring(z.read('ppt/slides/slide7.xml'))
  old=oldroot.xpath('.//p:spTree/*[.//p:cNvPr[@id="'+id+'"]]',namespaces=ns)
  newel=slide.xpath('.//p:spTree/*[.//p:cNvPr[@id="'+id+'"]]',namespaces=ns)
  assert E.tostring(old[0])==E.tostring(newel[0]),id
print(json.dumps({'changed_parts':changed,'other_slides':'byte-identical','branding':'preserved'}))
