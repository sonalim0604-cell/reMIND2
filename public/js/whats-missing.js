(() => {
  'use strict';

  const objects = [
    { icon: '☕', category: 'kitchen', name: 'Cup' },
    { icon: '🥄', category: 'kitchen', name: 'Spoon' },
    { icon: '🔑', category: 'kitchen', name: 'Key' },
    { icon: '👓', category: 'kitchen', name: 'Glasses' },
    { icon: '☂️', category: 'kitchen', name: 'Umbrella' },
    { icon: '📖', category: 'kitchen', name: 'Book' },
    { icon: '🧦', category: 'clothing', name: 'Sock' },
    { icon: '🍽️', category: 'kitchen', name: 'Plate' }
  ];
  const row = document.querySelector('#object-row');
  const options = document.querySelector('#answer-options');
  const question = document.querySelector('#question');
  const message = document.querySelector('#game-message');
  const playAgain = document.querySelector('#play-again');
  let missing;
  let timer;
  let answered = false;

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function renderObjects(items) {
    row.replaceChildren(...items.map(item => {
      const card = document.createElement('div');
      card.className = 'activity-card activity-object-card';
      card.innerHTML = `<span class="category-icon category-icon--${item.category} activity-emoji" aria-hidden="true">${item.icon}</span><span>${item.name}</span>`;
      return card;
    }));
  }

  function startRound() {
    window.clearTimeout(timer);
    answered = false;
    message.textContent = '';
    options.replaceChildren();
    playAgain.hidden = true;
    question.textContent = 'Take a moment to look.';

    const shown = shuffle(objects).slice(0, 5);
    missing = shown[Math.floor(Math.random() * shown.length)];
    renderObjects(shown);

    timer = window.setTimeout(() => {
      renderObjects(shown.filter(item => item !== missing));
      question.textContent = 'Which one is missing?';
      const distractors = shuffle(objects.filter(item => !shown.includes(item))).slice(0, 2);
      shuffle([missing, ...distractors]).forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button button-secondary activity-card activity-object-choice';
        button.style.minHeight = '5rem';
        button.innerHTML = `<span class="category-icon category-icon--${item.category} activity-emoji" aria-hidden="true">${item.icon}</span><span>${item.name}</span>`;
        button.addEventListener('click', () => choose(item));
        options.append(button);
      });
    }, 4000);
  }

  function choose(item) {
    if (answered) return;
    answered = true;
    renderObjects([missing]);
    if (item === missing) {
      message.textContent = 'You found it! Would you like another round?';
      playAgain.textContent = 'Play again';
    } else {
      message.textContent = `The missing object was ${missing.name}. That's okay—try another round whenever you're ready.`;
      playAgain.textContent = 'Try another round';
    }
    playAgain.hidden = false;
  }

  playAgain.addEventListener('click', startRound);
  startRound();
})();
