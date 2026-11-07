import zipfile,copy,posixpath,json
from lxml import etree as E
from pathlib import Path
D=Path(__file__).parent;W=D.parents[1]
src=W/'output/carelink-slide1/CareLink_Phase2_Slide1_Updated.pptx'
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(src) as z:data={n:z.read(n) for n in z.namelist()}
with zipfile.ZipFile(D/'content.pptx') as z:content={n:z.read(n) for n in z.namelist()}
slide=E.fromstring(data['ppt/slides/slide4.xml']);tree=slide.find('p:cSld/p:spTree',ns)
for el in list(tree):
 pr=el.find('.//p:cNvPr',ns)
 if pr is not None and pr.get('id') not in ['114','115','116']:tree.remove(el)
new=E.fromstring(content['ppt/slides/slide1.xml']).find('p:cSld/p:spTree',ns)
R='http://schemas.openxmlformats.org/package/2006/relationships';RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
rels=E.fromstring(data['ppt/slides/_rels/slide4.xml.rels']);generated=E.fromstring(content['ppt/slides/_rels/slide1.xml.rels']);mapping={}
for i,rel in enumerate(generated):
 if rel.get('Type').endswith('/image'):
  rid='rIdCareLinkHero'+str(i);mapping[rel.get('Id')]=rid
  old=posixpath.normpath(posixpath.join('ppt/slides',rel.get('Target'))).lstrip('/')
  ext=Path(old).suffix;target='ppt/media/carelink_hero_'+str(i)+ext
  data[target]=content[old]
  E.SubElement(rels,'{'+R+'}Relationship',Id=rid,Type=rel.get('Type'),Target='../media/'+Path(target).name)
data['ppt/slides/_rels/slide4.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
for i,el in enumerate(list(new)[2:],start=1000):
 el=copy.deepcopy(el)
 for pr in el.findall('.//p:cNvPr',ns):pr.set('id',str(i))
 for n in el.iter():
  for key,value in list(n.attrib.items()):
   if key.startswith('{'+RN+'}') and value in mapping:n.set(key,mapping[value])
 tree.append(el)
data['ppt/slides/slide4.xml']=E.tostring(slide,encoding='utf-8',xml_declaration=True)
ct=E.fromstring(data['[Content_Types].xml']);CT='http://schemas.openxmlformats.org/package/2006/content-types'
for ext,typ in [('png','image/png'),('jpg','image/jpeg'),('jpeg','image/jpeg')]:
 if not any(el.get('Extension')==ext for el in ct):E.SubElement(ct,'{'+CT+'}Default',Extension=ext,ContentType=typ)
data['[Content_Types].xml']=E.tostring(ct,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(D/'candidate.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for n,v in data.items():z.writestr(n,v)
with zipfile.ZipFile(src) as z:
 changed=[n for n in z.namelist() if z.read(n)!=data[n]]
 assert set(changed)<= {'ppt/slides/slide4.xml','ppt/slides/_rels/slide4.xml.rels','[Content_Types].xml'},changed
 for id in ['114','115','116']:
  oldroot=E.fromstring(z.read('ppt/slides/slide4.xml'))
  old=oldroot.xpath('.//p:spTree/*[.//p:cNvPr[@id="'+id+'"]]',namespaces=ns)
  newel=slide.xpath('.//p:spTree/*[.//p:cNvPr[@id="'+id+'"]]',namespaces=ns)
  assert E.tostring(old[0])==E.tostring(newel[0]),id
print(json.dumps({'changed_parts':changed,'other_slides':'byte-identical','branding':'preserved'}))
