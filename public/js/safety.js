(function () {
  'use strict';

  const radiusInput = document.getElementById('safe-zone-radius');
  const alertsList = document.getElementById('alert-list');
  const locationStatus = document.getElementById('location-status');
  const alertBanner = document.getElementById('safety-alert-banner');
  const homeForm = document.getElementById('home-location-form');
  const homeLatitude = document.getElementById('home-latitude');
  const homeLongitude = document.getElementById('home-longitude');
  let preferences = { radiusMetres: 250, alerts: [], home: null };
  let serverAlerts = [];
  let currentPosition = null;
  let watchId = null;
  let previousOutside = false;
  if (!radiusInput || !alertsList || !homeForm) return;

  function saveSafety() {
    return window.ReMind.saveRegistration({ safetyPreferences: preferences })
      .catch((error) => window.ReMind.showToast(error.message));
  }

  function distanceBetween(first, second) {
    const radians = (degrees) => degrees * Math.PI / 180;
    const latitudeDelta = radians(second.latitude - first.latitude);
    const longitudeDelta = radians(second.longitude - first.longitude);
    const firstLatitude = radians(first.latitude);
    const secondLatitude = radians(second.latitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  function updateMap(distance = null) {
    window.ReMindGeofenceMap.update(
      preferences.home ? { lat: preferences.home.latitude, lng: preferences.home.longitude } : null,
      currentPosition ? { lat: currentPosition.latitude, lng: currentPosition.longitude } : null,
      Number(preferences.radiusMetres),
      distance
    );
  }

  function renderAlerts() {
    alertsList.replaceChildren();
    const alerts = [...serverAlerts, ...preferences.alerts];
    if (!alerts.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-selection';
      empty.textContent = 'No recent alerts.';
      alertsList.append(empty);
      return;
    }
    alerts.slice().reverse().slice(0, 8).forEach((alert) => {
      const item = document.createElement('article');
      item.className = 'schedule-card';
      const message = document.createElement('h3');
      message.textContent = alert.message;
      const time = document.createElement('p');
      time.textContent = new Date(alert.createdAt).toLocaleString();
      item.append(message, time);
      alertsList.append(item);
    });
  }

  function handlePosition(position) {
    currentPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
    if (!preferences.home) {
      locationStatus.textContent = `Current location updated at ${new Date().toLocaleTimeString()}. Set a home location to enable the safe zone.`;
      updateMap();
      return;
    }
    const distance = distanceBetween(preferences.home, currentPosition);
    const outside = distance > Number(preferences.radiusMetres);
    updateMap(distance);
    locationStatus.textContent = `${Math.round(distance)} metres from home · ${outside ? 'outside' : 'inside'} the safe zone.`;
    alertBanner.hidden = !outside;
    if (outside) {
      alertBanner.textContent = `Safe-zone alert: current location is ${Math.round(distance)} metres from home.`;
      if (!previousOutside) {
        fetch('/api/safety/alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ latitude: currentPosition.latitude, longitude: currentPosition.longitude, distanceMetres: distance })
        }).then(async (response) => {
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || 'The safety alert could not be saved.');
          serverAlerts.push(result);
          serverAlerts = serverAlerts.slice(-20);
          renderAlerts();
        }).catch((error) => window.ReMind.showToast(error.message));
      }
    }
    previousOutside = outside;
  }

  function handleLocationError(error) {
    locationStatus.textContent = error.code === error.PERMISSION_DENIED
      ? 'Location permission was denied. Allow location access to monitor the safe zone.'
      : 'Location is temporarily unavailable. Keep this page open and try again.';
  }

  document.getElementById('locate-phone').addEventListener('click', (event) => {
    if (!navigator.geolocation) {
      locationStatus.textContent = 'Location is not available in this browser.';
      return;
    }
    const button = event.currentTarget;
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      button.textContent = 'Start location monitoring';
      locationStatus.textContent = 'Location monitoring stopped.';
      return;
    }
    locationStatus.textContent = 'Waiting for location permission and GPS…';
    watchId = navigator.geolocation.watchPosition(handlePosition, handleLocationError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 5000
    });
    button.textContent = 'Stop location monitoring';
  });

  function setHome(latitude, longitude) {
    preferences.home = { latitude, longitude };
    homeLatitude.value = latitude;
    homeLongitude.value = longitude;
    saveSafety();
    previousOutside = false;
    updateMap(currentPosition ? distanceBetween(preferences.home, currentPosition) : null);
    if (currentPosition) handlePosition({ coords: currentPosition });
    window.ReMind.showToast('Home location saved for this session.');
  }

  homeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!homeForm.reportValidity()) return;
    setHome(Number(homeLatitude.value), Number(homeLongitude.value));
  });

  document.getElementById('use-current-home').addEventListener('click', () => {
    if (!currentPosition) {
      locationStatus.textContent = 'Start location monitoring first to use this phone as home.';
      return;
    }
    setHome(currentPosition.latitude, currentPosition.longitude);
  });

  radiusInput.addEventListener('change', () => {
    preferences.radiusMetres = Math.max(50, Math.min(5000, Number(radiusInput.value) || 250));
    radiusInput.value = preferences.radiusMetres;
    saveSafety();
    if (currentPosition && preferences.home) handlePosition({ coords: currentPosition });
  });
  document.getElementById('sos-button').addEventListener('click', () => {
    preferences.alerts.push({ message: 'SOS request recorded on this phone', createdAt: new Date().toISOString() });
    preferences.alerts = preferences.alerts.slice(-20);
    renderAlerts();
    saveSafety();
    window.ReMind.showToast('SOS request recorded. This build does not contact emergency services.');
  });

  window.ReMind.fetchSession().then((data) => {
    if (data.safetyPreferences) preferences = { ...preferences, ...data.safetyPreferences, alerts: data.safetyPreferences.alerts || [] };
    serverAlerts = data.safetyAlerts || [];
    radiusInput.value = preferences.radiusMetres;
    if (preferences.home) {
      homeLatitude.value = preferences.home.latitude;
      homeLongitude.value = preferences.home.longitude;
    }
    renderAlerts();
    window.ReMindGeofenceMap.initialize();
    updateMap();
  }).catch((error) => window.ReMind.showToast(error.message));

  // Browser geolocation runs only while this tab is open; background tracking would require a native mobile app.
})();
