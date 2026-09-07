/**
 * @file VoiceSection.tsx
 * @description Speech in and speech out. Recognition runs on-device through Android System
 * Intelligence or in the cloud through Gemini audio; the platform engine reads a reply back.
 *
 * The transcript and the spoken text come from the hooks the parent owns, so switching tabs does
 * not lose them.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useHaptics, useSpeech, useSpeechAI } from 'pixelkit';
import { Colors } from '../../theme/colors';
import { HapticButton } from '../../components/HapticButton';
import { MetricCard } from '../../components/MetricCard';
import { SectionHeader, StatChip } from '../../components/Decor';
import { styles } from './styles';

export const VoiceSection: React.FC<{
  speech: ReturnType<typeof useSpeechAI>;
  tts: ReturnType<typeof useSpeech>;
  haptics: ReturnType<typeof useHaptics>;
  /** The most recent model reply from whichever engine the chat is using, or null. */
  lastModelReply: string | null;
  onVoiceToggle: () => void;
}> = ({ speech, tts, haptics, lastModelReply, onVoiceToggle }) => {
  const [spokenNote, setSpokenNote] = useState<string | null>(null);

  /** Reads the last reply aloud. Rejects rather than truncating when the text is too long. */
  const speakLastReply = async () => {
    if (!lastModelReply) { setSpokenNote('Nothing to read yet — ask something on the Chat tab first.'); return; }
    try {
      setSpokenNote(null);
      await tts.speak(lastModelReply);
    } catch (e: any) {
      setSpokenNote(e?.message ?? 'The engine refused that text.');
    }
  };

  return (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SectionHeader title="Speech out" hint={tts.voices.length ? `${tts.voices.length} voices installed` : 'no voices read yet'} />
          <MetricCard
            title="Platform speech engine"
            value={tts.isSpeaking ? (tts.isPaused ? 'Paused' : 'Speaking') : 'Idle'}
            badge={tts.voice ? 'VOICE SET' : 'SYSTEM DEFAULT'}
            badgeColor={tts.isSpeaking ? Colors.dark.success : Colors.dark.textMuted}
            subtitle={`rate ${tts.rate} · pitch ${tts.pitch} · accepts ${tts.maxInputLength} characters per call, longer text is rejected rather than cut`}
            source={tts.source}
          />
          <View style={styles.ttsRow}>
            <HapticButton
              title="Read the last reply"
              onPress={() => { void speakLastReply(); }}
              disabled={tts.isSpeaking}
              variant="primary"
              style={styles.actionPill}
              textStyle={{ fontSize: 11 }}
            />
            <HapticButton title="Stop" onPress={() => { void tts.stop(); }} disabled={!tts.isSpeaking} variant="outline" style={styles.actionPill} textStyle={{ fontSize: 11 }} />
            <HapticButton title="Slower" onPress={() => tts.setRate(Number(Math.max(0.5, tts.rate - 0.1).toFixed(2)))} variant="outline" style={styles.actionPill} textStyle={{ fontSize: 11 }} />
            <HapticButton title="Faster" onPress={() => tts.setRate(Number(Math.min(2, tts.rate + 0.1).toFixed(2)))} variant="outline" style={styles.actionPill} textStyle={{ fontSize: 11 }} />
            <HapticButton title="Refresh voices" onPress={() => { void tts.refreshVoices(); }} variant="ghost" style={styles.actionPill} textStyle={{ fontSize: 11 }} />
          </View>
          {tts.lastSpokenText ? <Text style={styles.cardDesc}>Last spoken: {tts.lastSpokenText.slice(0, 120)}</Text> : null}
          {spokenNote ? <Text style={styles.nanoError}>{spokenNote}</Text> : null}
          {tts.error ? <Text style={styles.nanoError}>{tts.error}</Text> : null}
  
          <SectionHeader title="Speech Recognition Mode" />
          <View style={styles.taskSelector}>
            <TouchableOpacity
              style={[styles.taskPill, speech.recognitionMode === 'on-device' && styles.taskPillActive]}
              onPress={() => {
                speech.setRecognitionMode('on-device');
                haptics.playPrimitives([{ primitive: 'CLICK', scale: 0.6 }]);
              }}
            >
              <Text style={[styles.taskPillText, speech.recognitionMode === 'on-device' && styles.taskPillTextActive]}>
                ON-DEVICE (ASI OFFLINE)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.taskPill, speech.recognitionMode === 'cloud' && styles.taskPillActive]}
              onPress={() => {
                speech.setRecognitionMode('cloud');
                haptics.playPrimitives([{ primitive: 'CLICK', scale: 0.6 }]);
              }}
            >
              <Text style={[styles.taskPillText, speech.recognitionMode === 'cloud' && styles.taskPillTextActive]}>
                CLOUD (GEMINI AUDIO)
              </Text>
            </TouchableOpacity>
          </View>
  
          <MetricCard
            title="Speech Recognizer Engine"
            value={speech.recognitionMode === 'on-device' ? 'Android System Intelligence' : 'Gemini 3.8 Flash Cloud'}
            badge={speech.recognitionMode === 'on-device' ? 'OFFLINE NATIVE' : 'CLOUD API'}
            badgeColor={speech.recognitionMode === 'on-device' ? Colors.dark.success : Colors.dark.primary}
            subtitle={
              speech.recognitionMode === 'on-device'
                ? 'Streams tokens in real-time without sending audio to the cloud'
                : 'Transcribes recorded 16 kHz audio via Gemini multimodal understanding'
            }
            source="hardware"
          />
  
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
            <HapticButton
              title={speech.isListening ? `Listening (${speech.voiceDecibels ?? '—'} dBFS)` : 'Start Voice Input'}
              onPress={onVoiceToggle}
              variant={speech.isListening ? 'danger' : 'primary'}
              style={{ width: '80%', paddingVertical: 14 }}
              textStyle={{ fontSize: 16, fontWeight: '700' }}
            />
  
            {speech.isListening && (
              <View style={styles.waveformContainer}>
                <ActivityIndicator size="small" color={Colors.dark.primary} />
                <Text style={styles.listeningStatusText}>
                  {speech.recognitionMode === 'on-device' ? 'Streaming live from on-device microphone…' : 'Recording audio…'}
                </Text>
              </View>
            )}
  
            {speech.streamingPartial.length > 0 && (
              <View style={styles.partialStreamBox}>
                <Text style={styles.partialStreamLabel}>LIVE INTERIM STREAM</Text>
                <Text style={styles.partialStreamText}>{speech.streamingPartial}</Text>
              </View>
            )}
          </View>
  
          {speech.lastTranscript && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.cardTitle}>Final Transcript</Text>
                <StatChip label="Latency" value={`${speech.lastTranscript.latencyMs} ms`} tone="ok" />
              </View>
              <Text style={styles.outputResultText}>"{speech.lastTranscript.transcript}"</Text>
              <Text style={styles.outputMetaText}>
                Duration: {speech.lastTranscript.durationSeconds}s • Model: {speech.lastTranscript.language}
              </Text>
            </View>
          )}
  
          {speech.error && (
            <View style={styles.alertError}><Text style={styles.alertErrorText}>{speech.error}</Text></View>
          )}
        </ScrollView>
  );
};
