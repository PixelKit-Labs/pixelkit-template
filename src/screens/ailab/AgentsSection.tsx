/**
 * @file AgentsSection.tsx
 * @description Functions this app publishes to system agents, and a control that executes each one.
 *
 * The list comes from the App Functions registry in the native module, so it is what the OS can
 * actually see rather than a description of what it might see. Executing one runs the real
 * function: the HiLight tool lights the ring, the summarize tool runs on-device.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import PixelNative, { type AppFunctionInfo } from '@pixelkit-labs/native';
import { useHaptics, useHiLight } from '@pixelkit-labs/sdk';
import { Colors, Fonts } from '../../theme/colors';
import { HapticButton } from '../../components/HapticButton';
import { MetricCard } from '../../components/MetricCard';
import { SectionHeader, StatChip } from '../../components/Decor';
import { useGenAITasks } from '@pixelkit-labs/sdk/mlkit';
import { styles } from './styles';

export const AgentsSection: React.FC<{
  hilight: ReturnType<typeof useHiLight>;
  haptics: ReturnType<typeof useHaptics>;
  genaiTasks: ReturnType<typeof useGenAITasks>;
}> = ({ hilight, haptics, genaiTasks }) => {
  const [registeredFunctions, setRegisteredFunctions] = useState<AppFunctionInfo[]>([]);
  const [functionFeedback, setFunctionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!PixelNative) return;
    try {
      setRegisteredFunctions(PixelNative.getAppFunctions());
    } catch {
      // The registry is absent in Expo Go and on web; the empty list says so.
    }
  }, []);

  /** Runs the published function for real, then reports what came back. */
  const testAppFunction = async (fn: AppFunctionInfo) => {
    haptics.playPrimitives([{ primitive: 'CLICK', scale: 1.0 }]);
    let detail = '';
    try {
      if (PixelNative?.executeAppFunction) {
        const res = await PixelNative.executeAppFunction(fn.id, { level: 15, primitive: 'thud' });
        detail = res?.message ?? res?.status ?? 'executed';
      }
      if (fn.id === 'triggerHiLightPulse') {
        hilight.triggerGeminiPulse(3000);
      } else if (fn.id === 'summarizeText') {
        await genaiTasks.summarize('PixelKit provides deep low-level hardware access to Google Pixel 11 Pro.');
      }
      setFunctionFeedback(`Executed ${fn.name} on ${fn.target}: ${detail}`);
    } catch (e: any) {
      setFunctionFeedback(`${fn.name} failed: ${e?.message ?? 'unknown error'}`);
    }
    setTimeout(() => setFunctionFeedback(null), 3500);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <MetricCard
        title="Android 17 AppFunctions"
        value={registeredFunctions.length > 0 ? `${registeredFunctions.length} published` : null}
        badge={registeredFunctions.length > 0 ? 'REGISTRY ACTIVE' : 'NOT AVAILABLE'}
        badgeColor={registeredFunctions.length > 0 ? Colors.dark.success : Colors.dark.warning}
        subtitle="Functions this app publishes to system agents such as Gemini. The list is read from the registry, not declared here."
        source={registeredFunctions.length > 0 ? 'hardware' : 'unavailable'}
      />

      {functionFeedback && (
        <View style={styles.alertSuccess}>
          <Text style={styles.alertSuccessText}>{functionFeedback}</Text>
        </View>
      )}

      <SectionHeader title="Registered agent tools" hint={registeredFunctions.length ? 'tap to execute' : 'none registered'} />
      {registeredFunctions.map(fn => (
        <View key={fn.id} style={styles.card}>
          <View style={styles.agentCardHead}>
            <Text style={styles.cardTitle}>{fn.name}</Text>
            <StatChip label={fn.category.toUpperCase()} tone="accent" />
          </View>
          <Text style={styles.cardDesc}>{fn.description}</Text>
          <View style={styles.agentCardFoot}>
            <Text style={styles.agentMeta}>
              {fn.target} · {fn.id}
            </Text>
            <HapticButton
              title="Run it"
              onPress={() => { void testAppFunction(fn); }}
              variant="outline"
              style={styles.agentRunButton}
              textStyle={{ fontSize: 11 }}
            />
          </View>
        </View>
      ))}
      {registeredFunctions.length === 0 && (
        <Text style={styles.cardDesc}>
          Nothing is registered. App Functions need a development build on Android 16 or later; in Expo Go the registry is not
          reachable and this list stays empty rather than showing examples.
        </Text>
      )}
    </ScrollView>
  );
};
