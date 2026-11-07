import zipfile,copy,posixpath
from lxml import etree as E
from pathlib import Path
D=Path(__file__).parent
src=D.parents[1]/'output/slide4-photo/CareLink_Slide4_With_NFC_Photo.pptx'
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(src) as z:data={n:z.read(n) for n in z.namelist()}
with zipfile.ZipFile(D/'content.pptx') as z:content={n:z.read(n) for n in z.namelist()}
slide=E.fromstring(data['ppt/slides/slide5.xml']);tree=slide.find('p:cSld/p:spTree',ns)
for el in tree:
 pr=el.find('.//p:cNvPr',ns)
 if pr is not None and pr.get('id')=='123':
  runs=el.findall('.//a:t',ns)
  if runs:
   runs[0].text='Solution Overview & Key Features'
   for run in runs[1:]:run.text=''
for el in list(tree):
 pr=el.find('.//p:cNvPr',ns)
 if pr is not None and pr.get('id') not in ['122','123','124']:tree.remove(el)
new=E.fromstring(content['ppt/slides/slide1.xml']).find('p:cSld/p:spTree',ns)
R='http://schemas.openxmlformats.org/package/2006/relationships'
RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
rels=E.fromstring(data['ppt/slides/_rels/slide5.xml.rels'])
generatedRels=E.fromstring(content['ppt/slides/_rels/slide1.xml.rels'])
mapping={}
for rel in generatedRels:
 if rel.get('Type').endswith('/image'):
  rid='rIdCareLinkSolutionArt';mapping[rel.get('Id')]=rid
  old=posixpath.normpath(posixpath.join('ppt/slides',rel.get('Target'))).lstrip('/')
  data['ppt/media/carelink_solution_art.png']=content[old]
  E.SubElement(rels,'{'+R+'}Relationship',Id=rid,Type=rel.get('Type'),Target='../media/carelink_solution_art.png')
data['ppt/slides/_rels/slide5.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
for i,el in enumerate(list(new)[2:],start=200):
 el=copy.deepcopy(el)
 for pr in el.findall('.//p:cNvPr',ns):pr.set('id',str(i))
 for n in el.iter():
  for key,value in list(n.attrib.items()):
   if key.startswith('{'+RN+'}') and value in mapping:n.set(key,mapping[value])
 tree.append(el)
data['ppt/slides/slide5.xml']=E.tostring(slide,encoding='utf-8',xml_declaration=True)
# Preserve all other package parts; add scenario qualification to existing notes.
notePath='ppt/notesSlides/notesSlide5.xml'
if notePath in data:
 r=E.fromstring(data[notePath])
 for sp in r.findall('.//p:sp',ns):
  ph=sp.find('.//p:ph',ns)
  if ph is not None and ph.get('type')=='body':
   b=sp.find('p:txBody',ns)
   for el in list(b):
    if el.tag.endswith('}p'):b.remove(el)
   p=E.SubElement(b,'{'+ns['a']+'}p');run=E.SubElement(p,'{'+ns['a']+'}r')
   E.SubElement(run,'{'+ns['a']+'}t').text='Feature descriptions supplied by user. Unverified 80/20 ratios and two-versus-fifteen-minute claims omitted. Self-learning represents the proposed doctor-feedback loop, not demonstrated autonomous model retraining. Illustration generated with the built-in imagegen tool; conceptual patient identification visual, not a technical NFC range diagram. QR code is illustrative.'
 data[notePath]=E.tostring(r,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(D/'candidate.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for n,v in data.items():z.writestr(n,v)
with zipfile.ZipFile(src) as z:
 for n in z.namelist():
  if n not in ['ppt/slides/slide5.xml','ppt/slides/_rels/slide5.xml.rels',notePath]:assert z.read(n)==data[n],n
print('Updated slide 5; every other slide unchanged')



