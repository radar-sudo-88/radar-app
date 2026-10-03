import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MarkerView } from '@maplibre/maplibre-react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  hex: string;
  lat: number;
  lon: number;
  heading: number;
  color: string;
  label: string;
  selected: boolean;
  nearest: boolean;
  accent: string;
  onPress: (hex: string) => void;
}

// Nose-up plane glyph, rotated with a view transform so the callsign label stays upright.
const PLANE = 'M12 1.5 L13.7 8.6 L22 13.4 L22 15.6 L13.9 13 L13.5 19 L16 20.8 L16 22.2 L12 21.2 L8 22.2 L8 20.8 L10.5 19 L10.1 13 L2 15.6 L2 13.4 L10.3 8.6 Z';

const W = 96;
const ICON = 44;
const LABEL_H = 22;
const H = ICON + LABEL_H;

function PlaneMarkerBase({ hex, lat, lon, heading, color, label, selected, nearest, accent, onPress }: Props) {
  const hdg = Math.round(heading / 5) * 5;
  const size = selected ? 34 : nearest ? 30 : 24;
  return (
    <MarkerView
      id={`ac-${hex}`}
      coordinate={[lon, lat]}
      // The view is ICON + label tall; anchor on the plane icon's centre (not the view's centre) so it sits on the coordinate.
      anchor={{ x: 0.5, y: ICON / 2 / H }}
      allowOverlap
    >
      <Pressable onPress={() => onPress(hex)} hitSlop={8} style={{ width: W, height: H, alignItems: 'center' }}>
        <View
          style={{
            width: ICON,
            height: ICON,
            borderRadius: ICON / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: nearest || selected ? 2 : 0,
            borderColor: selected ? '#ffffff' : accent,
            backgroundColor: nearest || selected ? 'rgba(0,0,0,0.45)' : 'transparent',
          }}
        >
          <View style={{ transform: [{ rotate: `${hdg}deg` }] }}>
            <Svg width={size} height={size} viewBox="0 0 24 24">
              <Path d={PLANE} fill={color} stroke="#050505" strokeWidth={1} strokeLinejoin="round" />
            </Svg>
          </View>
        </View>
        <View
          style={{
            marginTop: 2,
            paddingHorizontal: 5,
            paddingVertical: 1,
            borderRadius: 5,
            backgroundColor: nearest ? accent : 'rgba(0,0,0,0.65)',
          }}
        >
          <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: nearest ? '#050505' : color }}>
            {nearest ? `◉ ${label}` : label}
          </Text>
        </View>
      </Pressable>
    </MarkerView>
  );
}

export const PlaneMarker = memo(PlaneMarkerBase);
