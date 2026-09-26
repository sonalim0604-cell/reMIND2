(function () {
  'use strict';

  const mapElement = document.getElementById('map-placeholder');
  if (!mapElement) return;

  let map = null;
  let homeMarker = null;
  let currentMarker = null;
  let geofenceCircle = null;
  let directionsService = null;
  let directionsRenderer = null;
  let lastRouteOutside = false;
  let state = { home: null, current: null, radius: 250, distance: null };
  let mapUnavailable = false;

  function renderFallback() {
    mapElement.replaceChildren();
    const content = document.createElement('div');
    content.className = 'map-fallback-content';
    const message = document.createElement('p');
    if (mapUnavailable) message.textContent = 'Google Maps is not configured. Distance from home is shown below.';
    else message.textContent = state.home ? 'Waiting for current location.' : 'Set a home location to view the safe zone.';
    if (Number.isFinite(state.distance)) {
      const distance = document.createElement('p');
      distance.textContent = `${Math.round(state.distance)} metres from home`;
      content.append(message, distance);
    } else {
      content.append(message);
    }
    mapElement.append(content);
  }

  function updateMap() {
    if (!map) {
      renderFallback();
      return;
    }
    const center = state.home || state.current;
    if (center) map.setCenter(center);
    if (!homeMarker) homeMarker = new google.maps.Marker({ map, title: 'Home' });
    if (!currentMarker) currentMarker = new google.maps.Marker({ map, title: 'Current location' });
    if (!geofenceCircle) geofenceCircle = new google.maps.Circle({ map, fillColor: '#377fc7', fillOpacity: 0.12, strokeColor: '#2565a8', strokeOpacity: 0.8, strokeWeight: 2 });
    homeMarker.setPosition(state.home);
    homeMarker.setVisible(Boolean(state.home));
    currentMarker.setPosition(state.current);
    currentMarker.setVisible(Boolean(state.current));
    geofenceCircle.setCenter(state.home);
    geofenceCircle.setRadius(state.radius);
    geofenceCircle.setVisible(Boolean(state.home));

    const isOutside = Number.isFinite(state.distance) && state.distance > state.radius;
    if (isOutside && state.home && state.current && !lastRouteOutside) {
      directionsService.route({
        origin: state.current,
        destination: state.home,
        travelMode: google.maps.TravelMode.WALKING
      }).then((result) => directionsRenderer.setDirections(result)).catch(() => {});
    } else if (!isOutside && lastRouteOutside) {
      directionsRenderer.set('directions', null);
    }
    lastRouteOutside = isOutside;
  }

  function initMap() {
    mapElement.replaceChildren();
    map = new google.maps.Map(mapElement, {
      center: state.home || state.current || { lat: 0, lng: 0 },
      zoom: state.home || state.current ? 14 : 2,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ map, suppressMarkers: true, preserveViewport: true });
    updateMap();
  }

  window.initReMindMap = initMap;
  window.ReMindGeofenceMap = Object.freeze({
    initialize: async function () {
      try {
        const response = await fetch('/api/config', { credentials: 'same-origin' });
        const config = await response.json();
        if (!response.ok || !config.googleMapsApiKey) {
          mapUnavailable = true;
          renderFallback();
          return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.googleMapsApiKey)}&callback=initReMindMap`;
        script.async = true;
        script.onerror = () => { mapUnavailable = true; renderFallback(); };
        document.head.append(script);
      } catch {
        mapUnavailable = true;
        renderFallback();
      }
    },
    update: function (home, current, radius, distance) {
      state = { home, current, radius, distance };
      updateMap();
    }
  });
  renderFallback();
})();