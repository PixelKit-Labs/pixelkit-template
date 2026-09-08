/**
 * @file SensorVisualizer.tsx
 * @description Real-time 3-axis motion visualizer for Accelerometer, Gyroscope, and Magnetometer.
 * Displays centred horizontal bar graphs for X, Y, and Z axes (zero in the middle, negative to the
 * left) with tabular numeric readouts. `range` sets the full-scale magnitude so each sensor's
 * natural units fill the bar: ±2 g, ±5 rad/s, ±100 µT.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Vector3D } from '@pixelkit-labs/sdk';
import { Colors } from '../theme/colors';

/**
 * Properties for the SensorVisualizer component.
 */
export interface SensorVisualizerProps {
  /** Display label describing the sensor (e.g. "6-Axis Accelerometer") */
  label: string;
  /** Real-time 3D vector */
  vector: Vector3D;
  /** Optional unit suffix (e.g. "g", "rad/s", "μT") */
  unit?: string;
  /** Full-scale magnitude for the bars (default 10) */
  range?: number;
  /** Decimal places for the readout (default 2) */
  decimals?: number;
  /** Optional caption under the title (e.g. sensor part number) */
  caption?: string;
}

/**
 * Multi-axis telemetry graph component with color-coded X (red), Y (green), and Z (blue) bars.
 *
 * @example
 * ```tsx
 * <SensorVisualizer label="Accelerometer" vector={accelerometer} unit="g" range={2} />
 * ```
 */
export const SensorVisualizer: React.FC<SensorVisualizerProps> = ({
  label,
  vector,
  unit = '',
  range = 10,
  decimals = 2,
  caption,
}) => {
  const renderAxis = (axisLabel: string, val: number, color: string) => {
    const clamped = Math.max(-range, Math.min(range, val));
    const half = (Math.abs(clamped) / range) * 50; // percent of half-width
    const left = clamped < 0 ? 50 - half : 50;

    return (
      <View style={styles.axisRow} key={axisLabel}>
        <View style={styles.axisHeader}>
          <Text style={[styles.axisLabel, { color }]}>{axisLabel}</Text>
          <Text style={styles.axisValue}>{val.toFixed(decimals)} {unit}</Text>
        </View>
        <View style={styles.barBackground}>
          <View style={styles.centreLine} />
          <View style={[styles.barFill, { left: `${left}%`, width: `${Math.max(half, 0.5)}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{label}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {renderAxis('X', vector.x, Colors.dark.primary)}
      {renderAxis('Y', vector.y, Colors.dark.secondary)}
      {renderAxis('Z', vector.z, Colors.dark.tertiary)}
      <Text style={styles.scale}>±{range} {unit}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  caption: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  axisRow: {
    marginBottom: 10,
  },
  axisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  axisLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  axisValue: {
    fontSize: 13,
    color: Colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  barBackground: {
    height: 8,
    backgroundColor: Colors.dark.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  centreLine: {
    position: 'absolute',
    left: '50%',
    width: 1,
    height: '100%',
    backgroundColor: Colors.dark.cardBorder,
  },
  barFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 4,
  },
  scale: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    textAlign: 'right',
    marginTop: -4,
  },
});
