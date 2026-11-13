const Anthropic = require('@anthropic-ai/sdk');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { z } = require('zod/v4');
const OpenAI = require('openai');
const { SYSTEM_PROMPT } = require('./judge-prompt');
const { artPrompt } = require('./art-style');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_FIGHTER_LENGTH = 50;
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

async function getVerdict(fighterA, fighterB) {
  const message = await anthropic.messages.parse({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `Fighter A: ${fighterA}\nFighter B: ${fighterB}\n\nWho wins?` },
    ],
    output_config: { format: zodOutputFormat(VerdictSchema) },
  });
  if (!message.parsed_output) throw new Error('verdict did not match schema');
  return message.parsed_output;
}

async function getImage(fighter) {
  const result = await openai.images.generate({
    model: 'gpt-image-2',
    prompt: artPrompt(fighter),
    size: '1024x1024',
    quality: 'low',
  });
  return `data:image/png;base64,${result.data[0].b64_json}`;
}

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'method_not_allowed', message: "Wrong entrance, challenger! Fights are booked through the main gate only." });
    return;
  }

  const ip = (request.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  if (!isAllowed(ip)) {
    response.status(429).json({ error: 'rate_limited', message: "Whoa there, champ! You're swinging faster than the ref can count. Take a breather and step back in the ring in a minute." });
    return;
  }

  const { fighterA, fighterB } = request.body || {};
  if (
    typeof fighterA !== 'string' ||
    typeof fighterB !== 'string' ||
    !fighterA.trim() ||
    !fighterB.trim()
  ) {
    response.status(400).json({ error: 'invalid_input', message: "Hold up! Every corner needs a fighter. Give both a name before the bell rings." });
    return;
  }
  if (fighterA.trim().length > MAX_FIGHTER_LENGTH || fighterB.trim().length > MAX_FIGHTER_LENGTH) {
    response.status(400).json({ error: 'name_too_long', message: "Easy there, announcer! That name won't fit on the marquee. Keep each fighter under 50 characters." });
    return;
  }

  const nameA = fighterA.trim();
  const nameB = fighterB.trim();

  const results = await Promise.allSettled([
    getVerdict(nameA, nameB),
    getImage(nameA),
    getImage(nameB),
  ]);
  const [verdictResult, imageAResult, imageBResult] = results;

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(['verdict', 'imageA', 'imageB'][i], 'failed:', result.reason?.status ?? '', result.reason?.code ?? '', result.reason?.message);
    }
  });

  if (verdictResult.status === 'rejected') {
    response.status(502).json({ error: 'verdict_failed', message: "The judges knocked over the scorecards and can't call it. Ring the bell and try again!" });
    return;
  }

  const imageResults = [
    { side: 'A', name: nameA, result: imageAResult },
    { side: 'B', name: nameB, result: imageBResult },
  ];
  const refused = imageResults.filter(({ result }) => result.status === 'rejected' && result.reason?.code === 'moderation_blocked');
  if (refused.length > 0) {
    const names = refused.map(({ name }) => `"${name}"`).join(' and ');
    response.status(422).json({
      error: 'moderation_blocked',
      fighters: refused.map(({ side }) => side),
      message: `The ref just blew the whistle! ${names} can't step into the ring. Pick a different fighter.`,
    });
    return;
  }

  if (imageResults.some(({ result }) => result.status === 'rejected')) {
    response.status(502).json({ error: 'image_failed', message: "Our sketch artist snapped their pencil mid-portrait! Give it another go." });
    return;
  }

  response.status(200).json({
    verdict: verdictResult.value,
    imageA: imageAResult.value,
    imageB: imageBResult.value,
  });
};
