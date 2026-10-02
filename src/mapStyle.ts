// Dark Google Maps style for Android (iOS uses mapType "mutedStandard" + dark interface style).
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0b120e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5f8a70' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#030704' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#14231a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050d12' }] },
];
