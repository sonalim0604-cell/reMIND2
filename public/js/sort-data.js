(() => {
  'use strict';

  window.ReMindSortData = Object.freeze({
    easy: [
      {
        id: 'same-items',
        name: 'Match the same',
        instruction: 'Put identical items together in their matching zone.',
        zones: [{ name: 'Cup pair', icon: '☕', category: 'kitchen' }, { name: 'Ball pair', icon: '⚽', category: 'exercise' }],
        items: [
          { name: 'Cup', icon: '☕', category: 'kitchen', zone: 0 }, { name: 'Cup', icon: '☕', category: 'kitchen', zone: 0 },
          { name: 'Ball', icon: '⚽', category: 'exercise', zone: 1 }, { name: 'Ball', icon: '⚽', category: 'exercise', zone: 1 }
        ]
      },
      {
        id: 'match-colors',
        name: 'Match colors',
        instruction: 'Group items by their warm or cool color.',
        zones: [{ name: 'Warm colors', icon: '🌞', category: 'kitchen' }, { name: 'Cool colors', icon: '❄️', category: 'schedule' }],
        items: [
          { name: 'Golden sun', icon: '🌞', category: 'kitchen', zone: 0 }, { name: 'Amber cup', icon: '☕', category: 'kitchen', zone: 0 },
          { name: 'Yellow star', icon: '⭐', category: 'kitchen', zone: 0 }, { name: 'Blue shirt', icon: '👕', category: 'schedule', zone: 1 },
          { name: 'Blue umbrella', icon: '☂️', category: 'schedule', zone: 1 }, { name: 'Blue book', icon: '📘', category: 'schedule', zone: 1 }
        ]
      },
      {
        id: 'match-shapes',
        name: 'Match shapes',
        instruction: 'Group the round shapes and the square shapes.',
        zones: [{ name: 'Circles', icon: '🔵', category: 'schedule' }, { name: 'Squares', icon: '🟦', category: 'clothing' }],
        items: [
          { name: 'Red circle', icon: '🔴', category: 'schedule', zone: 0 }, { name: 'Yellow circle', icon: '🟡', category: 'schedule', zone: 0 },
          { name: 'Blue circle', icon: '🔵', category: 'schedule', zone: 0 }, { name: 'Blue square', icon: '🟦', category: 'clothing', zone: 1 },
          { name: 'Red square', icon: '🟥', category: 'clothing', zone: 1 }, { name: 'Yellow square', icon: '🟨', category: 'clothing', zone: 1 }
        ]
      }
    ],
    medium: [
      {
        id: 'food-clothing',
        name: 'Food vs Clothing',
        instruction: 'Choose the everyday group each item belongs with.',
        zones: [{ name: 'Food', icon: '🍽️', category: 'kitchen' }, { name: 'Clothing', icon: '👕', category: 'clothing' }],
        items: [
          { name: 'Apple', icon: '🍎', category: 'kitchen', zone: 0 }, { name: 'Bread', icon: '🍞', category: 'kitchen', zone: 0 },
          { name: 'Carrot', icon: '🥕', category: 'kitchen', zone: 0 }, { name: 'Shirt', icon: '👕', category: 'clothing', zone: 1 },
          { name: 'Sock', icon: '🧦', category: 'clothing', zone: 1 }, { name: 'Hat', icon: '🧢', category: 'clothing', zone: 1 }
        ]
      },
      {
        id: 'kitchen-bathroom',
        name: 'Kitchen vs Bathroom',
        instruction: 'Think about where you usually find or use each item.',
        zones: [{ name: 'Kitchen', icon: '🍽️', category: 'kitchen' }, { name: 'Bathroom', icon: '🚿', category: 'schedule' }],
        items: [
          { name: 'Cup', icon: '☕', category: 'kitchen', zone: 0 }, { name: 'Spoon', icon: '🥄', category: 'kitchen', zone: 0 },
          { name: 'Plate', icon: '🍽️', category: 'kitchen', zone: 0 }, { name: 'Soap', icon: '🧴', category: 'schedule', zone: 1 },
          { name: 'Towel', icon: '🧻', category: 'schedule', zone: 1 }, { name: 'Toothbrush', icon: '🪥', category: 'schedule', zone: 1 }
        ]
      },
      {
        id: 'indoor-outdoor',
        name: 'Indoor vs Outdoor',
        instruction: 'Choose whether each item is usually used inside or outside.',
        zones: [{ name: 'Indoor', icon: '🏠', category: 'schedule' }, { name: 'Outdoor', icon: '🌳', category: 'exercise' }],
        items: [
          { name: 'Book', icon: '📖', category: 'schedule', zone: 0 }, { name: 'Lamp', icon: '💡', category: 'schedule', zone: 0 },
          { name: 'Chair', icon: '🪑', category: 'schedule', zone: 0 }, { name: 'Umbrella', icon: '☂️', category: 'exercise', zone: 1 },
          { name: 'Flower', icon: '🌼', category: 'exercise', zone: 1 }, { name: 'Ball', icon: '⚽', category: 'exercise', zone: 1 }
        ]
      }
    ],
    hard: [
      {
        id: 'morning-evening',
        name: 'Morning vs Evening',
        instruction: 'Think about when you might use or do each of these.',
        zones: [{ name: 'Things for the morning', icon: '🌅', category: 'kitchen' }, { name: 'Things for the evening', icon: '🌙', category: 'nostalgia' }],
        items: [
          { name: 'Breakfast cup', icon: '☕', category: 'kitchen', zone: 0 }, { name: 'Toothbrush', icon: '🪥', category: 'schedule', zone: 0 },
          { name: 'Newspaper', icon: '📰', category: 'schedule', zone: 0 }, { name: 'Pajamas', icon: '🛌', category: 'clothing', zone: 1 },
          { name: 'Slippers', icon: '🥿', category: 'clothing', zone: 1 }, { name: 'Moon', icon: '🌙', category: 'nostalgia', zone: 1 }
        ]
      },
      {
        id: 'cooking-items',
        name: 'Cooking vs Other Items',
        instruction: 'Which items help prepare food, and which have another use?',
        zones: [{ name: 'Used for cooking', icon: '🍳', category: 'kitchen' }, { name: 'Other everyday items', icon: '📖', category: 'schedule' }],
        items: [
          { name: 'Spoon', icon: '🥄', category: 'kitchen', zone: 0 }, { name: 'Cooking pot', icon: '🍲', category: 'kitchen', zone: 0 },
          { name: 'Plate', icon: '🍽️', category: 'kitchen', zone: 0 }, { name: 'Book', icon: '📖', category: 'schedule', zone: 1 },
          { name: 'Sock', icon: '🧦', category: 'clothing', zone: 1 }, { name: 'Key', icon: '🔑', category: 'schedule', zone: 1 }
        ]
      },
      {
        id: 'related-pairs',
        name: 'Things That Belong Together',
        instruction: 'Place things used together in the same zone.',
        zones: [{ name: 'Tea time', icon: '☕', category: 'kitchen' }, { name: 'Getting dressed', icon: '👕', category: 'clothing' }],
        items: [
          { name: 'Cup', icon: '☕', category: 'kitchen', zone: 0 }, { name: 'Spoon', icon: '🥄', category: 'kitchen', zone: 0 },
          { name: 'Plate', icon: '🍽️', category: 'kitchen', zone: 0 }, { name: 'Shirt', icon: '👕', category: 'clothing', zone: 1 },
          { name: 'Hat', icon: '🧢', category: 'clothing', zone: 1 }, { name: 'Sock', icon: '🧦', category: 'clothing', zone: 1 }
        ]
      }
    ]
  });
})();
