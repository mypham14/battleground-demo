const OpenAI = require('openai');
const { z } = require('zod/v4');
const { SYSTEM_PROMPT } = require('./judge-prompt');

// DeepSeek speaks the OpenAI chat-completions protocol.
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const MODEL = 'deepseek-flash';
const MAX_ATTEMPTS = 2;

const MAX_FIGHTER_LENGTH = 80;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// ponytail: in-memory Map resets on cold start, fine for a demo; swap for a
// shared store (Upstash/Redis) if this ever needs to survive across instances.
const requestLog = new Map();

function isAllowed(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    requestLog.set(ip, recent);
    return false;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  return true;
}

const VerdictSchema = z.object({
  winner: z.enum(['A', 'B']),
  explanation: z.string().min(1),
});

// DeepSeek only offers json_object mode (no json_schema), so the prompt carries
// the shape and zod is the enforcement. Blank or invalid output gets one retry.
const FORMAT_INSTRUCTIONS = `

Respond with a single json object and nothing else, in exactly this shape:
{"winner": "A", "explanation": "Two to four playful but logical sentences."}
"winner" is "A" or "B". "explanation" is a string.`;

async function getVerdict(fighterA, fighterB) {
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const completion = await deepseek.chat.completions.create({
        model: MODEL,
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + FORMAT_INSTRUCTIONS },
          { role: 'user', content: `Fighter A: ${fighterA}
Fighter B: ${fighterB}

Who wins?` },
        ],
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) throw new Error('empty verdict');
      return VerdictSchema.parse(JSON.parse(content));
    } catch (error) {
      lastError = error;
      if (error.status) break;
    }
  }
  throw lastError;
}

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const ip = (request.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  if (!isAllowed(ip)) {
    response.status(429).json({ error: 'rate_limited', message: "Whoa, slow down champ — catch your breath and try again in a bit." });
    return;
  }

  const { fighterA, fighterB } = request.body || {};
  if (
    typeof fighterA !== 'string' ||
    typeof fighterB !== 'string' ||
    !fighterA.trim() ||
    !fighterB.trim() ||
    fighterA.length > MAX_FIGHTER_LENGTH ||
    fighterB.length > MAX_FIGHTER_LENGTH
  ) {
    response.status(400).json({ error: 'invalid_input', message: 'Give both fighters a name (80 characters or less).' });
    return;
  }

  try {
    const verdict = await getVerdict(fighterA.trim(), fighterB.trim());
    response.status(200).json({ verdict });
  } catch (error) {
    console.error('verdict failed:', error.status ?? '', error.message);
    response.status(502).json({ error: 'verdict_failed', message: "The judges couldn't reach a decision. Try again?" });
  }
};
