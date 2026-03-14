/**
 * /api/oracle.js
 * Accepts a user's natal chart data + a question, calls OpenAI GPT-4o,
 * returns the Oracle's response.
 *
 * POST body:
 * {
 *   question: "What does today say about my career?",
 *   chart: { planets, houses, ascendant, mc, aspects },  // from /api/chart
 *   todayPlanets: [...],   // current transiting planet positions (calculated client-side)
 *   userName: "Emily"
 * }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { question, chart, todayPlanets, userName } = req.body;

    if (!question || !chart) {
      return res.status(400).json({ error: 'Missing question or chart data' });
    }

    // Build natal chart summary for the system prompt
    const planetLines = chart.planets
      .map(p => `${p.name}: ${p.sign} ${p.displayDeg} (House ${p.house})`)
      .join('\n');

    const houseLines = chart.houses
      .map(h => `House ${h.number} (${h.theme}): ${h.sign}`)
      .join('\n');

    const transitLines = (todayPlanets || [])
      .map(p => `${p.name}: ${p.sign} ${p.displayDeg}`)
      .join('\n');

    const systemPrompt = `You are a wise, warm, and insightful astrologer named the Oracle. You speak with depth and clarity — not mystical vagueness, but grounded, thoughtful astrological interpretation that actually helps the person understand what's happening in their life.

You have been given:
1. ${userName || 'This person'}'s complete natal chart
2. Today's transiting planetary positions
3. Their question

Your job is to answer their question by synthesising all of this astrological information. Be specific — name the relevant planets, aspects, and houses. Explain what they mean in plain language, with real astrological depth. Be warm and encouraging without being saccharine. Acknowledge difficulty honestly when it's there.

Format your response in clear paragraphs — no bullet points, no numbered lists. Keep responses between 150–300 words. End with one clear, actionable sentence.`;

    const userMessage = `NATAL CHART FOR ${(userName || 'USER').toUpperCase()}:
ASC: ${chart.ascendant.sign} ${chart.ascendant.displayDeg}
MC: ${chart.mc.sign} ${chart.mc.displayDeg}

PLANETS:
${planetLines}

HOUSES:
${houseLines}

TODAY'S TRANSITING PLANETS:
${transitLines || 'Not provided'}

MY QUESTION: ${question}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const text = data?.choices?.[0]?.message?.content || '';
    return res.status(200).json({ response: text });

  } catch (err) {
    console.error('Oracle error:', err);
    return res.status(500).json({ error: 'Oracle failed', detail: err.message });
  }
}
