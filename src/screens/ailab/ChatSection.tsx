/**
 * @file ChatSection.tsx
 * @description One conversation surface over two engines: cloud Gemini and on-device Gemini Nano.
 *
 * The engine choice lives in the parent because the Voice tab reads the last reply from whichever
 * one answered. Everything else — the key card, the parameter drawer, the model lifecycle controls
 * and the composer — belongs to this section.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { HarmBlockThreshold } from '@google/genai';
import { saveApiKey, useGemini, useHaptics, useSpeechAI, type AIMessage, type SafetyThreshold } from '@pixelkit-labs/sdk';
import { Colors } from '../../theme/colors';
import { HapticButton } from '../../components/HapticButton';
import { StatChip } from '../../components/Decor';
import { useGeminiNano } from '@pixelkit-labs/sdk/mlkit';
import { styles } from './styles';

/** Threshold choices exposed for HarmCategory blocking; 'default' leaves the API defaults in place. */
const SAFETY_CHOICES: { label: string; value: SafetyThreshold }[] = [
  { label: 'DEFAULT', value: 'default' },
  { label: 'NONE', value: HarmBlockThreshold.BLOCK_NONE },
  { label: 'HIGH ONLY', value: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { label: 'MED+', value: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { label: 'LOW+', value: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

export const ChatSection: React.FC<{
  gemini: ReturnType<typeof useGemini>;
  nano: ReturnType<typeof useGeminiNano>;
  speech: ReturnType<typeof useSpeechAI>;
  haptics: ReturnType<typeof useHaptics>;
  engine: 'cloud' | 'nano';
  setEngine: (engine: 'cloud' | 'nano') => void;
  activeMessages: AIMessage[];
  isBusy: boolean;
  ask: (prompt: string) => Promise<void>;
  signalThinking: () => void;
  onVoiceToggle: () => void;
  /** Set by the parent when a voice transcript arrives, so the composer shows what was heard. */
  inputPrompt: string;
  setInputPrompt: (text: string) => void;
}> = ({ gemini, nano, speech, haptics, engine, setEngine, activeMessages, isBusy, ask, signalThinking, onVoiceToggle, inputPrompt, setInputPrompt }) => {
  const [showParams, setShowParams] = useState(false);
  const [tokenEstimate, setTokenEstimate] = useState<number | null>(null);
  const [nanoTrack, setNanoTrack] = useState<'stable' | 'preview'>('stable');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);

  const handleSend = () => {
    if (!inputPrompt.trim() || isBusy) return;
    const prompt = inputPrompt;
    setInputPrompt('');
    signalThinking();
    void ask(prompt);
  };

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return;
    const success = await saveApiKey(apiKeyInput.trim());
    if (!success) { setKeySavedMessage('Could not write the key to SecureStore.'); return; }
    gemini.setApiKey(apiKeyInput.trim());
    setKeySavedMessage('Key stored in SecureStore, encrypted by the Android Keystore.');
    setShowKeyInput(false);
    setApiKeyInput('');
    setTimeout(() => setKeySavedMessage(null), 3500);
  };

  /** Measures the prompt against info.tokenLimit before it is sent, rather than after a rejection. */
  const countPromptTokens = async () => {
    setTokenEstimate(await nano.countTokens(inputPrompt.trim()));
  };

  /** Switches the AICore model track. Preview builds are slower and refuse more often. */
  const toggleNanoTrack = async () => {
    const next = nanoTrack === 'stable' ? 'preview' : 'stable';
    setNanoTrack(next);
    await nano.setModelConfig(next, 'full');
  };

  return (
    <>
      {keySavedMessage && (
        <View style={styles.alertSuccess}>
          <Text style={styles.alertSuccessText}>{keySavedMessage}</Text>
        </View>
      )}
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.chatScrollContent} keyboardShouldPersistTaps="handled">
            {/* Engine & Settings Bar */}
            <View style={styles.controlRow}>
              <View style={styles.engineSwitcher}>
                <TouchableOpacity
                  style={[styles.enginePill, engine === 'cloud' && styles.enginePillActive]}
                  onPress={() => {
                    haptics.playPrimitives([{ primitive: 'CLICK', scale: 0.6 }]);
                    setEngine('cloud');
                  }}
                >
                  <Text style={[styles.enginePillText, engine === 'cloud' && styles.enginePillTextActive]}>
                    Cloud
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.enginePill, engine === 'nano' && styles.enginePillActive]}
                  onPress={() => {
                    haptics.playPrimitives([{ primitive: 'CLICK', scale: 0.6 }]);
                    setEngine('nano');
                  }}
                >
                  <Text style={[styles.enginePillText, engine === 'nano' && styles.enginePillTextActive]}>
                    Nano {nano.isAvailable ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
  
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <HapticButton
                  title={showParams ? 'Close Params' : 'Hyperparameters'}
                  onPress={() => setShowParams(!showParams)}
                  variant="outline"
                  style={styles.actionPill}
                  textStyle={{ fontSize: 11 }}
                />
                <HapticButton
                  title="Clear"
                  onPress={() => {
                    if (engine === 'nano') nano.clearMessages();
                    else gemini.clearMessages();
                    setTokenEstimate(null);
                  }}
                  disabled={activeMessages.length === 0}
                  variant="ghost"
                  style={styles.actionPill}
                  textStyle={{ fontSize: 11 }}
                />
                {engine === 'cloud' && (
                  <HapticButton
                    title={gemini.hasApiKey ? 'API Key' : 'Set Key'}
                    onPress={() => setShowKeyInput(!showKeyInput)}
                    variant={gemini.hasApiKey ? 'secondary' : 'primary'}
                    style={styles.actionPill}
                    textStyle={{ fontSize: 11 }}
                  />
                )}
              </View>
            </View>
  
            {/* API Key Modal/Card */}
            {showKeyInput && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Google Gemini API Key</Text>
                <Text style={styles.cardDesc}>
                  Stored securely in the Titan M3 Keystore via Android SecureStore.
                </Text>
                <TextInput
                  style={styles.textInputFull}
                  placeholder="AIzaSy… key"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  autoCapitalize="none"
                  secureTextEntry
                />
                <HapticButton title="Save Key to SecureStore" onPress={handleSaveKey} variant="primary" style={{ marginTop: 8 }} />
              </View>
            )}
  
            {/* Hyperparameters Drawer */}
            {showParams && (
              <View style={styles.paramsDrawer}>
                <Text style={styles.paramsTitle}>
                  {engine === 'cloud' ? `Model Configuration (${gemini.model})` : 'Nano On-Device Configuration'}
                </Text>
  
                {engine === 'cloud' ? (
                  <>
                    <Text style={styles.paramLabel}>Active Model</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelRow}>
                      {gemini.availableModels.map(m => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.modelChip, gemini.model === m && styles.modelChipActive]}
                          onPress={() => {
                            gemini.setSelectedModel(m);
                            haptics.playPrimitives([{ primitive: 'CLICK', scale: 0.6 }]);
                          }}
                        >
                          <Text style={[styles.modelChipText, gemini.model === m && styles.modelChipTextActive]}>
                            {m}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
  
                    <View style={styles.paramGrid}>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Temperature: {gemini.temperature.toFixed(2)}</Text>
                        <View style={styles.paramStepper}>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => gemini.setTemperature(Math.max(0, Number((gemini.temperature - 0.1).toFixed(2))))}
                          >
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => gemini.setTemperature(Math.min(2.0, Number((gemini.temperature + 0.1).toFixed(2))))}
                          >
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
  
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Top-K: {gemini.topK}</Text>
                        <View style={styles.paramStepper}>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => gemini.setTopK(Math.max(1, gemini.topK - 5))}
                          >
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => gemini.setTopK(Math.min(100, gemini.topK + 5))}
                          >
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    <View style={styles.paramGrid}>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Top-P: {gemini.topP.toFixed(2)}</Text>
                        <View style={styles.paramStepper}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => gemini.setTopP(Math.max(0, Number((gemini.topP - 0.05).toFixed(2))))}>
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => gemini.setTopP(Math.min(1, Number((gemini.topP + 0.05).toFixed(2))))}>
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
  
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Max output: {gemini.maxOutputTokens}</Text>
                        <View style={styles.paramStepper}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => gemini.setMaxOutputTokens(Math.max(256, gemini.maxOutputTokens - 256))}>
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => gemini.setMaxOutputTokens(Math.min(8192, gemini.maxOutputTokens + 256))}>
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
  
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>
                          Thinking budget: {gemini.thinkingBudget === 0 ? 'off' : gemini.thinkingBudget}
                        </Text>
                        <View style={styles.paramStepper}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => gemini.setThinkingBudget(Math.max(0, gemini.thinkingBudget - 512))}>
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => gemini.setThinkingBudget(Math.min(8192, gemini.thinkingBudget + 512))}>
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
  
                    <Text style={styles.paramLabel}>System instruction</Text>
                    <TextInput
                      style={styles.textInputFull}
                      value={gemini.systemInstruction}
                      onChangeText={gemini.setSystemInstruction}
                      placeholder="How the model should behave"
                      placeholderTextColor={Colors.dark.textMuted}
                      multiline
                    />
                    <View style={styles.toggleRow}>
                      <Text style={styles.paramLabel}>Ground answers in Google Search</Text>
                      <TouchableOpacity
                        style={[styles.togglePill, gemini.searchGrounding && styles.togglePillActive]}
                        onPress={() => gemini.setSearchGroundingEnabled(!gemini.searchGrounding)}
                      >
                        <Text style={styles.togglePillText}>{gemini.searchGrounding ? 'ENABLED' : 'DISABLED'}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.paramLabel}>Safety threshold</Text>
                    <View style={styles.taskSelector}>
                      {SAFETY_CHOICES.map(choice => (
                        <TouchableOpacity
                          key={choice.label}
                          style={[styles.taskPill, gemini.safetyThreshold === choice.value && styles.taskPillActive]}
                          onPress={() => gemini.setSafety(choice.value)}
                        >
                          <Text style={[styles.taskPillText, gemini.safetyThreshold === choice.value && styles.taskPillTextActive]}>
                            {choice.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.nanoActionRow}>
                      <HapticButton
                        title={gemini.lastPromptTokens == null ? 'Count prompt tokens' : `${gemini.lastPromptTokens} tokens`}
                        onPress={() => { void gemini.countTokens(inputPrompt); }}
                        disabled={!gemini.hasApiKey || !inputPrompt.trim()}
                        variant="outline"
                        style={styles.actionPill}
                        textStyle={{ fontSize: 11 }}
                      />
                    </View>

                    <Text style={styles.cardDesc}>
                      Model, key and every value here are fixed when the chat session is created, so changing one starts a fresh session.
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.paramGrid}>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Temperature: {nano.temperature.toFixed(2)}</Text>
                        <View style={styles.paramStepper}>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => nano.setTemperature(Math.max(0, Number((nano.temperature - 0.1).toFixed(2))))}
                          >
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => nano.setTemperature(Math.min(1.0, Number((nano.temperature + 0.1).toFixed(2))))}
                          >
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
  
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Top-K: {nano.topK}</Text>
                        <View style={styles.paramStepper}>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => nano.setTopK(Math.max(1, nano.topK - 5))}
                          >
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.stepBtn}
                            onPress={() => nano.setTopK(Math.min(100, nano.topK + 5))}
                          >
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
  
                    <View style={styles.paramGrid}>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Max output: {nano.maxOutputTokens}</Text>
                        <View style={styles.paramStepper}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => nano.setMaxOutputTokens(Math.max(128, nano.maxOutputTokens - 128))}>
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => nano.setMaxOutputTokens(Math.min(nano.info?.tokenLimit ?? 4096, nano.maxOutputTokens + 128))}>
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Candidates: {nano.candidateCount}</Text>
                        <View style={styles.paramStepper}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => nano.setCandidateCount(Math.max(1, nano.candidateCount - 1))}>
                            <Text style={styles.stepBtnText}>-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => nano.setCandidateCount(Math.min(4, nano.candidateCount + 1))}>
                            <Text style={styles.stepBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    <View style={styles.toggleRow}>
                      <Text style={styles.paramLabel}>Thinking Mode (Nano Reasoner)</Text>
                      <TouchableOpacity
                        style={[styles.togglePill, nano.thinkingMode && styles.togglePillActive]}
                        onPress={() => nano.setThinkingMode(!nano.thinkingMode)}
                      >
                        <Text style={styles.togglePillText}>{nano.thinkingMode ? 'ENABLED' : 'DISABLED'}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.paramLabel}>System instruction</Text>
                    <TextInput
                      style={styles.textInputFull}
                      value={nano.systemInstruction}
                      onChangeText={nano.setSystemInstruction}
                      placeholder="How the model should behave"
                      placeholderTextColor={Colors.dark.textMuted}
                      multiline
                    />
                    <Text style={styles.cardDesc}>
                      {nano.info?.systemPromptAvailable === false
                        ? 'AICore does not accept a system part on this device, so this is prefixed to the prompt instead. It still counts against the token limit.'
                        : 'Sent as a SystemInstruction part. AICore keeps no history, so it is re-sent with every turn and counts against the token limit.'}
                    </Text>
                  </>
                )}
              </View>
            )}
  
            {/* Model lifecycle: status, budget and the measured cost of the last turn. */}
            {engine === 'nano' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Gemini Nano on AICore</Text>
                <Text style={styles.cardDesc}>
                  {nano.info?.baseModelName ?? 'model name not reported'} · token limit{' '}
                  {nano.info?.tokenLimit ?? '—'} · thinking{' '}
                  {nano.info?.thinkingModeAvailable == null ? '?' : nano.info.thinkingModeAvailable ? 'available' : 'unavailable'} ·
                  system prompt{' '}
                  {nano.info?.systemPromptAvailable == null ? '?' : nano.info.systemPromptAvailable ? 'available' : 'unavailable'}
                </Text>
                <View style={styles.nanoMetricRow}>
                  <StatChip label="latency" value={nano.lastLatencyMs != null ? `${nano.lastLatencyMs} ms` : '—'} />
                  <StatChip label="first token" value={nano.lastFirstTokenMs != null ? `${nano.lastFirstTokenMs} ms` : '—'} />
                  <StatChip label="decode" value={nano.lastDecodeTokensPerSec != null ? `${nano.lastDecodeTokensPerSec} tok/s` : '—'} />
                  <StatChip label="out tokens" value={nano.lastOutputTokens != null ? String(nano.lastOutputTokens) : '—'} />
                </View>
                <View style={styles.nanoActionRow}>
                  {nano.status === 'downloadable' && (
                    <HapticButton
                      title={nano.isDownloading ? `Downloading ${nano.downloadedBytes != null ? `${Math.round(nano.downloadedBytes / 1_000_000)} MB` : '…'}` : 'Download model'}
                      onPress={() => { void nano.download(); }}
                      disabled={nano.isDownloading}
                      variant="primary"
                      style={styles.actionPill}
                      textStyle={{ fontSize: 11 }}
                    />
                  )}
                  <HapticButton
                    title={nano.isWarmingUp ? 'Warming…' : nano.warmupMs != null ? `Warm (${nano.warmupMs} ms)` : 'Warm up'}
                    onPress={() => { void nano.warmup(); }}
                    disabled={nano.isWarmingUp || !nano.isAvailable}
                    variant="secondary"
                    style={styles.actionPill}
                    textStyle={{ fontSize: 11 }}
                  />
                  <HapticButton
                    title={tokenEstimate == null ? 'Count prompt tokens' : `${tokenEstimate} tokens`}
                    onPress={() => { void countPromptTokens(); }}
                    disabled={!nano.isAvailable || !inputPrompt.trim()}
                    variant="outline"
                    style={styles.actionPill}
                    textStyle={{ fontSize: 11 }}
                  />
                  <HapticButton
                    title={`Track: ${nanoTrack}`}
                    onPress={() => { void toggleNanoTrack(); }}
                    disabled={!nano.isAvailable}
                    variant="outline"
                    style={styles.actionPill}
                    textStyle={{ fontSize: 11 }}
                  />
                </View>
                {nano.error ? <Text style={styles.nanoError}>{nano.error}</Text> : null}
              </View>
            )}
  
            {/* Conversation Messages */}
            <View style={styles.chatList}>
              {activeMessages.length === 0 && (
                <View style={styles.emptyPrompt}>
                  <Text style={styles.emptyPromptTitle}>Tensor G6 AI Ready</Text>
                  <Text style={styles.emptyPromptSub}>
                    Ask questions, run reasoning queries, or test on-device Gemini Nano inference.
                  </Text>
                </View>
              )}
  
              {activeMessages.map(msg => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user' ? styles.userBubble : msg.role === 'model' ? styles.modelBubble : styles.systemBubble,
                  ]}
                >
                  <View style={styles.bubbleHeader}>
                    <Text style={styles.bubbleRole}>{msg.role.toUpperCase()}</Text>
                    {msg.latencyMs != null && <Text style={styles.bubbleLatency}>{msg.latencyMs} ms</Text>}
                  </View>
                  <Text style={styles.bubbleText}>{msg.content}</Text>
                </View>
              ))}
  
              {nano.partial.length > 0 && (
                <View style={[styles.messageBubble, styles.modelBubble]}>
                  <View style={styles.bubbleHeader}><Text style={styles.bubbleRole}>NANO STREAMING</Text></View>
                  <Text style={styles.bubbleText}>{nano.partial}</Text>
                </View>
              )}

              {gemini.partial.length > 0 && (
                <View style={[styles.messageBubble, styles.modelBubble]}>
                  <View style={styles.bubbleHeader}>
                    <Text style={styles.bubbleRole}>CLOUD STREAMING</Text>
                    {gemini.lastFirstChunkMs != null && (
                      <Text style={styles.bubbleLatency}>first chunk {gemini.lastFirstChunkMs} ms</Text>
                    )}
                  </View>
                  <Text style={styles.bubbleText}>{gemini.partial}</Text>
                </View>
              )}

              {gemini.lastGrounding && !gemini.partial && (
                <View style={styles.thoughtBox}>
                  <Text style={styles.thoughtTitle}>GROUNDED IN GOOGLE SEARCH</Text>
                  {gemini.lastGrounding.queries.map((q, idx) => (
                    <Text key={"q" + idx} style={styles.thoughtText}>search: {q}</Text>
                  ))}
                  {gemini.lastGrounding.sources.map((uri, idx) => (
                    <Text key={"s" + idx} style={styles.thoughtText} numberOfLines={1}>{uri}</Text>
                  ))}
                </View>
              )}
  
              {nano.thoughts.length > 0 && (
                <View style={styles.thoughtBox}>
                  <Text style={styles.thoughtTitle}>NANO INTERNAL THOUGHTS</Text>
                  {nano.thoughts.map((t, idx) => (
                    <Text key={idx} style={styles.thoughtText}>{t}</Text>
                  ))}
                </View>
              )}
  
              {isBusy && !nano.partial && !gemini.partial && (
                <View style={styles.loadingBubble}>
                  <ActivityIndicator size="small" color={Colors.dark.primary} />
                  <Text style={styles.loadingBubbleText}>
                    {engine === 'nano' ? 'Executing on Tensor G6 TPU…' : 'Querying Gemini Cloud…'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
  
          {/* Chat Composer with generous bottom padding */}
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              placeholder={engine === 'nano' ? 'Message Gemini Nano (on-device)…' : 'Message Gemini 3.8…'}
              placeholderTextColor={Colors.dark.textMuted}
              value={inputPrompt}
              onChangeText={setInputPrompt}
              onSubmitEditing={handleSend}
            />
            <HapticButton
              title={speech.isListening ? 'Stop' : 'Mic'}
              onPress={onVoiceToggle}
              variant={speech.isListening ? 'danger' : 'outline'}
              style={styles.composerMic}
              textStyle={{ fontSize: 16 }}
            />
            <HapticButton
              title="Send"
              onPress={handleSend}
              disabled={isBusy || !inputPrompt.trim()}
              variant="primary"
              style={styles.composerSend}
            />
          </View>
        </View>
    </>
  );
};
