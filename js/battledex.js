const dexGrid = document.getElementById('dexGrid');
const dexEmpty = document.getElementById('dexEmpty');
const dexCount = document.getElementById('dexCount');
const dexMeter = document.getElementById('dexMeter');
const dexBadge = document.getElementById('dexBadge');
const lastFightButton = document.getElementById('lastFightButton');

// Presentation only: the meter has 20 pips spread across the real storage cap,
// and the grid pads with "?" slots until it shows at least 20 cards' worth.
const METER_PIPS = 20;
const MIN_GRID_SLOTS = 20;

lastFightButton.hidden = !getLastFight();

function pad3(n) {
  return String(n).padStart(3, '0');
}

function buildCard(entry, number) {
  const card = document.createElement('article');
  card.className = 'dex-card';

  const strip = document.createElement('div');
  strip.className = 'dex-card__strip';

  const no = document.createElement('span');
  no.className = 'dex-card__no';
  no.textContent = 'No.' + pad3(number);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'dex-card__remove';
  remove.setAttribute('aria-label', 'Remove ' + entry.label + ' from BattleDex');
  remove.textContent = '×';
  remove.addEventListener('click', () => {
    deleteFromBattledex(entry.id);
    renderBattledex();
  });

  strip.append(no, remove);

  const art = document.createElement('div');
  art.className = 'dex-card__art';

  const img = document.createElement('img');
  img.className = 'dex-card__image';
  img.src = entry.imageDataUrl;
  img.alt = entry.label;

  const shine = document.createElement('div');
  shine.className = 'dex-card__shine';

  art.append(img, shine);

  const label = document.createElement('span');
  label.className = 'dex-card__label';
  label.textContent = entry.label;

  card.append(strip, art, label);
  return card;
}

function buildEmptySlot(number) {
  const slot = document.createElement('div');
  slot.className = 'dex-slot';
  slot.setAttribute('aria-hidden', 'true');

  const mark = document.createElement('span');
  mark.className = 'dex-slot__mark';
  mark.textContent = '?';

  const no = document.createElement('span');
  no.className = 'dex-slot__no';
  no.textContent = 'No.' + pad3(number);

  slot.append(mark, no);
  return slot;
}

function renderMeter(count) {
  const filled = Math.ceil((count / BATTLEDEX_MAX_ENTRIES) * METER_PIPS);
  const pips = [];
  for (let i = 0; i < METER_PIPS; i++) {
    const pip = document.createElement('div');
    pip.className = 'dex__pip' + (i < filled ? ' is-on' : '');
    pips.push(pip);
  }
  dexMeter.classList.toggle('is-full', filled >= 18);
  dexMeter.setAttribute('aria-valuenow', String(count));
  dexMeter.replaceChildren(...pips);
  dexCount.textContent = count + ' / ' + BATTLEDEX_MAX_ENTRIES;
  dexBadge.textContent = count;
}

function renderBattledex() {
  const dex = getBattledex().slice().reverse();
  renderMeter(dex.length);

  if (dex.length === 0) {
    dexEmpty.hidden = false;
    dexGrid.hidden = true;
    return;
  }

  dexEmpty.hidden = true;
  dexGrid.hidden = false;

  // Newest first, numbered down from the total so the oldest save is No.001.
  const children = dex.map((entry, i) => buildCard(entry, dex.length - i));
  for (let n = dex.length + 1; n <= MIN_GRID_SLOTS; n++) {
    children.push(buildEmptySlot(n));
  }
  dexGrid.replaceChildren(...children);
}

renderBattledex();
