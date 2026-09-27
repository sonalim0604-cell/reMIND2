(() => {
  'use strict';

  const pairs = [
    { icon: '☕', category: 'kitchen', label: 'Cup' },
    { icon: '🔑', category: 'kitchen', label: 'Key' },
    { icon: '👓', category: 'kitchen', label: 'Glasses' },
    { icon: '👕', category: 'clothing', label: 'Shirt' },
    { icon: '📻', category: 'nostalgia', label: 'Radio' }
  ];
  const grid = document.querySelector('#pair-grid');
  const count = document.querySelector('#pairs-count');
  const message = document.querySelector('#game-message');
  let cards = [];
  let flipped = [];
  let found = 0;
  let locked = false;
  let hideTimer;

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function newGame() {
    window.clearTimeout(hideTimer);
    cards = shuffle([...pairs, ...pairs].map((pair, index) => ({
      ...pair,
      id: index,
      revealed: false,
      matched: false
    })));
    flipped = [];
    found = 0;
    locked = false;
    count.textContent = 'Pairs found: 0 of 5';
    message.textContent = '';
    render();
  }

  function render() {
    grid.replaceChildren();
    cards.forEach(card => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button button-secondary activity-card activity-object-choice';
      button.style.minHeight = '5rem';
      button.style.placeItems = 'center';
      button.setAttribute('aria-label', card.revealed || card.matched ? card.label : 'Hidden card. Reveal card');
      button.setAttribute('aria-pressed', String(card.revealed || card.matched));
      if (card.revealed || card.matched) {
        button.innerHTML = `<span class="category-icon category-icon--${card.category} activity-emoji" aria-hidden="true">${card.icon}</span><span>${card.label}</span>`;
      } else {
        button.textContent = '•';
      }
      if (card.matched) {
        button.disabled = true;
        button.style.outline = '3px solid #65a876';
      }
      button.addEventListener('click', () => flip(card));
      grid.append(button);
    });
  }

  function flip(card) {
    if (locked || card.matched || card.revealed) return;
    card.revealed = true;
    flipped.push(card);
    message.textContent = '';
    render();

    if (flipped.length !== 2) return;
    locked = true;
    if (flipped[0].icon === flipped[1].icon) {
      flipped.forEach(item => { item.matched = true; });
      found += 1;
      count.textContent = `Pairs found: ${found} of ${pairs.length}`;
      message.textContent = found === pairs.length ? 'All the pairs are together. Nicely done!' : 'A pair found—nice!';
      flipped = [];
      locked = false;
      render();
    } else {
      hideTimer = window.setTimeout(() => {
        flipped.forEach(item => { item.revealed = false; });
        flipped = [];
        locked = false;
        render();
      }, 1000);
    }
  }

  document.querySelector('#new-game').addEventListener('click', newGame);
  newGame();
})();
