const MAX_FIGHTER_LENGTH = 50;

const LOADING_MESSAGES = [
  'Sharpening claws…',
  'Consulting the ancient scrolls…',
  'Warming up the arena…',
  'Weighing the odds…',
  'Summoning the judges…',
  'Polishing the championship belt…',
  'Stretching before the big one…',
  'Rolling out the red carpet…',
  'Checking the fighters for hidden snacks…',
  'Tuning the crowd to maximum roar…',
  'Inking the matchup posters…',
  "Sharpening the artist's pencils…",
  'Rendering in glorious 16-bit…',
  'Dusting off the trophy…',
  'Powering up…',
];

const ERROR_MESSAGES = {
  rate_limited: "Whoa there, champ! You're swinging faster than the ref can count. Take a breather and step back in the ring in a minute.",
  invalid_input: "Hold up! Every corner needs a fighter. Give both a name before the bell rings.",
  name_too_long: "Easy there, announcer! That name won't fit on the marquee. Keep each fighter under 50 characters.",
  verdict_failed: "The judges knocked over the scorecards and can't call it. Ring the bell and try again!",
  image_failed: "Our sketch artist snapped their pencil mid-portrait! Give it another go.",
  moderation_blocked: "The ref just blew the whistle! That fighter isn't allowed in the ring. Pick someone else.",
  network_failed: "The arena lights flickered and we lost the connection. Check your signal and run it back!",
  bad_response: "The crowd went silent, and the arena sent back gibberish mid-fight. Try again!",
  server_error: "The arena's power just blipped. Give it a moment and try again!",
  method_not_allowed: "Wrong entrance, challenger! Fights are booked through the main gate only.",
};

const fighterAInput = document.getElementById('fighterA');
const fighterBInput = document.getElementById('fighterB');
const fightButton = document.getElementById('fightButton');
const formError = document.getElementById('formError');
const formView = document.getElementById('formView');

const loadingView = document.getElementById('loadingView');
const loadingMessage = document.getElementById('loadingMessage');

const resultView = document.getElementById('resultView');
const portraitA = document.getElementById('portraitA');
const portraitB = document.getElementById('portraitB');
const portraitImageA = document.getElementById('portraitImageA');
const portraitImageB = document.getElementById('portraitImageB');
const portraitLabelA = document.getElementById('portraitLabelA');
const portraitLabelB = document.getElementById('portraitLabelB');
const verdictText = document.getElementById('verdictText');
const fightAgainButton = document.getElementById('fightAgainButton');

const errorView = document.getElementById('errorView');
const errorMessage = document.getElementById('errorMessage');
const retryButton = document.getElementById('retryButton');

let loadingIntervalId = null;
let lastFighters = { fighterA: '', fighterB: '' };

const views = {
  form: formView,
  loading: loadingView,
  result: resultView,
  error: errorView,
};

function showView(name) {
  for (const [key, element] of Object.entries(views)) {
    element.hidden = key !== name;
  }
  formError.hidden = true;
  resultView.classList.remove('is-revealed');
}

window.showView = showView;

