import zipfile,copy,json
from pathlib import Path
from lxml import etree as E
from PIL import ImageFont
D=Path(__file__).parent;W=D.parents[1]
src=W/'output/slide11/CareLink_Roadmap_Updated.pptx'
settings={'team_code':'[Team code]','email':'','demo_url':''}
if (D/'details.json').exists():settings.update(json.loads((D/'details.json').read_text(encoding='utf-8-sig')))
with zipfile.ZipFile(src) as z:data={n:z.read(n) for n in z.namelist()}
P='http://schemas.openxmlformats.org/presentationml/2006/main';A='http://schemas.openxmlformats.org/drawingml/2006/main';RN='http://schemas.openxmlformats.org/officeDocument/2006/relationships';R='http://schemas.openxmlformats.org/package/2006/relationships'
ns={'p':P,'a':A};root=E.fromstring(data['ppt/slides/slide12.xml']);tree=root.find('p:cSld/p:spTree',ns)
shapes={el.find('.//p:cNvPr',ns).get('id'):el for el in tree if el.find('.//p:cNvPr',ns) is not None}
shapes['183'].find('.//a:t',ns).text='Siddharth Jamdhade (Solo)  •  '+settings['team_code']
tag=shapes['185'];tag.find('.//a:t',ns).text="Because every mother's story matters."
for pr in tag.findall('.//a:rPr',ns):
 pr.set('i','1');pr.set('b','0');pr.set('sz','2000')
 color=pr.find('a:solidFill/a:srgbClr',ns)
 if color is not None:color.set('val','0D8743')
 for font in pr.findall('a:latin',ns):font.set('typeface','Calibri')
rels=E.fromstring(data['ppt/slides/_rels/slide12.xml.rels'])
linkshape=shapes['184'];para=linkshape.find('.//a:p',ns);baseRun=para.find('a:r',ns);baseProps=copy.deepcopy(baseRun.find('a:rPr',ns))
for r in list(para):
 if r.tag in ['{'+A+'}r','{'+A+'}br']:para.remove(r)
links=[('Website','https://carelink-hospital-portal-sj.jamdhadesiddharth69.chatgpt.site'),('Demo Video' if settings['demo_url'] else '[Demo Video]',settings['demo_url']),('GitHub','https://github.com/Siddharth-Jamdhade/CareLink'),(settings['email'] or '[Contact email]','mailto:'+settings['email'] if settings['email'] else '')]
for i,(label,url) in enumerate(links):
 if i:
  run=E.Element('{'+A+'}r');run.append(copy.deepcopy(baseProps));E.SubElement(run,'{'+A+'}t').text='  |  ';para.insert(len(para)-1,run)
 run=E.Element('{'+A+'}r');props=copy.deepcopy(baseProps)
 if url:
  rid='rIdCareLinkClosing'+str(i)
  E.SubElement(rels,'{'+R+'}Relationship',Id=rid,Type=RN+'/hyperlink',Target=url,TargetMode='External')
 run.append(props);E.SubElement(run,'{'+A+'}t').text=label;para.insert(len(para)-1,run)
# Transparent hyperlink hotspots keep the template link text gray.
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
lineText='  |  '.join(label for label,url in links)
cursor=640-font.getlength(lineText)/2
for i,(label,url) in enumerate(links):
 width=font.getlength(label)
 if url:
  hot=E.SubElement(tree,'{'+P+'}sp');nv=E.SubElement(hot,'{'+P+'}nvSpPr')
  pr=E.SubElement(nv,'{'+P+'}cNvPr',id=str(1100+i),name='Closing link hotspot '+label)
  click=E.SubElement(pr,'{'+A+'}hlinkClick');click.set('{'+RN+'}id','rIdCareLinkClosing'+str(i))
  E.SubElement(nv,'{'+P+'}cNvSpPr');E.SubElement(nv,'{'+P+'}nvPr')
  pr=E.SubElement(hot,'{'+P+'}spPr');xf=E.SubElement(pr,'{'+A+'}xfrm')
  E.SubElement(xf,'{'+A+'}off',x=str(round(cursor*9525)),y=str(round(408*9525)))
  E.SubElement(xf,'{'+A+'}ext',cx=str(round(width*9525)),cy=str(27*9525))
  geom=E.SubElement(pr,'{'+A+'}prstGeom',prst='rect');E.SubElement(geom,'{'+A+'}avLst')
  fill=E.SubElement(pr,'{'+A+'}solidFill');color=E.SubElement(fill,'{'+A+'}srgbClr',val='FFFFFF');E.SubElement(color,'{'+A+'}alpha',val='0')
  ln=E.SubElement(pr,'{'+A+'}ln');E.SubElement(ln,'{'+A+'}noFill')
 cursor+=width+font.getlength('  |  ')
# Keep the original layout and add only the continuation-aware footer label.
continuation=E.fromstring(data['ppt/slides/slide13.xml'])
for footer in continuation.findall('.//p:sp',ns):
 pr=footer.find('.//p:cNvPr',ns)
 if pr is not None and pr.get('name')=='Slide 5b continuation label':
  footer=copy.deepcopy(footer);footer.find('.//p:cNvPr',ns).set('name','Slide 12 label')
  for t in footer.findall('.//a:t',ns):t.text='12'
  tree.append(footer)
data['ppt/slides/slide12.xml']=E.tostring(root,encoding='utf-8',xml_declaration=True)
data['ppt/slides/_rels/slide12.xml.rels']=E.tostring(rels,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(D/'candidate.pptx','w',zipfile.ZIP_DEFLATED) as z:
 for n,v in data.items():z.writestr(n,v)
with zipfile.ZipFile(src) as z:
 for n in z.namelist():
  if n not in ['ppt/slides/slide12.xml','ppt/slides/_rels/slide12.xml.rels']:assert z.read(n)==data[n],n
print('Closing slide updated in original template layout')
