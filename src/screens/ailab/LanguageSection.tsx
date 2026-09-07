/**
 * @file LanguageSection.tsx
 * @description Offline translation, language identification, smart reply and entity extraction.
 *
 * Every model here runs on the phone. The first translation for a language pair downloads that
 * model, so it is slower than the ones after it.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useHaptics } from 'pixelkit';
import { Colors } from '../../theme/colors';
import { HapticButton } from '../../components/HapticButton';
import { MetricCard } from '../../components/MetricCard';
import { SectionHeader, StatChip } from '../../components/Decor';
import { useNaturalLanguageAI } from 'pixelkit/mlkit';
import { styles } from './styles';

type NLPDemoKind = 'translate' | 'langid' | 'smartreply' | 'entities';

export const LanguageSection: React.FC<{
  nlp: ReturnType<typeof useNaturalLanguageAI>;
  haptics: ReturnType<typeof useHaptics>;
  signalThinking: () => void;
}> = ({ nlp, haptics, signalThinking }) => {
  const [nlpKind, setNlpKind] = useState<NLPDemoKind>('translate');
  const [nlpInputText, setNlpInputText] = useState('PixelKit delivers zero-latency on-device intelligence directly on Tensor G6.');
  const [targetLang, setTargetLang] = useState<'es' | 'fr' | 'de' | 'ja'>('es');

  const runNLPAction = async () => {
    if (!nlpInputText.trim()) return;
    signalThinking();
    if (nlpKind === 'translate') {
      await nlp.translate(nlpInputText, 'en', targetLang);
    } else if (nlpKind === 'langid') {
      await nlp.identifyLanguage(nlpInputText);
    } else if (nlpKind === 'smartreply') {
      await nlp.suggestReplies([
        { text: 'Hey, are you able to test the new Tensor G6 features today?', isLocalUser: false },
        { text: nlpInputText, isLocalUser: false },
      ]);
    } else if (nlpKind === 'entities') {
      await nlp.extractEntities(nlpInputText);
    }
    haptics.playPrimitives([{ primitive: 'CLICK', scale: 1.0 }]);
  };

  return (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <MetricCard
            title="On-Device Natural Language"
            value="ML Kit NLP Engine"
            badge="OFFLINE 58-LANG"
            badgeColor={Colors.dark.success}
            subtitle="Offline Translation, Language Identification, Smart Reply & Entity Extraction"
            source="hardware"
          />
  
          <View style={styles.taskSelector}>
            {(['translate', 'langid', 'smartreply', 'entities'] as NLPDemoKind[]).map(kind => (
              <TouchableOpacity
                key={kind}
                style={[styles.taskPill, nlpKind === kind && styles.taskPillActive]}
                onPress={() => {
                  haptics.playPrimitives([{ primitive: 'CLICK', scale: 0.6 }]);
                  setNlpKind(kind);
                }}
              >
                <Text style={[styles.taskPillText, nlpKind === kind && styles.taskPillTextActive]}>
                  {kind.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
  
          {/* Language Selection for Translation */}
          {nlpKind === 'translate' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Target Language</Text>
              <View style={styles.optionRow}>
                {[
                  { code: 'es', label: 'SPANISH' },
                  { code: 'fr', label: 'FRENCH' },
                  { code: 'de', label: 'GERMAN' },
                  { code: 'ja', label: 'JAPANESE' },
                ].map(l => (
                  <TouchableOpacity
                    key={l.code}
                    style={[styles.optionPill, targetLang === l.code && styles.optionPillActive]}
                    onPress={() => setTargetLang(l.code as any)}
                  >
                    <Text style={[styles.optionPillText, targetLang === l.code && styles.optionPillTextActive]}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
  
          {/* Input Box */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.cardTitle}>Input Text</Text>
              <TouchableOpacity
                onPress={() => {
                  if (nlpKind === 'translate') {
                    setNlpInputText('PixelKit delivers zero-latency on-device intelligence directly on Tensor G6.');
                  } else if (nlpKind === 'langid') {
                    setNlpInputText('Bonjour le monde! Nous développons pour Pixel 11 Pro.');
                  } else if (nlpKind === 'smartreply') {
                    setNlpInputText('Yes, the build is compiled and ready for review on device.');
                  } else if (nlpKind === 'entities') {
                    setNlpInputText('Meeting at 1600 Amphitheatre Pkwy on Friday at 3pm. Flight UA426 costs $450.');
                  }
                }}
              >
                <Text style={{ color: Colors.dark.primary, fontSize: 12, fontWeight: '600' }}>Load Sample</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInputArea}
              value={nlpInputText}
              onChangeText={setNlpInputText}
              multiline
            />
            <HapticButton
              title={nlp.isProcessing ? 'Processing on-device…' : `Run Offline ${nlpKind.toUpperCase()}`}
              onPress={runNLPAction}
              disabled={nlp.isProcessing || !nlpInputText.trim()}
              variant="primary"
              style={{ marginTop: 12 }}
            />
          </View>
  
          {nlp.error && (
            <View style={styles.alertError}><Text style={styles.alertErrorText}>{nlp.error}</Text></View>
          )}
  
          {/* NLP Outputs */}
          {nlpKind === 'translate' && nlp.translationResult && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.cardTitle}>Offline Translation ({targetLang.toUpperCase()})</Text>
                <StatChip label="Latency" value={`${nlp.translationResult.latencyMs} ms`} tone="accent" />
              </View>
              <Text style={styles.outputResultText}>{nlp.translationResult.translatedText}</Text>
              <Text style={styles.outputMetaText}>
                Source: {nlp.translationResult.sourceLanguage} • Target: {nlp.translationResult.targetLanguage} • Provenance: {nlp.translationResult.source}
              </Text>
            </View>
          )}
  
          {nlpKind === 'langid' && nlp.languageResult && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.cardTitle}>Identified Language</Text>
                <StatChip label="Latency" value={`${nlp.languageResult.latencyMs} ms`} tone="accent" />
              </View>
              <Text style={styles.outputResultText}>Language Code: {nlp.languageResult.languageCode?.toUpperCase() ?? 'UNDETERMINED'}</Text>
              <View style={styles.labelsRow}>
                {nlp.languageResult.possibleLanguages.map((p, idx) => (
                  <View key={idx} style={styles.labelChip}>
                    <Text style={styles.labelChipText}>{p.languageCode.toUpperCase()}: {Math.round(p.confidence * 100)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
  
          {nlpKind === 'smartreply' && nlp.smartReplyResult && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.cardTitle}>Smart Reply Suggestions</Text>
                <StatChip label="Latency" value={`${nlp.smartReplyResult.latencyMs} ms`} tone="accent" />
              </View>
              {nlp.smartReplyResult.suggestions.length === 0 ? (
                <Text style={styles.outputResultText}>(No replies generated)</Text>
              ) : (
                nlp.smartReplyResult.suggestions.map((rep, idx) => (
                  <View key={idx} style={{ marginTop: 6 }}>
                    <Text style={styles.outputResultText}>"{rep}"</Text>
                  </View>
                ))
              )}
            </View>
          )}
  
          {nlpKind === 'entities' && nlp.entityResult && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.cardTitle}>Extracted Structured Entities</Text>
                <StatChip label="Latency" value={`${nlp.entityResult.latencyMs} ms`} tone="accent" />
              </View>
              {nlp.entityResult.entities.length === 0 ? (
                <Text style={styles.outputResultText}>(No entities found)</Text>
              ) : (
                nlp.entityResult.entities.map((e, idx) => (
                  <View key={idx} style={{ marginTop: 6 }}>
                    <Text style={[styles.outputResultText, { fontWeight: '700' }]}>{e.text}</Text>
                    <Text style={styles.outputMetaText}>Type ID: {e.type} • Span: [{e.start}, {e.end}]</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
  );
};
