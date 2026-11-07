import zipfile,copy,posixpath
from lxml import etree as E
from pathlib import Path
D=Path(__file__).parent
src=D.parents[1]/'output/slide6/CareLink_Technology_AI_Final.pptx'
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(src) as z:data={n:z.read(n) for n in z.namelist()}
with zipfile.ZipFile(D/'content.pptx') as z:content={n:z.read(n) for n in z.namelist()}
slide=E.fromstring(data['ppt/slides/slide7.xml']);tree=slide.find('p:cSld/p:spTree',ns)
for el in tree:
 pr=el.find('.//p:cNvPr',ns)
 if pr is not None and pr.get('id')=='140':
  runs=el.findall('.//a:t',ns)
  if runs:
   runs[0].text='Build Sprint Journey & Progress'
   for run in runs[1:]:run.text=''
for el in list(tree):
 pr=el.find('.//p:cNvPr',ns)
 if pr is not None and pr.get('id') not in ['139','140','141']:tree.remove(el)
new=E.fromstring(content['ppt/slides/slide1.xml']).find('p:cSld/p:spTree',ns)
R='http://schemas.openxmlformats.org/package/2006/relationships'
RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
rels=E.fromstring(data['ppt/slides/_rels/slide7.xml.rels'])
generatedRels=E.fromstring(content['ppt/slides/_rels/slide1.xml.rels'])
mapping={}
for rel in generatedRels:
 if rel.get('Type').endswith('/image'):
  rid='rIdCareLinkWristbandProduct';mapping[rel.get('Id')]=rid
  old=posixpath.normpath(posixpath.join('ppt/slides',rel.get('Target'))).lstrip('/')
  data['ppt/media/carelink_wristband_product.png']=content[old]
  E.SubElement(rels,'{'+R+'}Relationship',Id=rid,Type=rel.get('Type'),Target='../media/carelink_wristband_product.png')
data['ppt/slides/_rels/slide7.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
for i,el in enumerate(list(new)[2:],start=200):
 el=copy.deepcopy(el)
 for pr in el.findall('.//p:cNvPr',ns):pr.set('id',str(i))
 for n in el.iter():
  for key,value in list(n.attrib.items()):
   if key.startswith('{'+RN+'}') and value in mapping:n.set(key,mapping[value])
 tree.append(el)
continuation=E.fromstring(data['ppt/slides/slide13.xml'])
for footer in continuation.findall('.//p:sp',ns):
 footerPr=footer.find('.//p:cNvPr',ns)
 if footerPr is not None and footerPr.get('name')=='Slide 5b continuation label':
  footer=copy.deepcopy(footer)
  footerPr=footer.find('.//p:cNvPr',ns);footerPr.set('name','Slide 7 label')
  for t in footer.findall('.//a:t',ns):t.text='7'
  tree.append(footer)
data['ppt/slides/slide7.xml']=E.tostring(slide,encoding='utf-8',xml_declaration=True)
# Preserve all other package parts; add scenario qualification to existing notes.
notePath='ppt/notesSlides/notesSlide7.xml'
if notePath in data:
 r=E.fromstring(data[notePath])
 for sp in r.findall('.//p:sp',ns):
  ph=sp.find('.//p:ph',ns)
  if ph is not None and ph.get('type')=='body':
   b=sp.find('p:txBody',ns)
   for el in list(b):
    if el.tag.endswith('}p'):b.remove(el)
   p=E.SubElement(b,'{'+ns['a']+'}p');run=E.SubElement(p,'{'+ns['a']+'}r')
   E.SubElement(run,'{'+ns['a']+'}t').text='Sprint milestones and completion status supplied by user, not independently audited. Sarvam voice input remains in progress. Week 2 ANC checker description reflects user-reported implementation rather than independent validation of clinical guidelines. The wristband product image is an AI-generated design concept and is not evidence of the built prototype. Timeline and evolution process are editable native PowerPoint shapes, not native SmartArt.'
 data[notePath]=E.tostring(r,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(D/'candidate.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for n,v in data.items():z.writestr(n,v)
with zipfile.ZipFile(src) as z:
 for n in z.namelist():
  if n not in ['ppt/slides/slide7.xml','ppt/slides/_rels/slide7.xml.rels',notePath]:assert z.read(n)==data[n],n
print('Updated slide 7; every other slide unchanged')





