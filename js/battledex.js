const dexGrid = document.getElementById('dexGrid');
const dexEmpty = document.getElementById('dexEmpty');
const dexCount = document.getElementById('dexCount');
const lastFightButton = document.getElementById('lastFightButton');

lastFightButton.hidden = !getLastFight();

function buildCard(entry) {
  const card = document.createElement('article');
  card.className = 'dex-card';

  const img = document.createElement('img');
  img.className = 'dex-card__image';
  img.src = entry.imageDataUrl;
  img.alt = entry.label;

  const label = document.createElement('span');
  label.className = 'dex-card__label';
  label.textContent = entry.label;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'dex-card__remove';
  remove.setAttribute('aria-label', 'Remove ' + entry.label + ' from BattleDex');
  remove.textContent = '×';
  remove.addEventListener('click', () => {
    deleteFromBattledex(entry.id);
    renderBattledex();
  });

  card.append(img, label, remove);
  return card;
}

function renderBattledex() {
  const dex = getBattledex().slice().reverse();

  if (dex.length === 0) {
    dexEmpty.hidden = false;
    dexGrid.hidden = true;
    dexCount.textContent = '';
    return;
  }

  dexEmpty.hidden = true;
  dexGrid.hidden = false;
  dexCount.textContent = dex.length === 1 ? '1 fighter saved' : dex.length + ' fighters saved';
  dexGrid.replaceChildren(...dex.map(buildCard));
}

renderBattledex();
