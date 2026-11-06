/**
 * ADWA Bingo â€” Professional Audio Generator
 * Uses Azure Cognitive Services with am-ET-AmehaNeural (genuine male neural voice)
 *
 * SETUP:
 *   1. Get a FREE Azure account at https://azure.microsoft.com/free
 *   2. Create a "Speech" resource (Free tier = 500,000 chars/month)
 *   3. Copy your KEY and REGION below
 *   4. Run: node scripts/generate-bingo-audio.js
 *
 * OUTPUT: miniapp/public/audio/bingo/B01.mp3 ... O75.mp3 + special sounds
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// â”€â”€â”€ CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AZURE_KEY    = process.env.AZURE_SPEECH_KEY    || 'YOUR_AZURE_KEY_HERE';
const AZURE_REGION = process.env.AZURE_SPEECH_REGION || 'eastus';
const VOICE        = 'am-ET-AmehaNeural'; // Genuine deep male Amharic neural voice
const OUT_DIR      = path.join(__dirname, '../miniapp/public/audio/bingo');
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

fs.mkdirSync(OUT_DIR, { recursive: true });

// Full Amharic number words
const AMHARIC = {
  1:'áŠ áŠ•á‹µ', 2:'áˆáˆˆá‰µ', 3:'áˆ¶áˆµá‰µ', 4:'áŠ áˆ«á‰µ', 5:'áŠ áˆáˆµá‰µ',
  6:'áˆµá‹µáˆµá‰µ', 7:'áˆ°á‰£á‰µ', 8:'áˆµáˆáŠ•á‰µ', 9:'á‹˜áŒ áŠ', 10:'áŠ áˆµáˆ­',
  11:'áŠ áˆµáˆ« áŠ áŠ•á‹µ', 12:'áŠ áˆµáˆ« áˆáˆˆá‰µ', 13:'áŠ áˆµáˆ« áˆ¶áˆµá‰µ', 14:'áŠ áˆµáˆ« áŠ áˆ«á‰µ', 15:'áŠ áˆµáˆ« áŠ áˆáˆµá‰µ',
  16:'áŠ áˆµáˆ« áˆµá‹µáˆµá‰µ', 17:'áŠ áˆµáˆ« áˆ°á‰£á‰µ', 18:'áŠ áˆµáˆ« áˆµáˆáŠ•á‰µ', 19:'áŠ áˆµáˆ« á‹˜áŒ áŠ', 20:'áˆƒá‹«',
  21:'áˆƒá‹« áŠ áŠ•á‹µ', 22:'áˆƒá‹« áˆáˆˆá‰µ', 23:'áˆƒá‹« áˆ¶áˆµá‰µ', 24:'áˆƒá‹« áŠ áˆ«á‰µ', 25:'áˆƒá‹« áŠ áˆáˆµá‰µ',
  26:'áˆƒá‹« áˆµá‹µáˆµá‰µ', 27:'áˆƒá‹« áˆ°á‰£á‰µ', 28:'áˆƒá‹« áˆµáˆáŠ•á‰µ', 29:'áˆƒá‹« á‹˜áŒ áŠ', 30:'áˆ áˆ‹áˆ³',
  31:'áˆ áˆ‹áˆ³ áŠ áŠ•á‹µ', 32:'áˆ áˆ‹áˆ³ áˆáˆˆá‰µ', 33:'áˆ áˆ‹áˆ³ áˆ¶áˆµá‰µ', 34:'áˆ áˆ‹áˆ³ áŠ áˆ«á‰µ', 35:'áˆ áˆ‹áˆ³ áŠ áˆáˆµá‰µ',
  36:'áˆ áˆ‹áˆ³ áˆµá‹µáˆµá‰µ', 37:'áˆ áˆ‹áˆ³ áˆ°á‰£á‰µ', 38:'áˆ áˆ‹áˆ³ áˆµáˆáŠ•á‰µ', 39:'áˆ áˆ‹áˆ³ á‹˜áŒ áŠ', 40:'áŠ áˆ­á‰£',
  41:'áŠ áˆ­á‰£ áŠ áŠ•á‹µ', 42:'áŠ áˆ­á‰£ áˆáˆˆá‰µ', 43:'áŠ áˆ­á‰£ áˆ¶áˆµá‰µ', 44:'áŠ áˆ­á‰£ áŠ áˆ«á‰µ', 45:'áŠ áˆ­á‰£ áŠ áˆáˆµá‰µ',
  46:'áŠ áˆ­á‰£ áˆµá‹µáˆµá‰µ', 47:'áŠ áˆ­á‰£ áˆ°á‰£á‰µ', 48:'áŠ áˆ­á‰£ áˆµáˆáŠ•á‰µ', 49:'áŠ áˆ­á‰£ á‹˜áŒ áŠ', 50:'áˆƒáˆáˆ³',
  51:'áˆƒáˆáˆ³ áŠ áŠ•á‹µ', 52:'áˆƒáˆáˆ³ áˆáˆˆá‰µ', 53:'áˆƒáˆáˆ³ áˆ¶áˆµá‰µ', 54:'áˆƒáˆáˆ³ áŠ áˆ«á‰µ', 55:'áˆƒáˆáˆ³ áŠ áˆáˆµá‰µ',
  56:'áˆƒáˆáˆ³ áˆµá‹µáˆµá‰µ', 57:'áˆƒáˆáˆ³ áˆ°á‰£á‰µ', 58:'áˆƒáˆáˆ³ áˆµáˆáŠ•á‰µ', 59:'áˆƒáˆáˆ³ á‹˜áŒ áŠ', 60:'áˆµáˆáˆ³',
  61:'áˆµáˆáˆ³ áŠ áŠ•á‹µ', 62:'áˆµáˆáˆ³ áˆáˆˆá‰µ', 63:'áˆµáˆáˆ³ áˆ¶áˆµá‰µ', 64:'áˆµáˆáˆ³ áŠ áˆ«á‰µ', 65:'áˆµáˆáˆ³ áŠ áˆáˆµá‰µ',
  66:'áˆµáˆáˆ³ áˆµá‹µáˆµá‰µ', 67:'áˆµáˆáˆ³ áˆ°á‰£á‰µ', 68:'áˆµáˆáˆ³ áˆµáˆáŠ•á‰µ', 69:'áˆµáˆáˆ³ á‹˜áŒ áŠ', 70:'áˆ°á‰£',
  71:'áˆ°á‰£ áŠ áŠ•á‹µ', 72:'áˆ°á‰£ áˆáˆˆá‰µ', 73:'áˆ°á‰£ áˆ¶áˆµá‰µ', 74:'áˆ°á‰£ áŠ áˆ«á‰µ', 75:'áˆ°á‰£ áŠ áˆáˆµá‰µ',
};

const RANGES = { B:[1,15], I:[16,30], N:[31,45], G:[46,60], O:[61,75] };

function getLetter(num) {
  for (const [l, [lo, hi]] of Object.entries(RANGES)) {
    if (num >= lo && num <= hi) return l;
  }
  return 'B';
}

// SSML for a bingo call â€” English letter + dramatic pause + Amharic number
function callSSML(letter, num) {
  const amNum = AMHARIC[num];
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="am-ET">
  <voice name="${VOICE}">
    <prosody rate="0.9" pitch="0%">
      <lang xml:lang="en-US">${letter}!</lang>
      <break time="400ms"/>
      ${amNum}!
    </prosody>
  </voice>
</speak>`;
}

// SSML for special sounds
const SPECIAL_SSML = {
  'bingo_win': `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="am-ET">
  <voice name="${VOICE}">
    <prosody rate="1.0" pitch="5%">
      á‰¢áŠ•áŒŽ! <break time="200ms"/> á‰¢áŠ•áŒŽ! <break time="200ms"/> áŠ¥áŠ•áŠ³áŠ• á‹°áˆµ áŠ áˆˆá‹Ž!
    </prosody>
  </voice>
</speak>`,
  'game_start': `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="am-ET">
  <voice name="${VOICE}">
    <prosody rate="0.9" pitch="0%">
      áŒ¨á‹‹á‰³ áŒ€áˆáˆ¯áˆ! <break time="300ms"/> á‰áŒ¥áˆ®á‰¹áŠ• á‰°á‹˜áŒ‹áŒ!
    </prosody>
  </voice>
</speak>`,
  'good_luck': `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="am-ET">
  <voice name="${VOICE}">
    <prosody rate="0.9" pitch="0%">
      áˆ˜áˆáŠ«áˆ á‹•á‹µáˆ!
    </prosody>
  </voice>
</speak>`,
};

function fetchAzureTTS(ssml) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(ssml, 'utf8');
    const req = https.request({
      hostname: `${AZURE_REGION}.tts.speech.microsoft.com`,
      path: '/cognitiveservices/v1',
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'ChoiceBingo',
        'Content-Length': body.length,
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        let err = '';
        res.on('data', d => err += d);
        res.on('end', () => reject(new Error(`Azure TTS error ${res.statusCode}: ${err}`)));
        return;
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function generate() {
  if (AZURE_KEY === 'YOUR_AZURE_KEY_HERE') {
    console.error('\nâŒ ERROR: Please set AZURE_SPEECH_KEY environment variable or edit this file.\n');
    console.log('Get your free Azure key at https://azure.microsoft.com/free');
    console.log('Then run: AZURE_SPEECH_KEY=your_key node scripts/generate-bingo-audio.js\n');
    process.exit(1);
  }

  console.log('ðŸŽ™ï¸  Generating professional Amharic bingo caller audio...\n');

  // Generate all 75 bingo call files
  for (const [letter, [lo, hi]] of Object.entries(RANGES)) {
    for (let num = lo; num <= hi; num++) {
      const fname = `${letter}${String(num).padStart(2,'0')}.mp3`;
      const outPath = path.join(OUT_DIR, fname);
      if (fs.existsSync(outPath)) {
        console.log(`  â­ï¸  Skip  ${fname} (already exists)`);
        continue;
      }
      try {
        const ssml = callSSML(letter, num);
        const buf = await fetchAzureTTS(ssml);
        fs.writeFileSync(outPath, buf);
        console.log(`  âœ…  ${fname}  "${letter}... ${AMHARIC[num]}"`);
      } catch(e) {
        console.error(`  âŒ  ${fname}  ERROR: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 120)); // Avoid rate limit
    }
  }

  // Generate special sounds
  for (const [name, ssml] of Object.entries(SPECIAL_SSML)) {
    const outPath = path.join(OUT_DIR, `${name}.mp3`);
    if (fs.existsSync(outPath)) {
      console.log(`  â­ï¸  Skip  ${name}.mp3 (already exists)`);
      continue;
    }
    try {
      const buf = await fetchAzureTTS(ssml);
      fs.writeFileSync(outPath, buf);
      console.log(`  âœ…  ${name}.mp3`);
    } catch(e) {
      console.error(`  âŒ  ${name}.mp3  ERROR: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log('\nðŸŽ‰ Done! All audio files saved to miniapp/public/audio/bingo/');
  console.log('Now run: git add . && git commit -m "add professional bingo audio" && git push origin main');
}

generate();
