/**
 * @file Decor.tsx
 * @description Shared HUD primitives: page scrims, the wordmark, the reactor (the one element that
 * glows), section labels, status chips, and telemetry rows. Colour comes from tokens only.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Gradients, Radius, Type } from '../theme/colors';
import { MODE_STYLES, type HudMode } from '../theme/mode';

/** Two faint scrims behind everything so the panels have light to refract. */
export const Scrims: React.FC = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <LinearGradient colors={[...Gradients.scrimCyan]} style={styles.scrimTop} />
    <LinearGradient colors={[...Gradients.scrimViolet]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={styles.scrimBottom} />
  </View>
);

/** Wordmark: the mark and the product name, used in the top bar. */
export const Wordmark: React.FC<{ name?: string; style?: StyleProp<ViewStyle> }> = ({ name = 'PixelKit', style }) => (
  <View style={[styles.wordmark, style]}>
    <View style={styles.mark}>
      <View style={styles.markTriangle} />
      <View style={styles.markInner} />
    </View>
    <Text style={styles.wordmarkText}>{name.toUpperCase() + (Platform.OS === 'android' ? ' ' : '')}</Text>
  </View>
);

/** Status readout: label in sans, value in mono. Tone maps to meaning, never decoration. */
export const StatChip: React.FC<{
  label?: string;
  value?: string;
  tone?: 'default' | 'accent' | 'warn' | 'danger' | 'ok';
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ label, value, tone = 'default', dot = false, style }) => {
  const color = tone === 'accent' ? Colors.dark.primary : tone === 'warn' ? Colors.dark.warning : tone === 'danger' ? Colors.dark.error : tone === 'ok' ? Colors.dark.success : Colors.dark.textMuted;
  const tinted = tone !== 'default';
  return (
    <View style={[styles.chip, tinted && { borderColor: `${color}66`, backgroundColor: `${color}1A` }, style]}>
      {dot && <View style={[styles.chipDot, { backgroundColor: color }]} />}
      {label ? <Text style={[styles.chipLabel, tinted && { color }]}>{label}</Text> : null}
      {value ? <Text style={[styles.chipValue, tinted && { color }]}>{value}</Text> : null}
    </View>
  );
};

/** Legacy alias used by screens: a small labelled chip. */
export const Chip: React.FC<{ label: string; color?: string; filled?: boolean; style?: StyleProp<ViewStyle> }> = ({ label, color = Colors.dark.textMuted, filled = false, style }) => (
  <View style={[styles.chip, { borderColor: `${color}55`, backgroundColor: filled ? `${color}33` : `${color}14` }, style]}>
    <Text style={[styles.chipValue, { color }]} numberOfLines={1}>{label}</Text>
  </View>
);

/** Section label: mono, 11 px, semibold, wide tracking, uppercase, muted. Optional right meta. */
export const SectionHeader: React.FC<{ title: string; hint?: string; style?: StyleProp<ViewStyle> }> = ({ title, hint, style }) => (
  <View style={[styles.section, style]}>
    <Text style={styles.sectionTitle}>{title.toUpperCase() + (Platform.OS === 'android' ? ' ' : '')}</Text>
    {hint ? <Text style={styles.sectionHint}>{hint + (Platform.OS === 'android' ? ' ' : '')}</Text> : null}
  </View>
);

