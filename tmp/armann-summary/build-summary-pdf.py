from pathlib import Path
import json,re,io,copy
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader,PdfWriter
from pypdf.generic import ContentStream
D=Path(__file__).parent;W=D.parents[1];OUT=W/'output/carelink-summary';OUT.mkdir(exist_ok=True,parents=True)
TEMPLATE=Path(r'C:\Users\SIDDHARTH\Downloads\ACFrOgCIYCEzF2-YsvwW5Efl4Dj4n---MEj6VMNrJN2-vDHVQ7qxXQ-a_e6lObDZyse86sM4clBSQtVby4rnbLqr4Sp1iWM7Kn4-Jq37aS0Y5gK6yapAiTlkD8Pt2qD2D6JUgDeVN7Gf-6diUatIz4ydW1m-h7DU6tYdy1unNQ==.pdf')
for name,file in [('Arial','arial.ttf'),('ArialBold','arialbd.ttf'),('CalibriBold','calibrib.ttf')]:pdfmetrics.registerFont(TTFont(name,Path(r'C:\Windows\Fonts')/file))
WHO='https://pmnch.who.int/docs/librariesprovider9/meeting-reports/mm-report-update.pdf?download=true&sfvrsn=e5d4e25e_1'
MOHFW='https://nhm.gov.in/index1.php?lang=1&level=2&lid=218&sublinkid=822'
MVP='https://carelink-hospital-portal-sj.jamdhadesiddharth69.chatgpt.site/'
GITHUB='https://github.com/Siddharth-Jamdhade/CareLink'
BLUE='#275B9D';TEAL='#467885'
slides=json.loads((D/'content.json').read_text(encoding='utf-8'))
def words(markup):
 result=[];current=[];bold=False
 for part in re.split(r'(</?b>)',markup):
  if part=='<b>':bold=True;continue
  if part=='</b>':bold=False;continue
  for token in re.findall(r'\s+|[^\s]+',part):
   if token.isspace():
    if current:result.append(current);current=[]
   else:current.append({'text':token,'bold':bold})
 if current:result.append(current)
 for word in result:
  if any(c.isdigit() for c in ''.join(r['text'] for r in word)):
   for r in word:r['bold']=True
 return result
def width(word,size):return sum(pdfmetrics.stringWidth(r['text'],'ArialBold' if r['bold'] else 'Arial',size) for r in word)
def lines_for(text,available,size):
 lines=[];line=[];used=0;space=pdfmetrics.stringWidth(' ','Arial',size)
 for word in words(text):
  tw=width(word,size)
  if line and used+space+tw>available:lines.append(line);line=[];used=0
  if tw>available:raise ValueError('Unbreakable word exceeds section: '+str(word))
  if line:used+=space
  line.append(word);used+=tw
 if line:lines.append(line)
 return lines
all_layout=[]
for page in slides:
 layout=copy.deepcopy(page);layout['rows']=[]
 for sec in layout['sections']:
  for size in [10,9.75,9.5,9.25,9]:
   rows=[];baseline=sec['firstBaseline']
   for index,item in enumerate(sec['items']):
    sub=item['kind']=='subhead'
    if sub and index:baseline+=3
    markup='<b>'+item['text']+'</b>' if sub else item['text']
    available=sec['width']-(0 if sub else 12)
    lines=lines_for(markup,available,size)
    for line_index,line in enumerate(lines):
     fragments=[]
     for wi,word in enumerate(line):
      if wi:fragments.append({'text':' ','bold':False})
      fragments.extend(copy.deepcopy(word))
     link=None
     if sec['key']=='links':
      if index==0:link=MVP
      elif index==1:link=GITHUB
      elif index==4:link=WHO
     if link:
      for frag in fragments:frag['link']=link;frag['color']=TEAL
     rows.append({'x':sec['x']+(0 if sub else 12),'baseline':baseline,'width':available,'size':size,'fragments':fragments,'bullet':not sub and line_index==0,'bulletX':sec['x']+1,'key':sec['key'],'itemIndex':index})
     baseline+=size*1.2
    baseline+=1.5 if sub else 1
   if max(r['baseline'] for r in rows)<=sec['lastBaseline']:
    sec['bodyFont']=size;layout['rows'].extend(rows);break
  else:raise ValueError('Section does not fit at 9pt: '+sec['key'])
  print('LAYOUT',sec['key'],size,len(rows),round(max(r['baseline'] for r in rows),2))
 source=json.loads((D/f'template-{len(all_layout)+1}.json').read_text())
 layout['borders']=[{'x':r['x0'],'top':r['top'],'width':r['width'],'height':r['height'],'lineWidth':r['linewidth']} for r in source['rects'] if r.get('stroke') and isinstance(r.get('stroking_color'),list) and len(r['stroking_color'])==3 and abs(r['stroking_color'][0]-.08235294)<.001]
 all_layout.append(layout)
