import zipfile,copy,posixpath
from pathlib import Path
from lxml import etree as E
D=Path(__file__).parent;W=D.parents[1]
base=W/'output/slide5/CareLink_Solution_Overview_Updated.pptx'
flow=W/'output/slide5-flow/CareLink_Slide5_Workflow_Final.pptx'
with zipfile.ZipFile(base) as z:data={n:z.read(n) for n in z.namelist()}
with zipfile.ZipFile(flow) as z:extra={n:z.read(n) for n in z.namelist()}
P='http://schemas.openxmlformats.org/presentationml/2006/main'
A='http://schemas.openxmlformats.org/drawingml/2006/main'
R='http://schemas.openxmlformats.org/package/2006/relationships'
RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CT='http://schemas.openxmlformats.org/package/2006/content-types'
ns={'p':P,'a':A}
slide=E.fromstring(extra['ppt/slides/slide5.xml'])
tree=slide.find('p:cSld/p:spTree',ns)
# A native footer preserves continuation numbering independently of slide order.
sp=E.SubElement(tree,'{'+P+'}sp')
nv=E.SubElement(sp,'{'+P+'}nvSpPr');E.SubElement(nv,'{'+P+'}cNvPr',id='999',name='Slide 5b continuation label');E.SubElement(nv,'{'+P+'}cNvSpPr',txBox='1');E.SubElement(nv,'{'+P+'}nvPr')
pr=E.SubElement(sp,'{'+P+'}spPr');xf=E.SubElement(pr,'{'+A+'}xfrm');E.SubElement(xf,'{'+A+'}off',x=str(1190*9525),y=str(689*9525));E.SubElement(xf,'{'+A+'}ext',cx=str(55*9525),cy=str(28*9525))
geom=E.SubElement(pr,'{'+A+'}prstGeom',prst='rect');E.SubElement(geom,'{'+A+'}avLst');fill=E.SubElement(pr,'{'+A+'}solidFill');E.SubElement(fill,'{'+A+'}srgbClr',val='FFFFFF');ln=E.SubElement(pr,'{'+A+'}ln');E.SubElement(ln,'{'+A+'}noFill')
b=E.SubElement(sp,'{'+P+'}txBody');E.SubElement(b,'{'+A+'}bodyPr',lIns='0',rIns='0',tIns='0',bIns='0');E.SubElement(b,'{'+A+'}lstStyle');pa=E.SubElement(b,'{'+A+'}p');E.SubElement(pa,'{'+A+'}pPr',algn='r');run=E.SubElement(pa,'{'+A+'}r');rp=E.SubElement(run,'{'+A+'}rPr',sz='900');f=E.SubElement(rp,'{'+A+'}solidFill');E.SubElement(f,'{'+A+'}srgbClr',val='1F3DA9');E.SubElement(rp,'{'+A+'}latin',typeface='Calibri');E.SubElement(run,'{'+A+'}t').text='5b'
data['ppt/slides/slide13.xml']=E.tostring(slide,encoding='utf-8',xml_declaration=True)
rels=E.fromstring(extra['ppt/slides/_rels/slide5.xml.rels'])
for rel in rels:
 if rel.get('Type').endswith('/notesSlide'):rel.set('Target','../notesSlides/notesSlide13.xml')
 if rel.get('Type').endswith('/image'):
  path=posixpath.normpath(posixpath.join('ppt/slides',rel.get('Target'))).lstrip('/')
  if path in data:assert data[path]==extra[path],path
  else:data[path]=extra[path]
data['ppt/slides/_rels/slide13.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
data['ppt/notesSlides/notesSlide13.xml']=extra['ppt/notesSlides/notesSlide5.xml']
nr=E.fromstring(extra['ppt/notesSlides/_rels/notesSlide5.xml.rels'])
for rel in nr:
 if rel.get('Type').endswith('/slide'):rel.set('Target','../slides/slide13.xml')
data['ppt/notesSlides/_rels/notesSlide13.xml.rels']=E.tostring(nr,encoding='utf-8',xml_declaration=True)
presentation=E.fromstring(data['ppt/presentation.xml']);ids=presentation.find('p:sldIdLst',ns)
node=E.Element('{'+P+'}sldId',id=str(max(int(x.get('id')) for x in ids)+1));node.set('{'+RN+'}id','rIdCareLink5b');ids.insert(5,node)
data['ppt/presentation.xml']=E.tostring(presentation,encoding='utf-8',xml_declaration=True)
pr=E.fromstring(data['ppt/_rels/presentation.xml.rels']);E.SubElement(pr,'{'+R+'}Relationship',Id='rIdCareLink5b',Type=RN+'/slide',Target='slides/slide13.xml')
data['ppt/_rels/presentation.xml.rels']=E.tostring(pr,encoding='utf-8',xml_declaration=True)
types=E.fromstring(data['[Content_Types].xml'])
E.SubElement(types,'{'+CT+'}Override',PartName='/ppt/slides/slide13.xml',ContentType='application/vnd.openxmlformats-officedocument.presentationml.slide+xml')
E.SubElement(types,'{'+CT+'}Override',PartName='/ppt/notesSlides/notesSlide13.xml',ContentType='application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml')
data['[Content_Types].xml']=E.tostring(types,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(D/'candidate.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for n,v in data.items():z.writestr(n,v)
with zipfile.ZipFile(base) as z:
 for i in range(1,13):assert z.read(f'ppt/slides/slide{i}.xml')==data[f'ppt/slides/slide{i}.xml']
print('13 slides: overview at position 5; workflow 5b at position 6; original slides preserved')
