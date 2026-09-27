(() => {
  'use strict';

  const prompts = [
    {
      title: 'An old radio',
      text: 'Did your family have a radio at home? What did you like to listen to?',
      icon: '📻',
      image: '/images/then-and-now/radio.jpg'
    },
    {
      title: 'A rotary telephone',
      text: 'Have you ever used a telephone like this? Who did you enjoy calling?',
      icon: '☎️',
      image: '/images/then-and-now/rotary-telephone.jpg'
    },
    {
      title: 'A record player',
      text: 'What music might you choose to play on a record player?',
      icon: '🎵',
      image: '/images/then-and-now/record-player.jpg'
    },
    {
      title: 'A film camera',
      text: 'Did you ever take photographs with a camera like this?',
      icon: '📷',
      image: '/images/then-and-now/film-camera.jpg'
    },
    {
      title: 'A sewing machine',
      text: 'Have you seen someone use a sewing machine? What might they make?',
      icon: '🧵',
      image: '/images/then-and-now/sewing-machine.jpg'
    },
    {
      title: 'A traditional lamp',
      text: 'What might an evening have felt like with a lamp like this?',
      icon: '🪔',
      image: '/images/then-and-now/traditional-lamp.jpg'
    }
  ];

  const title = document.querySelector('#prompt-title');
  const image = document.querySelector('#prompt-image');
  const text = document.querySelector('#prompt-text');
  const position = document.querySelector('#prompt-position');
  const previous = document.querySelector('#previous-prompt');
  const next = document.querySelector('#next-prompt');
  let current = 0;

  function render() {
    const prompt = prompts[current];
    title.textContent = prompt.title;
    const photo = document.createElement('img');
    photo.src = prompt.image;
    photo.alt = `Generic illustration of ${prompt.title.toLowerCase()}`;
    photo.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.className = 'category-icon category-icon--nostalgia activity-emoji';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', prompt.title);
      fallback.textContent = prompt.icon;
      image.replaceChildren(fallback);
    }, { once: true });
    image.replaceChildren(photo);
    text.textContent = prompt.text;
    position.textContent = `${current + 1} of ${prompts.length}`;
    previous.disabled = current === 0;
    next.disabled = current === prompts.length - 1;
  }

  previous.addEventListener('click', () => {
    if (current > 0) {
      current -= 1;
      render();
    }
  });

  next.addEventListener('click', () => {
    if (current < prompts.length - 1) {
      current += 1;
      render();
    }
  });

  render();
})();