/** Dense mono readout row with a hairline between rows. */
export const TelemetryRow: React.FC<{ label: string; value: string; tone?: 'default' | 'muted' | 'on' | 'off' | 'warn' }> = ({ label, value, tone = 'default' }) => {
  const color = tone === 'on' ? Colors.dark.success : tone === 'warn' ? Colors.dark.warning : tone === 'default' ? Colors.dark.text : Colors.dark.textMuted;
  return (
    <View style={styles.teleRow}>
      <Text style={styles.teleLabel}>{label.toUpperCase() + (Platform.OS === 'android' ? ' ' : '')}</Text>
      <Text style={[styles.teleValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
};

/** Thin concentric rings. Used by the reactor; does not glow on its own. */
export const OrbitRings: React.FC<{ size?: number; rings?: number; style?: StyleProp<ViewStyle>; color?: string }> = ({
  size = 200,
  rings = 4,
  style,
  color = Colors.dark.textMuted,
}) => (
  <View style={[{ width: size, height: size }, style]} pointerEvents="none">
    {Array.from({ length: rings }).map((_, i) => {
      const d = size - i * (size / rings) * 0.8;
      return (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: d,
            height: d,
            borderRadius: d / 2,
            borderWidth: 1,
            borderColor: color,
            opacity: 0.10 + i * 0.06,
            top: (size - d) / 2,
            left: (size - d) / 2,
          }}
        />
      );
    })}
  </View>
);

/**
 * The reactor: the one element allowed to glow. Concentric hairline rings and a core whose colour
 * and breathing speed come from the mode map. Legible from across a room without reading a word.
 */
export const Reactor: React.FC<{ mode: HudMode; size?: number; detail?: string | null }> = ({ mode, size = 168, detail }) => {
  const style = MODE_STYLES[mode];
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    breathe.stopAnimation();
    if (!style.emissive || style.breatheMs === 0) { breathe.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.55, duration: style.breatheMs / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: style.breatheMs / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, style]);

  const core = size * 0.34;
  return (
    <View style={styles.reactor}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <OrbitRings size={size} rings={4} color={style.emissive ? style.color : Colors.dark.textMuted} style={{ position: 'absolute' }} />
        {style.emissive && (
          <Animated.View style={[styles.halo, { width: core * 2.2, height: core * 2.2, borderRadius: core * 1.1, backgroundColor: `${style.color}22`, opacity: breathe }]} />
        )}
        <Animated.View style={[styles.core, { width: core, height: core, borderRadius: core / 2, backgroundColor: style.emissive ? style.color : Colors.dark.surfaceVariant, opacity: style.emissive ? breathe : 1 }]} />
      </View>
      <Text style={[styles.reactorHeadline, { color: style.color }]}>{style.headline}</Text>
      {(detail || style.hint) ? <Text style={styles.reactorHint} numberOfLines={1}>{detail || style.hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  scrimTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  scrimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 260 },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  mark: { width: 18, height: 18, alignItems: 'center', justifyContent: 'flex-end', marginRight: 10 },
  markTriangle: {
    position: 'absolute', bottom: 0, width: 0, height: 0,
    borderLeftWidth: 9, borderRightWidth: 9, borderBottomWidth: 16,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(244,245,248,0.85)',
  },
  markInner: {
    position: 'absolute', bottom: 3, width: 0, height: 0,
    borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: Colors.dark.background,
  },
  wordmarkText: { fontFamily: Fonts.sansSemi, fontSize: 13, letterSpacing: Platform.OS === 'android' ? 2.0 : 3.4, color: Colors.dark.text, paddingRight: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', height: 30, paddingHorizontal: 11, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.dark.cardBorder, backgroundColor: Colors.dark.card, gap: 6, flexShrink: 0,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { ...Type.caption, color: Colors.dark.textMuted },
  chipValue: { ...Type.mono, fontFamily: Fonts.monoMedium, color: Colors.dark.text },
  section: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: 20, marginBottom: 8, paddingHorizontal: 2,
  },
  sectionTitle: { ...Type.label, color: Colors.dark.textMuted },
  sectionHint: { ...Type.micro, color: Colors.dark.textMuted },
  teleRow: {
    flexDirection: 'row', alignItems: 'baseline', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.cardBorder,
  },
  teleLabel: { ...Type.mono, fontSize: 11, letterSpacing: Platform.OS === 'android' ? 0.4 : 1, color: Colors.dark.textMuted, flexShrink: 0, marginRight: 8 },
  teleValue: { ...Type.mono, marginLeft: 'auto', textAlign: 'right', flexShrink: 1 },
  reactor: { alignItems: 'center', paddingVertical: 8 },
  halo: { position: 'absolute' },
  core: {},
  reactorHeadline: { ...Type.label, fontSize: 12, letterSpacing: 2.2, marginTop: 6 },
  reactorHint: { ...Type.mono, fontSize: 10, letterSpacing: 0.8, color: Colors.dark.textMuted, marginTop: 3 },
});
