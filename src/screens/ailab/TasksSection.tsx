/**
 * @file TasksSection.tsx
 * @description Summarize, proofread, rewrite and describe, all through ML Kit GenAI on AICore.
 *
 * Nothing here leaves the phone. Each result carries the latency the native call measured and the
 * engine that produced it, so "on-device" is a reading rather than a claim.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useHaptics } from 'pixelkit';
import { Colors } from '../../theme/colors';
import { HapticButton } from '../../components/HapticButton';
import { MetricCard } from '../../components/MetricCard';
import { SectionHeader, StatChip } from '../../components/Decor';
import { useGeminiNano, useGenAITasks, useVisionAI, type TaskTone } from 'pixelkit/mlkit';
import { styles } from './styles';

type GenAITaskKind = 'summarize' | 'proofread' | 'rewrite' | 'describe';

export const TasksSection: React.FC<{
  genaiTasks: ReturnType<typeof useGenAITasks>;
  nano: ReturnType<typeof useGeminiNano>;
  vision: ReturnType<typeof useVisionAI>;
  haptics: ReturnType<typeof useHaptics>;
  signalThinking: () => void;
}> = ({ genaiTasks, nano, vision, haptics, signalThinking }) => {
  const [genaiKind, setGenaiKind] = useState<GenAITaskKind>('summarize');
  const [taskInputText, setTaskInputText] = useState(
    'The Google Tensor G6 in the Pixel 11 Pro runs Gemini Nano through AICore, so summarising, proofreading and rewriting all happen on the phone with no network round trip.',
  );
  const [summarizeBullets, setSummarizeBullets] = useState<'one_bullet' | 'two_bullets' | 'three_bullets'>('two_bullets');
  const [rewriteTone, setRewriteTone] = useState<TaskTone>('professional');

  const runSelectedGenAITask = async () => {
    if (!taskInputText.trim()) return;
    signalThinking();
    if (genaiKind === 'summarize') {
      await genaiTasks.summarize(taskInputText, { outputType: summarizeBullets });
    } else if (genaiKind === 'proofread') {
      await genaiTasks.proofread(taskInputText);
    } else if (genaiKind === 'rewrite') {
      await genaiTasks.rewrite(taskInputText, rewriteTone);
    } else if (genaiKind === 'describe') {
      // Reuse the image already picked on the Vision tab when there is one.
      if (vision.selectedImageBase64) {
        await genaiTasks.describeImage(vision.selectedImageBase64, 'concise');
      } else {
        const picked = await vision.pickImage(false);
        if (picked?.base64) await genaiTasks.describeImage(picked.base64, 'concise');
      }
    }
    haptics.playPrimitives([{ primitive: 'CLICK', scale: 1.0 }]);
  };

  return (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <MetricCard
            title="On-device GenAI Tasks"
            value={nano.isAvailable ? 'ML Kit Ready' : nano.status}
            badge="AICORE TASK API"
            badgeColor={nano.isAvailable ? Colors.dark.success : Colors.dark.warning}
            subtitle="Dedicated Task Clients for Summarization, Proofreading, Rewriting & Image Description"
            source={nano.source}
          />
  
          <View style={styles.taskSelector}>
            {(['summarize', 'proofread', 'rewrite', 'describe'] as GenAITaskKind[]).map(kind => (
              <TouchableOpacity
                key={kind}
                style={[styles.taskPill, genaiKind === kind && styles.taskPillActive]}
                onPress={() => {
                  haptics.playPrimitives([{ primitive: 'CLICK', scale: 0.6 }]);
                  setGenaiKind(kind);
                }}
              >
                <Text style={[styles.taskPillText, genaiKind === kind && styles.taskPillTextActive]}>
                  {kind.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
  
          {/* Task Parameters */}
          {genaiKind === 'summarize' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Summarization Format</Text>
              <View style={styles.optionRow}>
                {(['one_bullet', 'two_bullets', 'three_bullets'] as const).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionPill, summarizeBullets === opt && styles.optionPillActive]}
                    onPress={() => setSummarizeBullets(opt)}
                  >
                    <Text style={[styles.optionPillText, summarizeBullets === opt && styles.optionPillTextActive]}>
                      {opt.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
  
          {genaiKind === 'rewrite' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tone & Style Transformation</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRow}>
                {(['elaborate', 'emojify', 'shorten', 'friendly', 'professional', 'rephrase'] as TaskTone[]).map(tone => (
                  <TouchableOpacity
                    key={tone}
                    style={[styles.optionPill, rewriteTone === tone && styles.optionPillActive]}
                    onPress={() => setRewriteTone(tone)}
                  >
                    <Text style={[styles.optionPillText, rewriteTone === tone && styles.optionPillTextActive]}>
                      {tone.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
  
          {/* Text Input Box */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.cardTitle}>{genaiKind === 'describe' ? 'Image Input' : 'Input Text'}</Text>
              {genaiKind !== 'describe' && (
                <TouchableOpacity
                  onPress={() => {
                    setTaskInputText(
                      genaiKind === 'proofread'
                        ? 'The device have 8gb of memory and it run really good when test is executed.'
                        : 'The Tensor G6 processor inside the Pixel 11 Pro features an all-new high efficiency CPU cluster, paired with next-generation TPU hardware acceleration. Combined with Android 17, on-device Gemini Nano execution achieves sub-50ms latency for streaming tokens while operating within thermal frame budgets.'
                    );
                  }}
                >
                  <Text style={{ color: Colors.dark.primary, fontSize: 12, fontWeight: '600' }}>Load Sample</Text>
                </TouchableOpacity>
              )}
            </View>
  
            {genaiKind !== 'describe' ? (
              <TextInput
                style={styles.textInputArea}
                value={taskInputText}
                onChangeText={setTaskInputText}
                multiline
              />
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                {vision.selectedImageUri ? (
                  <Image source={{ uri: vision.selectedImageUri }} style={styles.previewImage} />
                ) : (
                  <Text style={styles.cardDesc}>Select an image below to describe on-device.</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <HapticButton title="Camera" onPress={() => vision.pickImage(true)} variant="outline" style={{ flex: 1 }} />
                  <HapticButton title="Gallery" onPress={() => vision.pickImage(false)} variant="secondary" style={{ flex: 1 }} />
                </View>
              </View>
            )}
  
            <HapticButton
              title={genaiTasks.isRunning ? 'Processing locally on TPU…' : `Run On-Device ${genaiKind.toUpperCase()}`}
              onPress={runSelectedGenAITask}
              disabled={genaiTasks.isRunning}
              variant="primary"
              style={{ marginTop: 12 }}
            />
          </View>
  
          {genaiTasks.error && (
            <View style={styles.alertError}><Text style={styles.alertErrorText}>{genaiTasks.error}</Text></View>
          )}
  
          {/* Outputs */}
          {genaiTasks.summaryResult && genaiKind === 'summarize' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Summary Result</Text>
                <StatChip label="Latency" value={`${genaiTasks.summaryResult.latencyMs} ms`} tone="accent" />
              </View>
              <Text style={styles.outputResultText}>{genaiTasks.summaryResult.summary}</Text>
              <Text style={styles.outputMetaText}>
                Engine: {genaiTasks.summaryResult.engine} • Hardware: Tensor G6 TPU • Provenance: {genaiTasks.summaryResult.source}
              </Text>
            </View>
          )}
  
          {genaiTasks.proofreadResult && genaiKind === 'proofread' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Corrected Text</Text>
                <StatChip label="Latency" value={`${genaiTasks.proofreadResult.latencyMs} ms`} tone="accent" />
              </View>
              <Text style={styles.outputResultText}>{genaiTasks.proofreadResult.correctedText}</Text>
              <Text style={styles.outputMetaText}>
                Engine: {genaiTasks.proofreadResult.engine} • Hardware: Tensor G6 TPU • Provenance: {genaiTasks.proofreadResult.source}
              </Text>
            </View>
          )}
  
          {genaiTasks.rewriteResult && genaiKind === 'rewrite' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Rewritten Output ({rewriteTone})</Text>
                <StatChip label="Latency" value={`${genaiTasks.rewriteResult.latencyMs} ms`} tone="accent" />
              </View>
              <Text style={styles.outputResultText}>{genaiTasks.rewriteResult.rewrittenText}</Text>
              <Text style={styles.outputMetaText}>
                Engine: {genaiTasks.rewriteResult.engine} • Hardware: Tensor G6 TPU • Provenance: {genaiTasks.rewriteResult.source}
              </Text>
            </View>
          )}
  
          {genaiTasks.imageDescriptionResult && genaiKind === 'describe' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Image Description</Text>
                <StatChip label="Latency" value={`${genaiTasks.imageDescriptionResult.latencyMs} ms`} tone="accent" />
              </View>
              <Text style={styles.outputResultText}>{genaiTasks.imageDescriptionResult.description}</Text>
              <Text style={styles.outputMetaText}>
                Engine: {genaiTasks.imageDescriptionResult.engine} • Hardware: Tensor G6 TPU • Provenance: {genaiTasks.imageDescriptionResult.source}
              </Text>
            </View>
          )}
        </ScrollView>
  );
};
