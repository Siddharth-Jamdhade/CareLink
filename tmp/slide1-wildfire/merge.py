from pathlib import Path
from lxml import etree as E
import zipfile,copy,json
D=Path(__file__).parent;W=D.parents[1];src=W/'output/carelink-team-deck/CareLink_Phase2_Five_Member_Team.pptx'
n={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(src) as z:data={name:z.read(name) for name in z.namelist()}
with zipfile.ZipFile(D/'content.pptx') as z:r=E.fromstring(z.read('ppt/slides/slide1.xml'))
fields={el.find('p:nvSpPr/p:cNvPr',n).get('name'):el for el in r.findall('.//p:sp',n)}
root=E.fromstring(data['ppt/slides/slide1.xml']);tree=root.find('p:cSld/p:spTree',n)
for old in list(tree):
 pr=old.find('p:nvSpPr/p:cNvPr',n)
 if pr is not None and pr.get('name') in fields:
  new=copy.deepcopy(fields[pr.get('name')]);new.find('p:nvSpPr/p:cNvPr',n).set('id',pr.get('id'));tree.replace(old,new)
data['ppt/slides/slide1.xml']=E.tostring(root,encoding='utf-8',xml_declaration=True)
closing=E.fromstring(data['ppt/slides/slide13.xml'])
for sp in closing.findall('.//p:sp',n):
 pr=sp.find('p:nvSpPr/p:cNvPr',n)
 if pr is not None and pr.get('name')=='Closing team identity':
  texts=sp.findall('.//a:t',n);assert len(texts)==1;texts[0].text='WildFire • O2S22M'
data['ppt/slides/slide13.xml']=E.tostring(closing,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(D/'candidate.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for name,value in data.items():z.writestr(name,value)
with zipfile.ZipFile(src) as z:
 changed=[name for name in z.namelist() if z.read(name)!=data[name]]
 assert set(changed)=={'ppt/slides/slide1.xml','ppt/slides/slide13.xml'},changed
print(json.dumps({'changed_parts':changed,'all_other_parts':'byte-identical'}))
