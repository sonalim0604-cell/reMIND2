# reMIND

reMIND is a phone-first app that supports a person with early-to-moderate Alzheimer's disease in keeping their own daily routine, while helping caregivers, family, and clinicians stay informed.

## Setup

Requires Node.js 18 or newer.

```sh
npm install
```

Copy `.env.example` to `.env` and set a long, random `SESSION_SECRET` for deployments. A development fallback is used when no secret is supplied.

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). Registration and care-plan data are held in the Express session. The default session store is for local development, not production deployment.

## Registration

1. **Patient details** collects a name, date of birth and editable age, contact number, and address. Country selection updates the state or region list.
2. **Caretaker or family contact** collects a name, contact number, and relationship. Choosing Yes to audio consent reveals an optional familiar nickname.
3. **Helping points** offers optional daily reminders, medication reminders, specific tasks, exercise, nostalgic songs, and little learnings.
4. **Topic details** displays an optional note for each selected helping point and completes registration.

Each step saves to the current session. Questionnaire and note changes update the existing registration object.

## Screens

- **Home** shows the selected helping points and their notes, links to the app screens, and the consent-gated audio recording state.
- **Profile** displays the patient, address, caretaker, consent, topic, and audio details read-only.
- **Edit helping points** combines topic selection and topic notes in one reusable editor.
- **Daily routine** provides independent Morning, Afternoon, and Night recall practice with progress, answer choices, and separate interval/cue state. Familiar voice cues use pre-generated, cached phrase clips when available and readable text otherwise.
- **Activities** presents routine sequencing, What's missing?, Matching pairs, Sort into groups, Rhythm tap-along, and Then & now. Reminiscence uses generic era photos only, never personal photos.
- **Reminders** groups routine, medication, and activity reminders by time of day. Medication entries are flagged for caregiver confirmation.
- **Safety** offers browser GPS monitoring, a configurable home location and safe-zone radius, a map with directions when configured, and an SOS log. Location tracking stops when the browser tab is closed or suspended; the demo SOS does not contact emergency services.
- **Family access** manages care contacts and notification preferences. SOS stays enabled, and unacknowledged alerts are described as escalating to the next contact after 15 minutes.
- **Caregiver dashboard** summarizes locally stored routine sessions, intervals, streaks, prompts needed, cue levels, medication, and activity notes; report export downloads JSON.
- **Clinician view** edits start interval, multiplier, and cue-fade criteria, lists suggested outcome scales, and exports the registration report as JSON.
- **Settings** saves language, text size, volume, vibration preference, and a manual cue-level override. Hindi is selectable; translations and actual cue audio are not implemented in this build.

## Voice cloning setup

Set `ELEVENLABS_API_KEY` in `.env` to enable voice cloning. With audio consent enabled, a family member can upload a voice sample; around one minute of clear sample audio is a useful starting point for ElevenLabs voice cloning. After upload, reMIND generates the reminder phrases once and caches the audio under `audio-cache/<session>/`, then plays those cached clips on schedule instead of making a live API request for every reminder. Raw family recordings remain in `uploads/`.

If cloning is not working on demo day, open `phrase-upload.html` and upload a pre-recorded clip for each exact phrase needed. Those clips are saved into the same phrase cache and use the same playback path, so the rest of the app does not need to change. Without an ElevenLabs key or cached clip, playback displays the phrase as text.

## Location & geofencing setup

The safety screen uses `navigator.geolocation.watchPosition()` for live browser location updates, so it works for a demo on a real device when location permission is granted and the site is served from a secure context (localhost is also allowed by browsers). Set `GOOGLE_MAPS_API_KEY` in `.env` to enable the embedded Google map and route directions; without it, the screen still shows the distance from home. This is NOT background tracking: the browser tab must remain open and active for location updates. A production version that needs background tracking would require a native mobile app.

## Notification limitations

- **In-tab polling (built):** reMIND checks routine and reminder times while a Home, Daily, or Reminders tab remains open. Browser notifications require permission; an in-app banner is shown as a fallback. Closed tabs cannot run the scheduler.
- **PWA + Push API (upgrade path):** a service worker and push subscription could deliver notifications while the web app is closed, subject to browser and platform support.
- **Native app (most reliable):** a mobile app with operating-system local notifications is the most dependable option for reminders that must work in the background.

## Future auth options (not built)

If stronger sign-in is needed later, Firebase Phone Auth or email OTP through a service such as Resend could be added; neither phone verification nor OTP is built in this app.

The app is a prototype: reminder delivery, real emergency escalation, background location checks, and production persistence/authentication are not implemented. The Express in-memory session store is not suitable for production.
