const ART_STYLE_TEMPLATE = `{FIGHTER}. Bold flat-color illustration, thick black outline, dynamic action pose, dramatic lighting, video game character art style. Keep it centered, filling most of the frame, isolated on a plain solid light grey background with no scenery. Absolutely no text, words, letters, numbers, logos, watermarks, UI elements, borders, or frames of any kind. Illustration only, nothing else on the canvas.`;

function artPrompt(fighter) {
  return ART_STYLE_TEMPLATE.replace('{FIGHTER}', () => fighter);
}

module.exports = { artPrompt };
