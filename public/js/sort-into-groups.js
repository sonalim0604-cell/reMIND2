(() => {
  'use strict';

  const rounds = window.ReMindSortData;
  const levelButtons = [...document.querySelectorAll('[data-level]')];
  const roundPicker = document.querySelector('#round-picker');
  const roundPanel = document.querySelector('#sort-round');
  const roundTitle = document.querySelector('#round-title');
  const instruction = document.querySelector('#round-instruction');
  const zones = document.querySelector('#group-zones');
  const itemsArea = document.querySelector('#items');
  const message = document.querySelector('#sort-message');
  let currentLevel = 'easy';
  let currentRound = null;
  let selected = null;
  let placed = new Map();

  function renderRoundPicker() {
    roundPicker.replaceChildren();
    rounds[currentLevel].forEach((round, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button button-secondary activity-card';
      button.textContent = round.name;
      button.setAttribute('aria-pressed', String(currentRound === round));
      button.addEventListener('click', () => startRound(round));
      roundPicker.append(button);
    });
  }

  function selectLevel(level) {
    currentLevel = level;
    currentRound = null;
    selected = null;
    placed = new Map();
    roundPanel.hidden = true;
    levelButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.level === level)));
    renderRoundPicker();
  }

  function startRound(round) {
    currentRound = round;
    selected = null;
    placed = new Map();
    roundTitle.textContent = round.name;
    instruction.textContent = round.instruction;
    message.textContent = '';
    roundPanel.hidden = false;
    renderRoundPicker();
    render();
  }

  function render() {
    zones.replaceChildren();
    currentRound.zones.forEach((zoneData, index) => {
      const zone = document.createElement('button');
      zone.type = 'button';
      zone.className = `button button-secondary activity-card category-zone category-zone--${zoneData.category}`;
      zone.style.minHeight = '6rem';
      const placedItems = currentRound.items.filter(item => placed.get(item) === index);
      const contents = placedItems.map(item => `<span class="placed-sort-item"><span class="category-icon category-icon--${item.category} activity-emoji" aria-hidden="true">${item.icon}</span><span>${item.name}</span></span>`).join('');
      zone.innerHTML = `<span class="category-icon category-icon--${zoneData.category} activity-emoji" aria-hidden="true">${zoneData.icon}</span><span>${zoneData.name}</span><span class="placed-sort-items">${contents}</span>`;
      zone.addEventListener('click', () => placeInGroup(index));
      zones.append(zone);
    });

    itemsArea.replaceChildren();
    currentRound.items.filter(item => !placed.has(item)).forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button button-secondary activity-card activity-object-choice';
      button.style.minHeight = '5rem';
      button.innerHTML = `<span class="category-icon category-icon--${item.category} activity-emoji" aria-hidden="true">${item.icon}</span><span>${item.name}</span>`;
      button.setAttribute('aria-pressed', String(selected === item));
      if (selected === item) button.classList.add('is-selected');
      button.addEventListener('click', () => {
        selected = item;
        message.textContent = 'Now choose a group for that item.';
        render();
      });
      itemsArea.append(button);
    });
  }

  function placeInGroup(groupIndex) {
    if (!selected) {
      message.textContent = 'Choose an item first.';
      return;
    }
    const item = selected;
    const zone = currentRound.zones[groupIndex];
    if (item.zone !== groupIndex) {
      const intendedZone = currentRound.zones[item.zone];
      message.textContent = `${item.name} is often grouped with ${intendedZone.name}. You can try that group.`;
      return;
    }
    placed.set(item, groupIndex);
    selected = null;
    message.textContent = `Nice, ${item.name.toLowerCase()} is in ${zone.name}.`;
    if (placed.size === currentRound.items.length) message.textContent = 'All the items are placed. Nicely done!';
    render();
  }

  levelButtons.forEach(button => button.addEventListener('click', () => selectLevel(button.dataset.level)));
  document.querySelector('#next-round').addEventListener('click', () => {
    const levelRounds = rounds[currentLevel];
    const nextIndex = (levelRounds.indexOf(currentRound) + 1) % levelRounds.length;
    startRound(levelRounds[nextIndex]);
  });
  selectLevel('easy');
})();
