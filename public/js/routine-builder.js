(() => {
  'use strict';

  const slots = [
    { id: 'morning', label: 'Morning' },
    { id: 'afternoon', label: 'Afternoon' },
    { id: 'evening', label: 'Evening' },
    { id: 'night', label: 'Night' }
  ];
  const iconOptions = [
    { id: 'clockCalendar', label: 'Calendar' },
    { id: 'pill', label: 'Pill' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'exercise', label: 'Person exercising' },
    { id: 'music', label: 'Musical note' },
    { id: 'learning', label: 'Open book' },
    { id: 'person', label: 'Person' },
    { id: 'speaker', label: 'Speaker' }
  ];
  const list = document.querySelector('#routines-list');
  const listMessage = document.querySelector('#routine-list-message');
  const editor = document.querySelector('#routine-editor-panel');
  const form = document.querySelector('#routine-form');
  const slotInput = document.querySelector('#routine-slot');
  const nameInput = document.querySelector('#routine-name');
  const stepsContainer = document.querySelector('#routine-steps');
  const saveButton = document.querySelector('#save-routine');
  const duplicateDialog = document.querySelector('#duplicate-slot-dialog');
  const duplicateMessage = document.querySelector('#duplicate-slot-message');
  const appendRoutineButton = document.querySelector('#append-to-routine');
  const separateRoutineButton = document.querySelector('#create-separate-routine');
  const maxCueSeconds = 15;
  let routines = [];
  let editingId = null;
  let steps = [];
  let activeCapture = null;
  let pendingSave = null;

  function makeId() {
    return globalThis.crypto?.randomUUID?.() || `step-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function routinePayload() {
    return {
      slot: slotInput.value,
      name: nameInput.value.trim(),
      steps: steps.map(step => ({ id: step.id, label: step.label.trim(), icon: step.icon, cuePhrase: step.cuePhrase.trim() }))
    };
  }

  async function persistRoutineForCue() {
    if (!form.reportValidity()) throw new Error('Complete the routine name and step labels before recording a cue.');
    if (!steps.length) throw new Error('Add a step before recording its cue.');
    const url = editingId ? `/api/routines/${encodeURIComponent(editingId)}` : '/api/routines';
    const saved = await request(url, { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(routinePayload()) });
    editingId = saved.id;
    saved.steps.forEach((savedStep, index) => Object.assign(steps[index], savedStep));
    routines = [...routines.filter(routine => routine.id !== saved.id), saved]
      .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
    renderList();
  }

  function supportedRecordingType() {
    return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
      .find(type => MediaRecorder.isTypeSupported(type));
  }

  function fileExtension(mimeType) {
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('wav')) return 'wav';
    return 'webm';
  }

  function uploadStepCue(step, blob, controls) {
    controls.status.textContent = 'Saving personal recording…';
    controls.record.disabled = true;
    const body = new FormData();
    body.append('audio', blob, `step-cue.${fileExtension(blob.type)}`);
    fetch(`/api/audio/step-cue/${encodeURIComponent(step.id)}`, {
      method: 'POST',
      body,
      credentials: 'same-origin'
    }).then(async response => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'The cue recording could not be saved.');
      step.personalRecording = true;
      step.personalRecordingMimeType = result.mimeType;
      controls.status.textContent = 'Personal recording saved for this step.';
      renderSteps();
    }).catch(error => {
      controls.record.disabled = false;
      controls.record.textContent = step.personalRecording ? 'Re-record' : 'Record this cue';
      controls.status.textContent = error.message;
      window.ReMind.showToast(error.message);
    });
  }

  async function startStepRecording(step, controls) {
    if (activeCapture) {
      window.ReMind.showToast('Finish the current cue recording first.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      window.ReMind.showToast('Audio recording is not supported in this browser.');
      return;
    }

    const disabledControls = [...form.querySelectorAll('input, select, textarea, button')]
      .map(control => [control, control.disabled]);
    const permission = navigator.mediaDevices.getUserMedia({ audio: true });
    disabledControls.forEach(([control]) => { control.disabled = true; });
    controls.stop.disabled = false;
    controls.record.textContent = 'Recording…';
    controls.recording.hidden = false;
    controls.status.textContent = 'Allow microphone access, then say the cue phrase.';

    let stream;
    let capture;
    try {
      stream = await permission;
      const mimeType = supportedRecordingType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      capture = { recorder, stream, chunks: [], elapsed: 0, timer: null, upload: true, routineReady: null };
      activeCapture = capture;
      recorder.addEventListener('dataavailable', event => {
        if (event.data.size) capture.chunks.push(event.data);
      });
      recorder.addEventListener('stop', async () => {
        window.clearInterval(capture.timer);
        stream.getTracks().forEach(track => track.stop());
        if (activeCapture === capture) activeCapture = null;
        disabledControls.forEach(([control, wasDisabled]) => { control.disabled = wasDisabled; });
        controls.stop.disabled = true;
        controls.record.textContent = step.personalRecording ? 'Re-record' : 'Record this cue';
        controls.recording.hidden = true;
        controls.progress.value = 0;
        controls.elapsed.textContent = '';
        try {
          await capture.routineReady;
        } catch (error) {
          capture.upload = false;
          controls.status.textContent = error.message;
        }
        const blob = new Blob(capture.chunks, { type: recorder.mimeType || 'audio/webm' });
        if (capture.upload && blob.size) uploadStepCue(step, blob, controls);
      }, { once: true });
      recorder.start();
      controls.status.textContent = 'Recording. Stop when you finish the short cue.';
      capture.timer = window.setInterval(() => {
        capture.elapsed += 1;
        controls.progress.value = capture.elapsed;
        controls.elapsed.textContent = `${capture.elapsed} of ${maxCueSeconds} seconds`;
        if (capture.elapsed >= maxCueSeconds && recorder.state === 'recording') recorder.stop();
      }, 1000);
      capture.routineReady = persistRoutineForCue();
      capture.routineReady.catch(error => {
        capture.upload = false;
        controls.status.textContent = error.message;
        if (recorder.state === 'recording') recorder.stop();
      });
    } catch (error) {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (activeCapture === capture) activeCapture = null;
      disabledControls.forEach(([control, wasDisabled]) => { control.disabled = wasDisabled; });
      controls.stop.disabled = true;
      controls.record.textContent = step.personalRecording ? 'Re-record' : 'Record this cue';
      controls.recording.hidden = true;
      controls.status.textContent = 'Microphone access was not available.';
      window.ReMind.showToast(error.name === 'NotAllowedError' ? 'Please allow microphone access to record this cue.' : error.message);
    }
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      ...options
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Unable to complete the routine request.');
    }
    return response.status === 204 ? null : response.json();
  }

  function iconMarkup(icon) {
    const draw = window.ReMind.icons[icon];
    return typeof draw === 'function' ? draw() : window.ReMind.icons.checklist();
  }

  function renderList() {
    list.replaceChildren();
    slots.forEach(slot => {
      const group = document.createElement('section');
      group.className = 'routine-slot-group';
      const heading = document.createElement('h2');
      heading.textContent = slot.label;
      group.append(heading);
      const slotRoutines = routines.filter(routine => routine.slot === slot.id);
      if (!slotRoutines.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-selection';
        empty.textContent = 'No routines saved for this time.';
        group.append(empty);
      }
      slotRoutines.forEach((routine, index) => {
        const row = document.createElement('article');
        row.className = 'routine-saved-row';
        const icon = document.createElement('span');
        icon.className = 'topic-icon';
        icon.innerHTML = iconMarkup(routine.steps[0]?.icon || 'clockCalendar');
        const details = document.createElement('div');
        const name = document.createElement('h3');
        name.textContent = routine.name;
        const count = document.createElement('p');
        count.textContent = `${routine.steps.length} step${routine.steps.length === 1 ? '' : 's'}${index === 0 ? ' · Active on Daily' : ''}`;
        details.append(name, count);
        const actions = document.createElement('div');
        actions.className = 'routine-row-actions';
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'button button-secondary';
        edit.textContent = 'Edit';
        edit.addEventListener('click', () => openEditor(routine));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'button button-secondary';
        remove.textContent = 'Delete';
        remove.addEventListener('click', () => removeRoutine(routine));
        actions.append(edit, remove);
        row.append(icon, details, actions);
        group.append(row);
      });
      list.append(group);
    });
  }

  function renderSteps() {
    stepsContainer.replaceChildren();
    if (!steps.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-selection';
      empty.textContent = 'Add a step to build this routine.';
      stepsContainer.append(empty);
      return;
    }

    steps.forEach((step, index) => {
      const row = document.createElement('fieldset');
      row.className = 'routine-step-editor';
      const legend = document.createElement('legend');
      legend.textContent = `Step ${index + 1}`;
      const fields = document.createElement('div');
      fields.className = 'routine-step-fields';

      const labelWrap = document.createElement('div');
      labelWrap.className = 'field';
      const label = document.createElement('label');
      label.htmlFor = `step-label-${step.id}`;
      label.textContent = 'Step label';
      const labelInput = document.createElement('input');
      labelInput.id = label.htmlFor;
      labelInput.maxLength = 120;
      labelInput.required = true;
      labelInput.value = step.label;
      labelInput.placeholder = 'e.g. Take medicine';
      labelInput.addEventListener('input', () => { step.label = labelInput.value; });
      labelWrap.append(label, labelInput);

      const iconWrap = document.createElement('div');
      iconWrap.className = 'field';
      const iconLabel = document.createElement('label');
      iconLabel.htmlFor = `step-icon-${step.id}`;
      iconLabel.textContent = 'Icon';
      const iconSelect = document.createElement('select');
      iconSelect.id = iconLabel.htmlFor;
      iconOptions.forEach(option => {
        const choice = document.createElement('option');
        choice.value = option.id;
        choice.textContent = option.label;
        choice.selected = step.icon === option.id;
        iconSelect.append(choice);
      });
      iconSelect.addEventListener('change', () => { step.icon = iconSelect.value; });
      iconWrap.append(iconLabel, iconSelect);

      const cueWrap = document.createElement('div');
      cueWrap.className = 'field field-wide';
      const cueLabel = document.createElement('label');
      cueLabel.htmlFor = `step-cue-${step.id}`;
      cueLabel.textContent = 'Cue phrase (optional)';
      const cueInput = document.createElement('textarea');
      cueInput.id = cueLabel.htmlFor;
      cueInput.rows = 2;
      cueInput.maxLength = 300;
      cueInput.value = step.cuePhrase;
      cueInput.placeholder = 'Short phrase to use as a future voice cue';
      cueInput.addEventListener('input', () => { step.cuePhrase = cueInput.value; });
      const recordingActions = document.createElement('div');
      recordingActions.className = 'routine-cue-actions';
      const record = document.createElement('button');
      record.type = 'button';
      record.className = 'button button-secondary';
      record.textContent = step.personalRecording ? 'Re-record' : 'Record this cue';
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'button button-secondary';
      preview.textContent = 'Play preview';
      preview.hidden = !step.personalRecording;
      preview.setAttribute('aria-label', `Play personal recording for step ${index + 1}`);
      preview.addEventListener('click', () => window.ReMindVoice.fetchAndPlayPhrase(
        step.id,
        preview,
        'Personal recording is not available yet.',
        { suppressPhraseText: true }
      ));
      recordingActions.append(record, preview);

      const recording = document.createElement('div');
      recording.className = 'routine-cue-recording';
      recording.hidden = true;
      const progress = document.createElement('progress');
      progress.max = maxCueSeconds;
      progress.value = 0;
      progress.setAttribute('aria-label', 'Cue recording progress');
      const elapsed = document.createElement('span');
      const stop = document.createElement('button');
      stop.type = 'button';
      stop.className = 'button button-danger';
      stop.textContent = 'Stop';
      stop.disabled = true;
      recording.append(progress, elapsed, stop);

      const recordingStatus = document.createElement('p');
      recordingStatus.className = 'routine-cue-status';
      recordingStatus.setAttribute('role', 'status');
      recordingStatus.setAttribute('aria-live', 'polite');
      recordingStatus.textContent = step.personalRecording ? 'Personal recording saved for this step.' : '';
      const controls = { record, preview, recording, progress, elapsed, stop, status: recordingStatus };
      record.addEventListener('click', () => startStepRecording(step, controls));
      stop.addEventListener('click', () => {
        if (activeCapture?.recorder.state === 'recording') activeCapture.recorder.stop();
      });

      cueWrap.append(cueLabel, cueInput, recordingActions, recording, recordingStatus);

      fields.append(labelWrap, iconWrap, cueWrap);
      const actions = document.createElement('div');
      actions.className = 'routine-step-actions';
      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'button button-secondary';
      up.textContent = 'Move up';
      up.disabled = index === 0;
      up.setAttribute('aria-label', `Move step ${index + 1} up`);
      up.addEventListener('click', () => moveStep(index, -1));
      const down = document.createElement('button');
      down.type = 'button';
      down.className = 'button button-secondary';
      down.textContent = 'Move down';
      down.disabled = index === steps.length - 1;
      down.setAttribute('aria-label', `Move step ${index + 1} down`);
      down.addEventListener('click', () => moveStep(index, 1));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button button-secondary';
      remove.textContent = 'Remove step';
      remove.addEventListener('click', () => {
        steps.splice(index, 1);
        renderSteps();
      });
      actions.append(up, down, remove);
      row.append(legend, fields, actions);
      stepsContainer.append(row);
    });
  }

  function moveStep(index, offset) {
    const target = index + offset;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    renderSteps();
    stepsContainer.querySelectorAll('fieldset')[target]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function openEditor(routine = null) {
    editingId = routine?.id || null;
    slotInput.value = routine?.slot || 'morning';
    nameInput.value = routine?.name || '';
    steps = routine ? routine.steps.map(step => ({ ...step })) : [];
    document.querySelector('#routine-editor-heading').textContent = routine ? 'Edit routine' : 'Create a new routine';
    saveButton.textContent = routine ? 'Save changes' : 'Create routine';
    editor.hidden = false;
    renderSteps();
    editor.scrollIntoView({ block: 'start', behavior: 'smooth' });
    nameInput.focus({ preventScroll: true });
  }

  async function loadRoutines() {
    routines = await request('/api/routines');
    renderList();
  }

  async function removeRoutine(routine) {
    if (!window.confirm(`Delete “${routine.name}”?`)) return;
    try {
      await request(`/api/routines/${encodeURIComponent(routine.id)}`, { method: 'DELETE' });
      await loadRoutines();
      listMessage.textContent = 'Routine deleted.';
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  }

  async function saveRoutine(payload, routineId = null) {
    const url = routineId ? `/api/routines/${encodeURIComponent(routineId)}` : '/api/routines';
    await request(url, { method: routineId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    duplicateDialog.close();
    pendingSave = null;
    editor.hidden = true;
    form.reset();
    await loadRoutines();
    listMessage.textContent = routineId ? 'Steps added to the active routine.' : 'Routine saved.';
  }

  function showDuplicateSlotChoice(payload, activeRoutine) {
    const slotName = slots.find(slot => slot.id === payload.slot)?.label || payload.slot;
    duplicateMessage.textContent = `${slotName} already has an active routine ('${activeRoutine.name}'). Do you want to add this as a new step to that routine instead, or create a second separate ${slotName} routine?`;
    appendRoutineButton.textContent = `Add these steps to ${activeRoutine.name}`;
    separateRoutineButton.textContent = `Create a separate ${slotName} routine`;
    pendingSave = { payload, activeRoutine };
    duplicateDialog.showModal();
  }

  appendRoutineButton.addEventListener('click', async () => {
    if (!pendingSave) return;
    const { payload, activeRoutine } = pendingSave;
    const combined = {
      slot: activeRoutine.slot,
      name: activeRoutine.name,
      steps: [...activeRoutine.steps.map(step => ({ ...step })), ...payload.steps]
    };
    try {
      await saveRoutine(combined, activeRoutine.id);
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });

  separateRoutineButton.addEventListener('click', async () => {
    if (!pendingSave) return;
    try {
      await saveRoutine(pendingSave.payload);
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });

  document.querySelector('#cancel-duplicate-choice').addEventListener('click', () => {
    pendingSave = null;
    duplicateDialog.close();
  });

  document.querySelector('#add-routine').addEventListener('click', () => openEditor());
  document.querySelector('#cancel-edit').addEventListener('click', () => { editor.hidden = true; form.reset(); });
  document.querySelector('#add-step').addEventListener('click', () => {
    steps.push({ id: makeId(), label: '', icon: 'clockCalendar', cuePhrase: '' });
    renderSteps();
    stepsContainer.querySelector('fieldset:last-of-type input')?.focus();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!steps.length) {
      window.ReMind.showToast('Add at least one step to the routine.');
      return;
    }
    const payload = {
      slot: slotInput.value,
      name: nameInput.value.trim(),
      steps: steps.map(step => ({ ...step, label: step.label.trim(), cuePhrase: step.cuePhrase.trim() }))
    };
    if (!editingId) {
      const activeRoutine = routines.filter(routine => routine.slot === payload.slot)
        .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0))[0];
      if (activeRoutine) {
        showDuplicateSlotChoice(payload, activeRoutine);
        return;
      }
    }
    try {
      await saveRoutine(payload, editingId);
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });

  loadRoutines().catch(error => {
    listMessage.textContent = error.message;
    window.ReMind.showToast(error.message);
  });
})();
