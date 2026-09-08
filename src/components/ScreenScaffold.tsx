/**
 * @file ScreenScaffold.tsx
 * @description The frame every screen shares: a title, a line saying what the screen is for, an
 * optional hero slot, and an optional sub-tab row driven by the app's surface map.
 *
 * Before this existed each screen invented its own header and its own tab row, so the same idea
 * looked different depending on which tab you were on. The navigation state lives with the caller;
 * this component only draws it.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, StyleProp, ViewStyle } from 'react-native';
import { Colors, Type, Radius } from '../theme/colors';
import { HapticButton } from './HapticButton';
import type { SurfaceSection } from '@pixelkit-labs/sdk';

export interface ScreenScaffoldProps {
  /** Screen name, e.g. "Sensors". */
  title: string;
  /** One line on what the screen is for. */
  subtitle?: string;
  /** Rendered above the sub-tab row: the reactor on Silicon, a search field on Docs. */
  hero?: React.ReactNode;
  /** Sub-tabs to draw; omit for a screen with a single view. */
  sections?: SurfaceSection[];
  /** Currently selected section id. */
  activeSection?: string;
  /** Called with the section id when a sub-tab is pressed. */
  onSelectSection?: (id: string) => void;
  /** Pull-to-refresh handler; omit to disable the control. */
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Screen title and the line under it. Exported so a screen that owns its own scrolling can reuse it. */
export const ScreenHeader: React.FC<{ title: string; subtitle?: string; style?: StyleProp<ViewStyle> }> = ({ title, subtitle, style }) => (
  <View style={[styles.header, style]}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

/** The sub-tab row. One control, so every screen navigates the same way. */
export const SectionTabs: React.FC<{
  sections: SurfaceSection[];
  activeSection?: string;
  onSelect: (id: string) => void;
  /** Renders the active section's blurb underneath. */
  showBlurb?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ sections, activeSection, onSelect, showBlurb = true, style }) => {
  const active = sections.find(s => s.id === activeSection);
  return (
    <View style={style}>
      <View style={styles.tabRow}>
        {sections.map(section => (
          <HapticButton
            key={section.id}
            title={section.title.toUpperCase()}
            onPress={() => onSelect(section.id)}
            hapticType="selection"
            variant={section.id === activeSection ? 'primary' : 'secondary'}
            size="sm"
            style={styles.tabButton}
            textStyle={styles.tabLabel}
          />
        ))}
      </View>
      {showBlurb && active ? <Text style={styles.blurb}>{active.blurb}</Text> : null}
    </View>
  );
};

export const ScreenScaffold: React.FC<ScreenScaffoldProps> = ({

  title,
  subtitle,
  hero,
  sections,
  activeSection,
  onSelectSection,
  onRefresh,
  refreshing = false,
  contentStyle,
  children,
}) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} /> : undefined
      }
    >
      <ScreenHeader title={title} subtitle={subtitle} />

      {hero}

      {sections && sections.length > 0 && (
        <SectionTabs sections={sections} activeSection={activeSection} onSelect={id => onSelectSection?.(id)} />
      )}

      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  content: { padding: 16, paddingBottom: 130 },
  header: { marginBottom: 12 },
  title: { ...Type.title, color: Colors.dark.text },
  subtitle: { ...Type.caption, color: Colors.dark.textMuted, marginTop: 2 },
  /** Wraps, so a six-section screen does not squeeze its labels to nothing. */
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, marginBottom: 8 },
  tabButton: { flexGrow: 1, flexBasis: '30%', paddingHorizontal: 6, borderRadius: Radius.md },
  tabLabel: { fontSize: 11 },
  blurb: { ...Type.caption, color: Colors.dark.textMuted, marginBottom: 12, marginLeft: 2 },
});
