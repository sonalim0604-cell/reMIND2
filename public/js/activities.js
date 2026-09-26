(function () {
  'use strict';

  const activities = [
    { title: 'Routine sequencing', tag: 'Evidence-informed: task sequencing', description: 'Put a few familiar steps in the order they usually happen.', icon: 'clockCalendar' },
    { title: "What's missing?", tag: 'Evidence-informed: attention', description: 'Look at a small group of everyday objects and spot what changed.', icon: 'checklist' },
    { title: 'Matching pairs', tag: 'Evidence-informed: visual recognition', description: 'Match pairs of simple shapes, colors, or everyday items.', icon: 'learning' },
    { title: 'Sort into groups', tag: 'Evidence-informed: categorisation', description: 'Group familiar items by where they belong or how they are used.', icon: 'pill' },
    { title: 'Rhythm tap-along', tag: 'Evidence-informed: rhythm and movement', description: 'Tap a gentle rhythm together using a familiar song.', icon: 'music' },
    { title: 'Then & now', tag: 'Evidence-informed: reminiscence', description: 'Talk about a general era or place using generic photos only.', icon: 'exercise' }
  ];

  const grid = document.getElementById('activity-grid');
  if (!grid) return;
  activities.forEach((activity) => {
    const card = document.createElement('article');
    card.className = 'activity-card';
    const icon = document.createElement('span');
    icon.className = 'activity-icon';
    icon.innerHTML = window.ReMind.icons[activity.icon]();
    const title = document.createElement('h3');
    title.textContent = activity.title;
    const description = document.createElement('p');
    description.textContent = activity.description;
    const evidence = document.createElement('span');
    evidence.className = 'evidence-tag';
    evidence.textContent = activity.tag;
    const action = document.createElement('button');
    action.className = 'button button-secondary';
    action.type = 'button';
    action.textContent = 'Open activity';
    action.addEventListener('click', () => window.ReMind.showToast(`${activity.title} activity is ready for a future update.`));
    card.append(icon, title, description, evidence, action);
    grid.append(card);
  });
})();
