import zipfile,copy,posixpath
from lxml import etree as E
from pathlib import Path
D=Path(__file__).parent
src=Path(r'C:/Users/SIDDHARTH/Downloads/PPT_Final_Teamplate_Health-a-thon 2026.pptx')
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
R='http://schemas.openxmlformats.org/package/2006/relationships'
with zipfile.ZipFile(src) as z: data={n:z.read(n) for n in z.namelist()}
with zipfile.ZipFile(D/'content.pptx') as z: content={n:z.read(n) for n in z.namelist()}
slide=E.fromstring(data['ppt/slides/slide3.xml']); tree=slide.find('p:cSld/p:spTree',ns)
for el in list(tree):
 pr=el.find('.//p:cNvPr',ns)
 if pr is not None and pr.get('id') not in ['106','107','108']: tree.remove(el)
# Preserve native title, logo and footer; replace only slide body.
rels=E.fromstring(data['ppt/slides/_rels/slide3.xml.rels'])
cr=E.fromstring(content['ppt/slides/_rels/slide1.xml.rels']); mapping={}
for rel in cr:
 if rel.get('Type').endswith('/image'):
  rid='rIdCareLinkPhoto'; mapping[rel.get('Id')]=rid
  old=posixpath.normpath(posixpath.join('ppt/slides',rel.get('Target')))
  data['ppt/media/carelink_anc_sample.png']=content[old.lstrip('/')]
  E.SubElement(rels,'{'+R+'}Relationship',Id=rid,Type=rel.get('Type'),Target='../media/carelink_anc_sample.png')
ct=E.fromstring(content['ppt/slides/slide1.xml']).find('p:cSld/p:spTree',ns)
for i,el in enumerate(list(ct)[2:],start=200):
 el=copy.deepcopy(el)
 for pr in el.findall('.//p:cNvPr',ns):pr.set('id',str(i))
 for n in el.iter():
  for key,value in list(n.attrib.items()):
   if key.startswith('{'+ns['r']+'}') and value in mapping:n.set(key,mapping[value])
 tree.append(el)
data['ppt/slides/slide3.xml']=E.tostring(slide,encoding='utf-8',xml_declaration=True)
data['ppt/slides/_rels/slide3.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
types=E.fromstring(data['[Content_Types].xml'])
if not any(x.get('Extension')=='png' for x in types):E.SubElement(types,'{http://schemas.openxmlformats.org/package/2006/content-types}Default',Extension='png',ContentType='image/png')
data['[Content_Types].xml']=E.tostring(types,encoding='utf-8',xml_declaration=True)
# Put the researched source and image disclosure in existing notes.
noteRel=next((x for x in rels if x.get('Type').endswith('/notesSlide')),None)
if noteRel is not None:
 notePath=posixpath.normpath(posixpath.join('ppt/slides',noteRel.get('Target')))
 note=E.fromstring(data[notePath]); body=None
 for sp in note.findall('.//p:sp',ns):
  ph=sp.find('.//p:ph',ns)
  if ph is not None and ph.get('type')=='body':body=sp.find('p:txBody',ns)
 if body is not None:
  for el in list(body):
   if el.tag.endswith('}p'):body.remove(el)
  for line in ['WHO et al. (2025), Trends in maternal mortality 2000 to 2023. India: 7.2% of global maternal deaths in 2023.','https://www.who.int/publications/i/item/9789240108462/','Image: user-supplied synthetic ANC card illustration. Workflow bullets describe problem framing, not measured prevalence or an exhaustive market assessment. Mortality burden is context, not deaths attributed to missing records.']:
   p=E.SubElement(body,'{'+ns['a']+'}p');r=E.SubElement(p,'{'+ns['a']+'}r');E.SubElement(r,'{'+ns['a']+'}t').text=line
  data[notePath]=E.tostring(note,encoding='utf-8',xml_declaration=True)
out=D/'candidate.pptx'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for name,value in data.items():z.writestr(name,value)
with zipfile.ZipFile(src) as z:
 for n in z.namelist():
  if n.startswith('ppt/slides/slide') and n.endswith('.xml') and n!='ppt/slides/slide3.xml':assert z.read(n)==data[n],n
print('Merged slide 3; all other slide XML unchanged')


