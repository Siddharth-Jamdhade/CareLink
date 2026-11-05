// CareLink Mobile - weekInfo.js - enhanced 2026-11-05
// Sources: NHS Better Starts (nhs.uk), WHO pregnancy guidance.

const DATA = {
  12: {
    title: 'Small beginnings',
    body: 'By week 12, all major organs and muscles are in place and the skeleton is beginning to harden into bone. Fingers and toes are fully separated and the face has taken a recognisably human shape.',
    size: 'about the size of a plum',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/1st-trimester/week-12/',
  },
  13: {
    title: 'Organs settling in',
    body: 'Week 13 marks the end of the first trimester; the risk of miscarriage falls significantly. The intestines, which were briefly in the umbilical cord, now move into the abdomen.',
    size: 'about the size of a lemon',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/1st-trimester/week-13/',
  },
  14: {
    title: 'Taking shape',
    body: 'At week 14 your baby can make facial expressions and the neck is longer, making the head more upright. The thyroid gland is producing its own hormones.',
    size: 'about the size of a nectarine',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-14/',
  },
  15: {
    title: 'Moving and growing',
    body: 'Week 15 brings rapid growth; eyebrows and hair are beginning to form. Your baby is making breathing movements even though there is no air in the womb.',
    size: 'about the size of an apple',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-15/',
  },
  16: {
    title: 'First flutters',
    body: 'Around week 16 some people begin to feel gentle fluttering movements for the first time. Your baby can hear sounds outside the womb and their eyes can detect light.',
    size: 'about the size of an avocado',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-16/',
  },
  17: {
    title: 'Growing fast',
    body: 'At week 17 fat begins to form under the skin, which will help regulate body temperature after birth. The skeleton continues hardening from soft cartilage into bone.',
    size: 'about the size of a pear',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-17/',
  },
  18: {
    title: 'Curious and active',
    body: 'Week 18 sees yawning, hiccupping, and the first real kicks beginning. The ears are now in their final position and the baby may respond to loud sounds.',
    size: 'about the size of a sweet potato',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-18/',
  },
  19: {
    title: 'Sensory world',
    body: 'By week 19 the senses — taste, smell, sight, touch, and hearing — are developing rapidly. A protective waxy coating called vernix caseosa begins covering the skin.',
    size: 'about the size of a mango',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-19/',
  },
  20: {
    title: 'Halfway there',
    body: 'Week 20 is the midpoint of pregnancy — your baby now measures roughly 25 cm head to toe. Vernix fully coats the skin and developmental milestones continue.',
    size: 'about the size of a banana',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-20/',
  },
  21: {
    title: 'Active days',
    body: 'At week 21 your baby swallows amniotic fluid to practise feeding. Movements are more coordinated, with kicks and stretches that you may feel more regularly.',
    size: 'about the size of a carrot',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-21/',
  },
  22: {
    title: 'Stronger every day',
    body: 'Week 22 brings rapid brain development; lips and eye-lids are fully formed. Nails have grown to the tips of the fingers.',
    size: 'about the size of a papaya',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-22/',
  },
  23: {
    title: 'Listening in',
    body: 'By week 23 your baby has developed a sense of balance and their inner ear is fully formed. The lungs are maturing, producing surfactant to help them breathe after birth.',
    size: 'about the size of a large mango',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-23/',
  },
  24: {
    title: 'Viable and vibrant',
    body: 'Week 24 is a significant milestone — with specialist care, babies born now have a chance of surviving outside the womb. The face is almost fully formed and the skin is still quite wrinkled.',
    size: 'about the size of an ear of corn',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-24/',
  },
  25: {
    title: 'Putting on weight',
    body: 'At week 25 fat deposits begin building up under the skin, filling out those tiny wrinkles. The nostrils begin to open in practice breathing movements.',
    size: 'about the size of a swede',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-25/',
  },
  26: {
    title: 'Eyes open',
    body: 'Week 26 is when the eyes open for the first time — they can sense light even through the womb wall. Brainwave activity is now detectable and sleep cycles emerge.',
    size: 'about the size of a lettuce',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-26/',
  },
  27: {
    title: 'Dreaming away',
    body: 'By week 27 your baby has established regular sleep-wake cycles and may dream during REM sleep. The lungs and immune system continue to mature rapidly.',
    size: 'about the size of a cauliflower',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/2nd-trimester/week-27/',
  },
  28: {
    title: 'Third trimester begins',
    body: 'Week 28 opens the third trimester — a time of rapid weight gain. Your baby can blink, has eyelashes, and responds to light and sound with more vigour.',
    size: 'about the size of an aubergine',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-28/',
  },
  29: {
    title: 'Bones hardening',
    body: 'At week 29 the skeleton is almost fully ossified and needs calcium and phosphorus from your diet. Kicks and stretches may now be visible from the outside.',
    size: 'about the size of a butternut squash',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-29/',
  },
  30: {
    title: 'Nearly a kilo',
    body: 'Week 30 sees your baby weigh close to 1.5 kg and measure around 40 cm. The brain is growing very quickly, developing grooves and ridges to increase its surface area.',
    size: 'about the size of a large cabbage',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-30/',
  },
  31: {
    title: 'Plumping up',
    body: 'By week 31 most major development is complete; the focus is now on growth. The lungs are maturing and your baby is practising breathing movements more frequently.',
    size: 'about the size of a coconut',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-31/',
  },
  32: {
    title: 'Head down',
    body: 'Around week 32 many babies begin to settle head-down ready for birth. Fingernails reach the fingertips and the skin is becoming smoother as fat fills in.',
    size: 'about the size of a jicama',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-32/',
  },
  33: {
    title: 'Bright and aware',
    body: 'At week 33 your baby\'s pupils dilate and contract in response to light. Bones are fully hardened except for the skull, which stays flexible to ease the journey through the birth canal.',
    size: 'about the size of a pineapple',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-33/',
  },
  34: {
    title: 'Almost ready',
    body: 'Week 34 sees the central nervous system and lungs nearly fully mature. Babies born now usually do well with specialist support and the vernix coating is still thick.',
    size: 'about the size of a cantaloupe melon',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-34/',
  },
  35: {
    title: 'Full-term approaching',
    body: 'At week 35 your baby may weigh around 2.4 kg. Space in the womb is becoming tighter and movements may feel different — but they should still be felt regularly.',
    size: 'about the size of a honeydew melon',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-35/',
  },
  36: {
    title: 'Nearly full term',
    body: 'Week 36 marks the final weeks before full term. Most bodily systems are fully developed. Vernix and lanugo (fine hair) begin to disappear as the skin matures.',
    size: 'about the size of a large papaya',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-36/',
  },
  37: {
    title: 'Full term',
    body: 'At week 37 your pregnancy is considered full term. Your baby\'s organs are fully ready for life outside the womb and head engagement in the pelvis may happen soon.',
    size: 'about the size of a Swiss chard bunch',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-37/',
  },
  38: {
    title: 'The final stretch',
    body: 'Week 38 sees most babies weighing around 3 kg. The lanugo has largely gone and the vernix may be thinning. Your baby is fully ready, just waiting for the right moment.',
    size: 'about the size of a leek',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-38/',
  },
  39: {
    title: 'Any day now',
    body: 'At week 39 the placenta continues to pass antibodies that will protect your baby after birth. The brain and nervous system are still developing and will continue to do so after birth.',
    size: 'about the size of a small pumpkin',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-39/',
  },
  40: {
    title: 'Your due week',
    body: 'Week 40 is your estimated due date window — only around 5% of babies arrive exactly on their EDD. Your care team will guide you on next steps if labour has not yet started.',
    size: 'about the size of a small watermelon',
    nhs_url: 'https://www.nhs.uk/best-start-in-life/pregnancy/week-by-week-guide-to-pregnancy/3rd-trimester/week-40/',
  },
};

/**
 * Returns week-by-week educational info for a given pregnancy week (12–40).
 * @param {number} week
 * @returns {{ title: string, body: string, size: string, nhs_url: string }}
 */
export function getWeekInfo(week) {
  const clamped = Math.max(12, Math.min(40, Math.round(week)));
  return DATA[clamped] ?? DATA[20];
}
