from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/pdf/CareLink_Structured_Data.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial', boldItalic='Arial-Bold')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleX', fontName='Arial-Bold', fontSize=27, leading=32, textColor=colors.HexColor('#133849'), spaceAfter=13))
styles.add(ParagraphStyle(name='SubX', fontName='Arial', fontSize=11, leading=16, textColor=colors.HexColor('#526674'), spaceAfter=16))
styles.add(ParagraphStyle(name='HeadingX', fontName='Arial-Bold', fontSize=15, leading=20, textColor=colors.HexColor('#007D83'), spaceBefore=13, spaceAfter=9))
styles.add(ParagraphStyle(name='BodyX', fontName='Arial', fontSize=10, leading=14.5, spaceAfter=9, textColor=colors.HexColor('#233743')))
styles.add(ParagraphStyle(name='CellX', fontName='Arial', fontSize=9, leading=12.5, textColor=colors.HexColor('#233743')))
styles.add(ParagraphStyle(name='SmallX', fontName='Arial', fontSize=8.5, leading=12, textColor=colors.HexColor('#526674'), spaceAfter=9))
story=[]
def p(s, style='BodyX'):
    return Paragraph(s, styles[style])
def add(s, style='BodyX'):
    story.append(p(s,style))
def h(s): add(s,'HeadingX')
def table(headers, rows, widths):
    data=[[p('<b>'+escape(x)+'</b>','CellX') for x in headers]]
    data += [[p(escape(str(x)).replace('\n','<br/>'),'CellX') for x in row] for row in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#DAEFF0')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F3F7F8'),colors.white]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,0),0.7,colors.HexColor('#80B7BC'))]))
    story.append(t)
    story.append(Spacer(1,9))
def page(k,title,sub):
    if story: story.append(PageBreak())
    add('CARELINK  /  TECHNICAL CONCEPT  /  '+k,'SmallX')
    add(title,'TitleX'); add(sub,'SubX')

page('01','Three places data lives','A structured reference to the supplied CareLink offline architecture explanation.')
add('The proposed system combines an NFC wristband, a local hospital computer and a cloud server. Each layer carries a different amount of patient information and has different connectivity requirements.')
table(['Layer','Stored information','Access and role'],[
('1. Patient wristband','Encrypted patient ID; blood group; emergency summary; last two visits.','Carried by the patient. A compatible reader can read the on-band summary without internet or a local server.'),
('2. Local hospital PC','Full patient data held by that hospital: records, prescriptions, lab reports and document images.','Apps connect over local WiFi or wired LAN. Internet is not needed for local access while the PC and local network work.'),
('3. Cloud server','Backup of hospital data and records available for cross-hospital sharing.','Requires internet. The local PC synchronizes when connectivity is available.')],[104,196,199])
h('Why the hospital can work offline')
add('CareLink server software runs on one PC inside the hospital, such as the registration desk computer or a low-cost laptop. The source gives an illustrative laptop price of Rs. 15,000.')
table(['Hospital device','Connection','Destination'],[
("Nurse's phone / CareLink app",'Local WiFi or LAN','CareLink server on hospital PC'),
("Doctor's tablet / CareLink app",'Local WiFi or LAN','CareLink server on hospital PC'),
('Pharmacy phone / CareLink app','Local WiFi or LAN','CareLink server on hospital PC')],[204,130,165])
add('The source uses District Hospital Nagpur as the local-network example. A familiar comparison is a home printer: devices communicate on the same network even when internet access is unavailable.')
add('Scope: this document organizes the supplied concept. Hardware capacity, timing, prices and clinical examples are illustrative source details, not independently validated specifications or clinical guidance.','SmallX')

page('02','Offline patient journey','Illustrative timeline: internet is down at PHC Hingna.')
table(['Time','Event','Data location / outcome'],[
('9:00 AM','Internet is down and has been unavailable since yesterday.','The hospital continues using its local network and CareLink PC.'),
('9:05 AM','Priya arrives; a nurse taps her wristband.','The band ID is sent to the PHC Hingna local PC. Her full record opens from that local database.'),
('9:10 AM','The doctor examines Priya and writes a prescription.','The visit is handled through the local CareLink system.'),
('9:12 AM','The pharmacy scans the prescription.','Prescription data is saved on the local PC.'),
('9:13 AM','The pharmacy taps Priya\'s wristband.','An updated mini-summary, including emergency information and the last two visits, is written to the band.'),
('6:00 PM','Internet connectivity returns.','Cloud connectivity becomes available again.'),
('6:01 PM','The local PC synchronizes the day\'s data.','The source describes synchronization as automatic, without staff intervention.')],[67,215,217])
h('At a different hospital')
table(['Situation','Lookup process','Available information'],[
('Both hospitals online','Priya travels from PHC Hingna to GMC Nagpur Emergency. A band tap supplies her ID; GMC\'s PC requests patient CL-4821 from the cloud.','The cloud returns records from PHC Hingna. Internet is needed for this retrieval; the source gives an illustrative 2-second fetch.'),
('GMC internet offline','The doctor taps the band but cannot reach the cloud. A compatible NFC reader reads the stored summary directly.','The emergency summary on the band remains available without internet or the hospital server. See the example on page 3.')],[112,210,177])
add('Local access depends on the requested record already being present in that hospital\'s database. The band carries a limited summary; it does not carry the complete cross-hospital record.','SmallX')

page('03','The wristband data','Proposed NFC payload and the illustrative emergency record from the source.')
add('The source describes the NFC chip as having 8 kilobytes of storage, comparable to a tiny USB stick. The intended payload is compact text and identifiers.')
table(['Included on the band','Purpose / detail'],[
('Encrypted patient ID','Links to the full record on a server.'),
('Blood group and Rh factor','Compact emergency information.'),
('Severe allergies','Known severe allergy information.'),
('High-risk flags','Examples: pre-eclampsia and anaemia.'),
('Current medicines','Medicine names and doses.'),
('Last two visit summaries','Recent clinical context.'),
('Gestational age','Updated at each visit.'),
('Emergency contact','Contact telephone number.')],[185,314])
add('<b>Stored on the local server or cloud:</b> full documents, X-rays, ultrasound images and detailed doctor notes are excluded from the band.')
h('Illustrative on-band emergency record')
table(['Field','Example value'],[
('Patient','Priya Deshmukh, 26 years'),
('Gestational age','28 weeks, as of 16-Oct'),
('Blood group','B+'),
('High-risk flag','Pre-eclampsia watch'),
('BP trend','120 to 124 to 130 (rising; units not specified in source)'),
('Current medication','Labetalol 100 mg BD'),
('Last haemoglobin (Hb)','9.8 g/dL (15-Sep)'),
('Urine protein','1+ (16-Oct)'),
('Allergies','None known'),
('Emergency contact','98XXXXXXXX')],[185,314])
add('The source presents this summary as information available to help the doctor begin an emergency assessment. Values are an example, not a prescription or treatment recommendation.','SmallX')

page('04','Availability at a glance','What remains accessible in each of the source\'s three operating conditions.')
table(['Operating condition','Available layers','What the doctor sees'],[
('Internet ON\nLocal server ON','Local PC + band + cloud','Full records, images and history available locally or through connected cloud records.'),
('Internet OFF\nLocal server ON','Local PC + band','Full records from that hospital\'s local database, plus the on-band summary. The source calls this the most common failure case.'),
('Internet OFF\nLocal server OFF','Band only','Emergency summary: blood group, medicines, risk flags and the last two visits, subject to what was last written to the band.')],[153,126,220])
h('The passbook explanation')
add('<b>"Socho ek bank passbook ki tarah."</b> Think of it like a bank passbook.')
table(['CareLink layer','Passbook analogy'],[
('Wristband','The passbook carries the last few transactions and can be read without internet.'),
('Local hospital PC','The branch computer holds the detailed account and can serve devices on its local network.'),
('Cloud','The bank\'s main server makes information available across branches when connected.')],[153,346])
add('If internet is down, the local hospital PC can still provide locally stored records. If the local PC is also down, the band can still provide the summary stored on its chip.')
h('The source\'s core message')
add('"Teen layer ka system hai. Teen mein se koi bhi ek kaam kare - doctor ko zaroori information milti hai. Internet jaaye, server jaaye - band haath pe hai toh kaam chalega."')
add('Meaning: the design aims to retain access to essential information through multiple layers. The source describes this as "three layers, three backups" and says the system never fully fails. In practice, access depends on the relevant device, power, network, reader and stored information being available.','SmallX')
add('The source also uses an ATM / branch-computer comparison to explain local communication. These banking comparisons illustrate the proposed CareLink design; they are not specifications for how banking systems operate.','SmallX')

def footer(canvas, doc):
    canvas.saveState()
    w,h=A4
    canvas.setStrokeColor(colors.HexColor('#BFD6DC')); canvas.line(48,44,w-48,44)
    canvas.setFont('Arial',8); canvas.setFillColor(colors.HexColor('#526674'))
    canvas.drawString(48,30,'CareLink | Structured technical reference')
    canvas.drawRightString(w-48,30,str(doc.page))
    canvas.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=43,bottomMargin=59,title='CareLink - Structured Data and Offline Architecture',author='CareLink concept reference')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)

