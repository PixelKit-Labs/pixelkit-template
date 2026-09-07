/**
 * @file MetricCard.tsx
 * @description A headline number on a panel. Panel material: white wash, hairline border, 1 px
 * specular top edge. Label and badge in mono; value in sans. The optional provenance tag
 * (HW / DERIVED / N/A) is how the UI stays honest about where a number came from.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Radius, Type } from '../theme/colors';
import type { TelemetrySource } from 'pixelkit';

export interface MetricCardProps {
  title: string;
  /** `null`/`undefined` renders as "—" */
  value: string | number | null | undefined;
  unit?: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  source?: TelemetrySource;
  /** Larger value for a hero tile */
  emphasis?: boolean;
}

const SOURCE_STYLE: Record<TelemetrySource, { label: string; color: string }> = {
  hardware: { label: 'HW', color: Colors.dark.success },
  derived: { label: 'DERIVED', color: Colors.dark.primary },
  unavailable: { label: 'N/A', color: Colors.dark.error },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  badge,
  badgeColor = Colors.dark.primary,
  icon,
  source,
  emphasis = false,
}) => {
  const display = value === null || value === undefined ? '—' : value;
  const src = source ? SOURCE_STYLE[source] : null;
  const isLongText = typeof display === 'string' && display.length > 18;
  return (
    <View style={styles.card}>
      <View style={styles.specular} pointerEvents="none" />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon}
          <Text style={[styles.title, { marginLeft: icon ? 6 : 0 }]} numberOfLines={2}>{title.toUpperCase()}</Text>
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: `${badgeColor}1F`, borderColor: `${badgeColor}55` }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]} numberOfLines={1}>{badge}</Text>
          </View>
        )}
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, emphasis && styles.valueEmphasis, isLongText && styles.valueText]}>{display}</Text>
        {unit && display !== '—' && <Text style={styles.unit}>{unit}</Text>}
      </View>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {src && (
        <View style={styles.footer}>
          <View style={[styles.sourceDot, { backgroundColor: src.color }]} />
          <Text style={[styles.sourceText, { color: src.color }]}>{src.label}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.dark.specular,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    ...Type.label,
    color: Colors.dark.textMuted,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    maxWidth: '100%',
  },
  badgeText: {
    ...Type.micro,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  value: {
    ...Type.value,
    color: Colors.dark.text,
  },
  valueEmphasis: {
    fontSize: 40,
    letterSpacing: -1,
  },
  valueText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  },
  unit: {
    ...Type.mono,
    color: Colors.dark.textMuted,
    marginLeft: 6,
  },
  subtitle: {
    ...Type.caption,
    color: Colors.dark.textMuted,
    marginTop: 5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  sourceText: {
    ...Type.micro,
    fontSize: 9,
  },
});
