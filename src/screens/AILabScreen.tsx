/**
 * @file AILabScreen.tsx
 * @description The AI tab: six sections from `src/core/surface.ts`, each in its own file beside
 * this one.
 *
 * The hooks live here rather than in the sections, so a conversation, a transcript or a detection
 * result survives switching tabs. Sections own their own interface state and receive the hooks
 * they need. The engine choice is shared: Chat picks it, Voice reads back whatever answered.
 */

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { HapticEnvelopes, useAppFunctions, useGemini, useHaptics, useHiLight, useSpeech, useSpeechAI, useTPU } from '@pixelkit-labs/sdk';
import { ScreenHeader, SectionTabs } from '../components/ScreenScaffold';
import { useGeminiNano, useGenAITasks, useNaturalLanguageAI, useVisionAI } from '@pixelkit-labs/sdk/mlkit';
import { sectionsFor } from '../core/surface';
import { styles } from './ailab/styles';
import { ChatSection } from './ailab/ChatSection';
import { TasksSection } from './ailab/TasksSection';
import { VisionSection } from './ailab/VisionSection';
import { LanguageSection } from './ailab/LanguageSection';
import { VoiceSection } from './ailab/VoiceSection';
import { AgentsSection } from './ailab/AgentsSection';

type AILabTab = 'chat' | 'tasks' | 'vision' | 'language' | 'voice' | 'agents';

export const AILabScreen: React.FC = () => {
  const gemini = useGemini();
  const nano = useGeminiNano();
  const genaiTasks = useGenAITasks();
  const nlp = useNaturalLanguageAI();
  const vision = useVisionAI();
  const speech = useSpeechAI();
  const tts = useSpeech();
  const tpu = useTPU();
  const hilight = useHiLight();
  const haptics = useHaptics();
  const appFunctions = useAppFunctions();

  const [activeTab, setActiveTab] = useState<AILabTab>('chat');
  const [engine, setEngine] = useState<'cloud' | 'nano'>('cloud');
  const [inputPrompt, setInputPrompt] = useState('');

  const activeMessages = engine === 'nano' ? nano.messages : gemini.messages;
  const isBusy = engine === 'nano' ? nano.isGenerating : gemini.isLoading;
  const ask = (prompt: string) => (engine === 'nano' ? nano.sendMessage(prompt) : gemini.sendMessage(prompt));
  const lastModelReply = [...activeMessages].reverse().find(m => m.role === 'model')?.content ?? null;

  /** Cyan ring and a haptic ramp while a model is working, on the hardware that can show it. */
  const signalThinking = () => {
    if (hilight.availability === 'hardware') hilight.triggerGeminiPulse(4500);
    haptics.playEnvelope(HapticEnvelopes.thinkingRamp);
  };

  /** Shared by the composer microphone and the Voice tab, so both drive the same recogniser. */
  const handleVoiceToggle = async () => {
    if (speech.isListening) {
      const result = await speech.stopListeningAndTranscribe();
      if (result?.transcript) {
        setInputPrompt(result.transcript);
        signalThinking();
        void ask(result.transcript);
      }
    } else {
      await speech.startListening();
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="AI Lab"
        subtitle={`Cloud ${gemini.model} · Gemini Nano ${nano.status} · AICore ${tpu.aicoreVersion?.split('_')[2] ?? 'ready'}`}
        style={styles.scaffoldHeader}
      />

      <SectionTabs
        sections={sectionsFor('ai')}
        activeSection={activeTab}
        onSelect={id => setActiveTab(id as AILabTab)}
        style={styles.scaffoldTabs}
      />

      {activeTab === 'chat' && (
        <ChatSection
          gemini={gemini}
          nano={nano}
          speech={speech}
          haptics={haptics}
          engine={engine}
          setEngine={setEngine}
          activeMessages={activeMessages}
          isBusy={isBusy}
          ask={ask}
          signalThinking={signalThinking}
          onVoiceToggle={() => { void handleVoiceToggle(); }}
          inputPrompt={inputPrompt}
          setInputPrompt={setInputPrompt}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksSection genaiTasks={genaiTasks} nano={nano} vision={vision} haptics={haptics} signalThinking={signalThinking} />
      )}

      {activeTab === 'vision' && <VisionSection vision={vision} haptics={haptics} signalThinking={signalThinking} />}

      {activeTab === 'language' && <LanguageSection nlp={nlp} haptics={haptics} signalThinking={signalThinking} />}

      {activeTab === 'voice' && (
        <VoiceSection
          speech={speech}
          tts={tts}
          haptics={haptics}
          lastModelReply={lastModelReply}
          onVoiceToggle={() => { void handleVoiceToggle(); }}
        />
      )}

      {activeTab === 'agents' && <AgentsSection hilight={hilight} haptics={haptics} genaiTasks={genaiTasks} appFunctions={appFunctions} />}
    </KeyboardAvoidingView>
  );
};
