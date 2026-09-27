(() => {
  'use strict';

  window.ReMindRoutineData = Object.freeze([
    {
      id: 'shower',
      name: 'Taking a shower',
      icon: '🚿',
      steps: [
        { label: 'Turn on water', icon: '🚿', category: 'schedule', hint1: 'What needs to be running before you step into the shower?', hint2: 'Look for the step about starting the water.' },
        { label: 'Wash body', icon: '🧼', category: 'kitchen', hint1: 'After getting wet, what can you wash with soap?', hint2: 'Look for washing your body.' },
        { label: 'Wash hair', icon: '🫧', category: 'kitchen', hint1: 'What part of you might you shampoo next?', hint2: 'Look for washing your hair.' },
        { label: 'Rinse', icon: '💧', category: 'schedule', hint1: 'What do you do to wash away the soap and shampoo?', hint2: 'Look for the step called Rinse.' },
        { label: 'Turn off water', icon: '🚿', category: 'schedule', hint1: 'What should you do when you have finished washing?', hint2: 'Find the step about turning off the water.' },
        { label: 'Dry off', icon: '🛁', category: 'schedule', hint1: 'What helps you get dry after your shower?', hint2: 'Look for drying off with a towel.' }
      ]
    },
    {
      id: 'handwashing',
      name: 'Washing hands',
      icon: '🧼',
      steps: [
        { label: 'Turn on tap', icon: '🚰', category: 'schedule', hint1: 'What do you turn on to get water flowing?', hint2: 'Look for the tap.' },
        { label: 'Wet hands', icon: '💧', category: 'schedule', hint1: 'What do you do with your hands under the running water?', hint2: 'Look for wetting your hands.' },
        { label: 'Apply soap', icon: '🧴', category: 'kitchen', hint1: 'What do we usually put on our hands before scrubbing?', hint2: 'Look for the step involving soap.' },
        { label: 'Scrub', icon: '🫧', category: 'kitchen', hint1: 'What helps spread soap over both hands?', hint2: 'Look for rubbing your hands together.' },
        { label: 'Rinse', icon: '💧', category: 'schedule', hint1: 'What washes the soap away?', hint2: 'Look for rinsing under the water.' },
        { label: 'Dry hands', icon: '🧻', category: 'schedule', hint1: 'What can you use after rinsing to get your hands dry?', hint2: 'Look for drying your hands with a towel.' }
      ]
    },
    {
      id: 'bathroom',
      name: 'Using the bathroom',
      icon: '🚪',
      steps: [
        { label: 'Go to the bathroom', icon: '🚪', category: 'schedule', hint1: 'Where do you go when you need to use the bathroom?', hint2: 'Look for going to the bathroom.' },
        { label: 'Use the toilet', icon: '🚻', category: 'schedule', hint1: 'What is the main step while you are in the bathroom?', hint2: 'Look for using the toilet.' },
        { label: 'Flush', icon: '🚽', category: 'schedule', hint1: 'What do you do when you are finished using the toilet?', hint2: 'Look for the step called Flush.' },
        { label: 'Wash hands', icon: '🧼', category: 'kitchen', hint1: 'What is a good thing to do after using the toilet?', hint2: 'Look for washing your hands.' }
      ]
    },
    {
      id: 'laundry',
      name: 'Doing laundry',
      icon: '🧺',
      steps: [
        { label: 'Sort clothes', icon: '👕', category: 'clothing', hint1: 'What can you do with the clothes before putting them in the machine?', hint2: 'Look for sorting the clothes.' },
        { label: 'Load machine', icon: '🧺', category: 'schedule', hint1: 'Where do the clothes go before washing?', hint2: 'Look for putting clothes into the machine.' },
        { label: 'Add detergent', icon: '🧴', category: 'kitchen', hint1: 'What do you add to help clean the clothes?', hint2: 'Look for the detergent.' },
        { label: 'Start machine', icon: '▶️', category: 'schedule', hint1: 'What do you do after the clothes and detergent are ready?', hint2: 'Look for starting the wash.' },
        { label: 'Remove clothes', icon: '👚', category: 'clothing', hint1: 'What do you take out when the wash has finished?', hint2: 'Look for removing the clothes.' },
        { label: 'Hang or fold', icon: '🧦', category: 'clothing', hint1: 'What can you do with clean clothes so they are ready to put away?', hint2: 'Look for hanging or folding them.' }
      ]
    },
    {
      id: 'phone-call',
      name: 'Making a phone call',
      icon: '☎️',
      steps: [
        { label: 'Find the phone', icon: '📱', category: 'schedule', hint1: 'What do you need to make a call?', hint2: 'Look for finding the phone.' },
        { label: 'Find a number or contact', icon: '📇', category: 'schedule', hint1: 'How can you know whom you want to call?', hint2: 'Look for the number or contact.' },
        { label: 'Dial or select contact', icon: '🔢', category: 'schedule', hint1: 'What do you do to connect to the person?', hint2: 'Look for dialing or selecting their contact.' },
        { label: 'Wait for an answer', icon: '⏳', category: 'schedule', hint1: 'What happens after you start the call?', hint2: 'Look for waiting for an answer.' },
        { label: 'Talk', icon: '🗣️', category: 'schedule', hint1: 'What do you do when the person answers?', hint2: 'Look for talking together.' },
        { label: 'Say goodbye and hang up', icon: '👋', category: 'schedule', hint1: 'What can you say when your conversation is finished?', hint2: 'Look for saying goodbye and ending the call.' }
      ]
    }
  ]);
})();
