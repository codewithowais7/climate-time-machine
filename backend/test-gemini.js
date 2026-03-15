require('dotenv').config()
const fs = require('fs')

const KEY = process.env.GEMINI_API_KEY
const BASE = 'https://generativelanguage.googleapis.com/v1beta'

async function run() {
  // Step 1: Get all available flash models
  const listRes = await fetch(`${BASE}/models?key=${KEY}`)
  const listData = await listRes.json()
  const flashModels = (listData.models || [])
    .map(m => m.name)
    .filter(n => n.toLowerCase().includes('flash'))

  console.log('=== FLASH MODELS ===')
  flashModels.forEach(m => process.stdout.write(m + '\n'))

  if (flashModels.length === 0) { console.log('NO FLASH MODELS'); return }

  // Step 2: Try first model WITHOUT responseMimeType
  const model = flashModels[0]
  console.log('\n=== TESTING:', model)

  const res = await fetch(`${BASE}/${model}:generateContent?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Return ONLY valid JSON with no other text: {"location":"Jaipur","year":2040,"metric":"temperature","answer":"Jaipur test."}' }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
    })
  })

  const raw = await res.text()
  console.log('\nHTTP:', res.status)

  const j = JSON.parse(raw)
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  console.log('\nEXTRACTED TEXT (repr):')
  console.log(JSON.stringify(text))  // shows escape chars

  // Write full raw for inspection
  fs.writeFileSync('gemini-debug.json', raw)
  console.log('\nFull raw written to gemini-debug.json')
}

run().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
