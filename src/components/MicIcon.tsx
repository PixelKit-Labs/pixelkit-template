/**
 * @file MicIcon.tsx
 * @description Microphone icon component rendered as vector SVG on web and crisp geometric
 * primitives on native. Avoids unbundled icon font dependencies while guaranteeing pixel-exact
 * rendering and zero latency.
 */

import React from 'react';
import { View, Platform, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';

export interface MicIconProps {
  size?: number;
  color?: string;
  isListening?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const MicIcon: React.FC<MicIconProps> = ({
  size = 20,
  color = Colors.dark.primary,
  isListening = false,
  style,
}) => {
  if (Platform.OS === 'web') {
    if (isListening) {
      return (
        <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
          <svg width={Math.round(size * 0.75)} height={Math.round(size * 0.75)} viewBox="0 0 24 24" fill={color}>
            <rect x="4" y="4" width="16" height="16" rx="3" />
          </svg>
        </View>
      );
    }
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
          <line x1="8" x2="16" y1="22" y2="22" />
        </svg>
      </View>
    );
  }

  // Native geometric fallback (independent of bundled icon fonts)
  if (isListening) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <View
          style={{
            width: Math.round(size * 0.55),
            height: Math.round(size * 0.55),
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      </View>
    );
  }

  const capsuleW = Math.round(size * 0.36);
  const capsuleH = Math.round(size * 0.52);
  const arcW = Math.round(size * 0.66);
  const arcH = Math.round(size * 0.44);
  const stemH = Math.max(3, Math.round(size * 0.22));
  const baseW = Math.round(size * 0.44);

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Microphone Capsule */}
      <View
        style={{
          position: 'absolute',
          top: Math.round(size * 0.08),
          width: capsuleW,
          height: capsuleH,
          borderRadius: Math.round(capsuleW / 2),
          backgroundColor: color,
        }}
      />
      {/* Sound pickup cradle arc */}
      <View
        style={{
          position: 'absolute',
          top: Math.round(size * 0.22),
          width: arcW,
          height: arcH,
          borderBottomLeftRadius: Math.round(arcW / 2),
          borderBottomRightRadius: Math.round(arcW / 2),
          borderWidth: 2,
          borderTopWidth: 0,
          borderColor: color,
        }}
      />
      {/* Vertical stand stem */}
      <View
        style={{
          position: 'absolute',
          bottom: Math.round(size * 0.1),
          width: 2,
          height: stemH,
          backgroundColor: color,
        }}
      />
      {/* Stand base plate */}
      <View
        style={{
          position: 'absolute',
          bottom: Math.round(size * 0.08),
          width: baseW,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
    </View>
  );
};
