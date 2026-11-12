const ART_STYLE_TEMPLATE = `{FIGHTER}. 16-bit pixel art illustration, retro video game sprite style, bold outlined pixels, vibrant limited color palette, dynamic action pose. Depicted as one cohesive image, centered, filling most of the frame, isolated on a plain solid color background with no scenery. No text, words, letters, numbers, logos, watermarks, UI elements, borders or frames.`;

function artPrompt(fighter) {
  return ART_STYLE_TEMPLATE.replace('{FIGHTER}', () => fighter);
}

module.exports = { artPrompt };
