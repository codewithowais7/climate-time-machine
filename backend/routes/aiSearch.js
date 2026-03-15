/**
 * routes/aiSearch.js — Gemini AI Natural Language Search Proxy
 *
 * POST /api/ai-search
 * Body: { query: "Show climate for Jaipur in 2040" }
 *
 * Returns: { location, year, metric, answer }
 *
 * Auto-discovers the best available Gemini flash model for the given API key.
 * No SDK — zero extra dependencies.
 */

const express = require('express')
const router = express.Router()

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// Priority list — we try these in order and use the first one that exists
const MODEL_CANDIDATES = [
  "gemini-1.5-flash"
]

// Cache the resolved model name so we only discover once
let resolvedModel = null

async function getModel() {
  if (resolvedModel) return resolvedModel

  try {
    const res = await fetch(`${GEMINI_BASE}/models?key=${GEMINI_API_KEY}`)
    const data = await res.json()
    const available = new Set((data.models || []).map(m => m.name))

    for (const candidate of MODEL_CANDIDATES) {
      const full = `models/${candidate}`
      if (available.has(full)) {
        resolvedModel = candidate
        console.log(`[aiSearch] Using Gemini model: ${candidate}`)
        return candidate
      }
    }

    // Last resort: any flash model from the list
    const anyFlash = [...available].find(n => n.includes('flash'))
    if (anyFlash) {
      resolvedModel = anyFlash.replace('models/', '')
      console.log(`[aiSearch] Fallback Gemini model: ${resolvedModel}`)
      return resolvedModel
    }

    console.error('[aiSearch] No compatible Gemini model found for this API key')
    return null
  } catch (err) {
    console.error('[aiSearch] Model discovery failed:', err.message)
    return null
  }
}

// ─── Prompt template ─────────────────────────────────────────────────────────
function buildPrompt(query) {
  return `You are the AI engine powering a climate analytics dashboard called Climate Time Machine.

Your job is to interpret the user's natural language climate query and return STRICT VALID JSON ONLY so the frontend dashboard can parse it safely.

The dashboard contains:
* Interactive map
* Climate graphs
* AI explanation panel

Your response will control the dashboard behavior.

---

You must extract the following fields from the user query:

intent
city
year
risk_level
summary

---

Allowed intent values:

city_climate_data
future_risk_prediction
temperature_trend
rainfall_trend
general_climate_question

---

Rules:

1. ALWAYS return valid JSON.
2. NEVER include markdown, code blocks, explanations, or text outside JSON.
3. If information is missing, return null.
4. Keep summary short (1–2 sentences).
5. Risk levels must be one of:
   low
   moderate
   high
   severe
6. If the user asks about the future (year like 2030, 2050, 2100), set intent to "future_risk_prediction".
7. If a city is mentioned, always extract it exactly so the map can update.
8. If the query is unclear, still return JSON with intent "general_climate_question".
9. NEVER return empty output.

---

Return JSON using this exact schema:

{
"intent": "",
"city": "",
"year": null,
"risk_level": null,
"summary": ""
}

---

Examples:

User Query: Show climate data of Delhi

{
"intent": "city_climate_data",
"city": "Delhi",
"year": null,
"risk_level": null,
"summary": "Delhi has hot summers, monsoon rainfall, and mild winters with increasing heatwave frequency."
}

User Query: Climate risk of Mumbai in 2050

{
"intent": "future_risk_prediction",
"city": "Mumbai",
"year": 2050,
"risk_level": "high",
"summary": "Mumbai may face increased flooding and extreme rainfall by 2050 due to sea level rise and stronger monsoon events."
}

User Query: Rainfall trend in Chennai

{
"intent": "rainfall_trend",
"city": "Chennai",
"year": null,
"risk_level": null,
"summary": "Rainfall in Chennai has become more variable with more extreme monsoon rainfall events."
}

---

If the user query is missing or unclear, return:

{
"intent": "general_climate_question",
"city": null,
"year": null,
"risk_level": null,
"summary": "Please provide a city or climate-related question."
}

---

Now analyze the following user query and return JSON only.

User Query: ${query}`
}

// ─── POST /api/ai-search ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { query } = req.body

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.status(400).json({ error: 'Query is required.' })
  }

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return res.status(503).json({
      error: 'Gemini API key not configured. Add GEMINI_API_KEY to backend/.env',
    })
  }

  try {
    const model = await getModel()
    if (!model) {
      return res.status(503).json({ error: 'No compatible Gemini model found for your API key.' })
    }

    const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${GEMINI_API_KEY}`
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(query.trim()) }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
          responseMimeType: 'application/json',   // ← forces pure JSON, no markdown wrapping
        },
      }),
    })


    if (!geminiRes.ok) {
      const errBody = await geminiRes.text()
      console.error('[aiSearch] Gemini error:', geminiRes.status, errBody.slice(0, 300))
      // If 404, reset model cache so next request re-discovers
      if (geminiRes.status === 404) resolvedModel = null

      let errMsg = 'Gemini API request failed.'
      if (geminiRes.status === 429) {
        errMsg = 'Rate limit exceeded (15 requests/min limit for free tier). Please wait a minute and try again.'
      }
      return res.status(502).json({ error: errMsg, detail: errBody })
    }

    const geminiJson = await geminiRes.json()
    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // ── Robust JSON extraction ────────────────────────────────────────────────
    // Gemini 2.5-flash returns: ```json\n{...}\n```
    // We must strip the fences AND their surrounding whitespace before parsing.

    let stripped = rawText
      .replace(/^\s*```json\s*/i, '')   // remove opening fence + lang tag + whitespace
      .replace(/\s*```\s*$/, '')     // remove closing fence + whitespace
      .trim()

    // Safety net: if there's still non-JSON preamble, slice from first { to last }
    const firstBrace = stripped.indexOf('{')
    const lastBrace = stripped.lastIndexOf('}')
    if (firstBrace > 0 && lastBrace > firstBrace) {
      stripped = stripped.slice(firstBrace, lastBrace + 1)
    }

    let parsed
    try {
      parsed = JSON.parse(stripped)
    } catch (parseErr) {
      console.error('[aiSearch] JSON parse failed. Raw:', rawText)
      return res.status(502).json({
        error: 'Could not parse Gemini response — try rephrasing your question.',
      })
    }


    const intent = typeof parsed.intent === 'string' ? parsed.intent.trim() : null
    const city = typeof parsed.city === 'string' ? parsed.city.trim() : null

    let year = parseInt(parsed.year, 10)
    if (isNaN(year) || year < 1990 || year > 2050) year = null

    const riskLevel = typeof parsed.risk_level === 'string' ? parsed.risk_level.trim() : null
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : null

    return res.json({ intent, city, year, risk_level: riskLevel, summary })
  } catch (err) {
    console.error('[aiSearch] Unexpected error:', err.message)
    return res.status(500).json({ error: 'Internal server error during AI search.' })
  }
})

module.exports = router