(D/'layout.json').write_text(json.dumps(all_layout,indent=2,ensure_ascii=False),encoding='utf-8')
buf=io.BytesIO();c=canvas.Canvas(buf,pagesize=(960,540));c.setTitle('CareLink | WildFire | O2S22M')
def rgb(h):return tuple(int(h[k:k+2],16)/255 for k in (1,3,5))
def draw_fragments(x,baseline,size,fragments):
 for f in fragments:
  c.setFont('ArialBold' if f['bold'] else 'Arial',size);c.setFillColorRGB(*rgb(f.get('color','#000000')));c.drawString(x,540-baseline,f['text']);tw=pdfmetrics.stringWidth(f['text'],'ArialBold' if f['bold'] else 'Arial',size)
  if f.get('link'):c.linkURL(f['link'],(x,540-baseline-2,x+tw,540-baseline+size),relative=0,thickness=0)
  x+=tw
 return x
for index,page in enumerate(all_layout):
 if index==1:
  c.setFillColorRGB(1,1,1);c.rect(474.29,540-466,419.5,80,fill=1,stroke=0)
 c.setFont('CalibriBold',26);c.setFillColorRGB(*rgb(BLUE));x=page['titleX'];y=page['titleBaseline'];c.drawString(x,y,'WildFire | ');x+=pdfmetrics.stringWidth('WildFire | ','CalibriBold',26);c.setFillColorRGB(0,0,0);c.drawString(x,y,'CareLink')
 c.setFont('ArialBold',9);c.setFillColorRGB(.35,.4,.45);c.drawString(page['titleX'],page['codeBaseline'],'Team code: O2S22M')
 for sec in page['sections']:c.setFont('ArialBold',14);c.setFillColorRGB(*rgb(BLUE));c.drawString(sec['x'],sec['headerBaseline'],sec['title'])
 for row in page['rows']:
  if row['bullet']:c.setFont('Arial',row['size']);c.setFillColorRGB(0,0,0);c.drawString(row['bulletX'],540-row['baseline'],'•')
  draw_fragments(row['x'],row['baseline'],row['size'],row['fragments'])
 if index==0:
  foot='WHO MMEIG 2025 (2023 estimates); MoHFW ANC standards.';frags=[]
  for wi,word in enumerate(words(foot)):
   if wi:frags.append({'text':' ','bold':False})
   frags.extend(word)
  for frag in frags:frag['color']='#5D6A79';frag['link']=MOHFW if 'MoHFW' in frag['text'] or frag['text'] in ['ANC','standards.'] else WHO
  draw_fragments(38.66,505,7.5,frags)
 c.showPage()
c.save();buf.seek(0)
reader=PdfReader(TEMPLATE);writer=PdfWriter();writer.clone_document_from_reader(reader);overlay=PdfReader(buf)
assert not reader.get_fields(),'Template has interactive fields; preserve form workflow required'
for i,page in enumerate(writer.pages):
 stream=ContentStream(page.get_contents(),writer);operations=[];inside=False
 for operands,operator in stream.operations:
  if operator==b'BT':inside=True;continue
  if operator==b'ET':inside=False;continue
  if not inside:operations.append((operands,operator))
 stream.operations=operations;page.replace_contents(stream);page.pop('/Annots',None);page.merge_page(overlay.pages[i])
writer.add_metadata({'/Title':'CareLink - WildFire - O2S22M - Two-Slide Summary','/Author':'Team WildFire','/Subject':'Maternal health NFC and AI prototype summary'})
with open(OUT/'CareLink_WildFire_Two_Slide_Summary.pdf','wb') as out:writer.write(out)
# Exact copy for each template section, with all numeric tokens emphasized.
md=[]
for page_number,page in enumerate(slides,1):
 md.extend([f'# Slide {page_number} - WildFire | CareLink','',f'- Team code: **O2S22M**',''])
 for sec in page['sections']:
  md.extend(['## '+sec['title'],''])
  for item in sec['items']:
   parts=[]
   for word in words(item['text']):
    for frag in word:parts.append(('**'+frag['text']+'**') if frag['bold'] else frag['text'])
    parts.append(' ')
   value=''.join(parts).strip().replace('****','')
   md.append(('- ' if item['kind']=='bullet' else '### ')+value)
  md.append('')
md.extend(['## Evidence sources','',f'- [WHO MMEIG 2025 report]({WHO})',f'- [MoHFW / NHM maternal-health guidance]({MOHFW})','- Prototype results and team credentials: user-provided.'])
(OUT/'CareLink_Exact_Section_Copy.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print('PDF and exact section copy created')