function showForm() {
  showView('form');
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function shuffled(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function startLoading() {
  showView('loading');
  const order = shuffled(LOADING_MESSAGES);
  let index = 0;
  loadingMessage.textContent = order[0];
  loadingIntervalId = setInterval(() => {
    index = (index + 1) % order.length;
    loadingMessage.textContent = order[index];
  }, 2200);
}

function stopLoading() {
  if (loadingIntervalId) {
    clearInterval(loadingIntervalId);
    loadingIntervalId = null;
  }
}

function showError(errorCode, fallbackMessage) {
  errorMessage.textContent = fallbackMessage || ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.network_failed;
  showView('error');
}

function showResult(data, { persist = true } = {}) {
  showView('result');

  // Text-only until the image stage lands: no image means no image block and no save button.
  const hasImages = Boolean(data.imageA && data.imageB);

  portraitImageA.parentElement.hidden = !hasImages;
  portraitImageB.parentElement.hidden = !hasImages;
  if (hasImages) {
    portraitImageA.src = data.imageA;
    portraitImageA.alt = lastFighters.fighterA;
    portraitImageB.src = data.imageB;
    portraitImageB.alt = lastFighters.fighterB;
  }
  portraitLabelA.textContent = lastFighters.fighterA;
  portraitLabelB.textContent = lastFighters.fighterB;

  portraitA.classList.toggle('is-winner', data.verdict.winner === 'A');
  portraitB.classList.toggle('is-winner', data.verdict.winner === 'B');

  verdictText.textContent = data.verdict.explanation;

  setSaveButtonState('A', isInBattledex(lastFighters.fighterA), hasImages);
  setSaveButtonState('B', isInBattledex(lastFighters.fighterB), hasImages);

  if (persist) {
    saveLastFight({
      fighterA: lastFighters.fighterA,
      fighterB: lastFighters.fighterB,
      imageA: data.imageA,
      imageB: data.imageB,
      verdict: data.verdict,
    });
  }

  // Trigger the reveal transition on the next frame so the initial
  // (hidden) state actually paints first.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resultView.classList.add('is-revealed');
    });
  });
}

function setSaveButtonState(side, saved, visible) {
  const button = document.querySelector(`.portrait-card__save[data-save="${side}"]`);
  button.hidden = !visible;
  button.disabled = saved;
  button.textContent = saved ? 'Saved!' : 'Add to BattleDex';
}

function validateFighter(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_FIGHTER_LENGTH) return false;
  return true;
}

function updateFightButton() {
  fightButton.disabled = !(validateFighter(fighterAInput.value) && validateFighter(fighterBInput.value));
}

fighterAInput.addEventListener('input', updateFightButton);
fighterBInput.addEventListener('input', updateFightButton);
updateFightButton();

async function runFight(fighterA, fighterB) {
  lastFighters = { fighterA, fighterB };
  startLoading();

  let response;
  try {
    response = await fetch('/api/fight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fighterA, fighterB }),
    });
  } catch {
    stopLoading();
    showError('network_failed');
    return;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    stopLoading();
    showError('bad_response');
    return;
  }

  stopLoading();

  if (!response.ok) {
    showError(data.error, data.message);
    return;
  }

  showResult(data);
}

fightButton.addEventListener('click', () => {
  const fighterA = fighterAInput.value.trim();
  const fighterB = fighterBInput.value.trim();

  if (fighterA.length > MAX_FIGHTER_LENGTH || fighterB.length > MAX_FIGHTER_LENGTH) {
    showFormError(ERROR_MESSAGES.name_too_long);
    return;
  }
  if (!validateFighter(fighterA) || !validateFighter(fighterB)) {
    showFormError(ERROR_MESSAGES.invalid_input);
    return;
  }

  formError.hidden = true;
  runFight(fighterA, fighterB);
});

retryButton.addEventListener('click', () => {
  runFight(lastFighters.fighterA, lastFighters.fighterB);
});

fightAgainButton.addEventListener('click', () => {
  showForm();
});

document.querySelectorAll('.portrait-card__save').forEach((button) => {
  button.addEventListener('click', async () => {
    const side = button.dataset.save;
    const label = side === 'A' ? lastFighters.fighterA : lastFighters.fighterB;
    const imageDataUrl = side === 'A' ? portraitImageA.src : portraitImageB.src;

    if (button.disabled) return;
    button.disabled = true;

    try {
      await saveToBattledex({ label, imageDataUrl });
      button.textContent = 'Saved!';
    } catch {
      button.disabled = false;
      button.textContent = 'BattleDex is packed! Clear some space';
    }
  });
});

if (new URLSearchParams(location.search).get('recap') === '1') {
  const lastFight = getLastFight();
  if (lastFight) {
    lastFighters = { fighterA: lastFight.fighterA, fighterB: lastFight.fighterB };
    showResult(
      { imageA: lastFight.imageA, imageB: lastFight.imageB, verdict: lastFight.verdict },
      { persist: false }
    );
  }
}
