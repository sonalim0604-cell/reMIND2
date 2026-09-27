(function () {
  'use strict';

  const activities = [
    { title: 'Routine sequencing', tag: 'Evidence-informed: task sequencing', description: 'Put a few familiar steps in the order they usually happen.', icon: 'clockCalendar', category: 'schedule', href: '/routine-sequencing.html' },
    { title: "What's missing?", tag: 'Evidence-informed: attention', description: 'Look at a small group of everyday objects and spot what changed.', icon: 'cup', category: 'kitchen', href: '/whats-missing.html' },
    { title: 'Matching pairs', tag: 'Evidence-informed: visual recognition', description: 'Match pairs of familiar objects at your own pace.', icon: 'book', category: 'kitchen', href: '/matching-pairs.html' },
    { title: 'Sort into groups', tag: 'Evidence-informed: categorisation', description: 'Group familiar items by where they belong or how they are used.', icon: 'shirt', category: 'clothing', href: '/sort-into-groups.html' },
    { title: 'Rhythm tap-along', tag: 'Evidence-informed: rhythm and movement', description: 'Tap along with a gentle, steady pulse.', icon: 'music', category: 'music', href: '/rhythm-tap-along.html' },
    { title: 'Then & now', tag: 'Evidence-informed: reminiscence', description: 'Talk about familiar objects using generic illustrations.', icon: 'oldRadio', category: 'nostalgia', href: '/then-and-now.html' }
  ];

  const grid = document.getElementById('activity-grid');
  if (!grid) return;
  activities.forEach((activity) => {
    const card = document.createElement('article');
    card.className = 'activity-card';
    const icon = document.createElement('span');
    icon.innerHTML = window.ReMind.renderCategoryIcon(activity.icon, activity.category);
    const title = document.createElement('h3');
    title.textContent = activity.title;
    const description = document.createElement('p');
    description.textContent = activity.description;
    const evidence = document.createElement('span');
    evidence.className = 'evidence-tag';
    evidence.textContent = activity.tag;
    const action = document.createElement('a');
    action.className = 'button button-secondary';
    action.href = activity.href;
    action.textContent = 'Open activity';
    card.append(icon, title, description, evidence, action);
    grid.append(card);
  });
})();
