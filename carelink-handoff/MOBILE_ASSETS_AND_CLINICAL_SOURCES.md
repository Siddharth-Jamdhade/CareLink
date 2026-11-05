# Mobile assets and educational sources

Reviewed against the linked pages on 2 November 2026. This is an engineering source record, not clinical approval.

## Assets and licensing

| Asset | Origin / licence | Notes |
| --- | --- | --- |
| Procedural fetal model, cord and lighting | Original source in `frontend/carelink-app/src/mobile/BabyScene.jsx`; repository MIT licence | No external model, photo, texture, scan or patient image. Rounded mesh primitives; staged proportions, not clinical measurements. |
| Womb-inspired backdrop | Original CSS gradients in `src/mobile/mobile.css`; repository MIT licence | Illustrative background, not anatomical imaging. |
| Android CareLink heart/cross mark | Original Android vector in `android/app/src/main/res/drawable/carelink_mark.xml`; repository MIT licence | Native vector icon and launch-screen mark. |
| Rendering and orbit controls | Three.js, MIT; see installed `node_modules/three/LICENSE` | Library is loaded lazily. |
| Interface icons | Feather via react-icons, MIT; see installed package notices | Text labels accompany navigation icons. |
| Native container | Capacitor, MIT; see package licences | Generated Android project plus original HTTPS server-setup screen. |
| Reference screenshots | User-provided visual references only | Their fetus imagery was not copied, redistributed or represented as licensed 3D geometry. |

Geometry/materials are disposed when the view unmounts. No third-party asset network requests are needed for the model. Approximate head/body/limb proportions change over weeks 12–40; neither the geometry nor the motion is patient-specific. Earlier pregnancy has no validated model, and the current stylised stage family requires review before use as anatomical education.

## Educational content

| Topic | Authoritative source | Use / review required |
| --- | --- | --- |
| First perceived movements, individual variation, changed/reduced/absent movement, no movement by 24 weeks | [NHS: Your baby's movements](https://www.nhs.uk/pregnancy/keeping-well/your-babys-movements/) | Paraphrased to state commonly 16–24 weeks and prompt contact with the maternity team. Never interpreted from the model or a diary. Local service wording/clinical escalation requires review. |
| Stage around 12 weeks | [NHS Best Start in Life: week 12](https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/1st-trimester/week-12/) | General development of organs/muscles and skeleton. No patient size or growth measurement is displayed. |
| Stage around 20 weeks | [NHS Best Start in Life: week 20](https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-20/) | General description of the protective vernix coating. |
| Later pregnancy | [NHS Best Start in Life: week 32](https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-32/) | Continued growth/weight gain and continued movements through pregnancy. No personalised growth, position or health claim. |
| EDD calculation | Explicit user-requested calendar rule | Nine calendar months, destination-day clamp, then seven days. Requires local clinician approval; not silently replaced with a 280-day calculation. Clinician dating remains distinct. |
| Documentation-gap checklist | Existing `backend/app/data/anc_protocol.json` | Inherited administrative checklist. Must be clinically reviewed against current local protocols; a missing document is not a diagnosis or proof of missing care. |

| Week-by-week developmental guidance (weeks 12–40) | [NHS: Week-by-week guide to pregnancy](https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/) | Standard developmental milestones and size comparisons from weeks 12 to 40 in `weekInfo.js`. General educational descriptions; no individualized clinical predictions or health evaluations. |
| Movement observation diary | Patient self-reported note-taking in `MovementDiary.jsx` | Strictly local note-taking (localStorage only; never transmitted to server). Form and list prominently display safety disclaimer: "These are your personal observations. Do not use this diary to assess your baby's health. Contact your maternity care team immediately if movements are reduced, absent, or have changed." Not available before week 16. |

All educational copy, anatomical representation and translations require qualified Indian maternal-care clinical review. The app explicitly labels the model as an educational illustration, not a scan or live view. There is no diagnostic AI, heartbeat simulation, or fetal wellbeing score. The movement diary functions strictly as patient-reported personal observations with prominent clinical safety warnings. The existing extraction system remains restricted to documented administrative facts and source transcription.
