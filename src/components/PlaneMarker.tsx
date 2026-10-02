import React, { memo, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';

interface Props {
  hex: string;
  lat: number;
  lon: number;
  heading: number;
  color: string;
  selected: boolean;
  onPress: (hex: string) => void;
}

// Nose-up plane glyph; Marker.rotation turns it onto the aircraft's track.
const PLANE = 'M12 1.5 L13.7 8.6 L22 13.4 L22 15.6 L13.9 13 L13.5 19 L16 20.8 L16 22.2 L12 21.2 L8 22.2 L8 20.8 L10.5 19 L10.1 13 L2 15.6 L2 13.4 L10.3 8.6 Z';

function PlaneMarkerBase({ hex, lat, lon, heading, color, selected, onPress }: Props) {
  // Custom marker views are re-rasterised only while tracksViewChanges is on, so
  // leave it on briefly after each colour/selection change, then switch it off.
  const [track, setTrack] = useState(true);
  useEffect(() => {
    setTrack(true);
    const t = setTimeout(() => setTrack(false), 400);
    return () => clearTimeout(t);
  }, [color, selected]);

  const size = selected ? 34 : 26;
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lon }}
      rotation={heading}
      flat
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={track}
      onPress={() => onPress(hex)}
      zIndex={selected ? 10 : 1}
    >
      <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={PLANE} fill={color} stroke={selected ? '#ffffff' : '#050505'} strokeWidth={selected ? 1.4 : 1} strokeLinejoin="round" />
        </Svg>
      </View>
    </Marker>
  );
}

export const PlaneMarker = memo(PlaneMarkerBase);
