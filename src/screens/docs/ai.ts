/**
 * @file ai.ts
 * @description Neural & AI: one documentation entry per hook, each with its inputs, its
 * outputs, and a contract for every function it exposes.
 */

import { type DocModule, AI, SOURCE_FIELD } from './shared';

export const AI_MODULES: DocModule[] = [
  {
    id: 'useGeminiNano',
    name: 'useGeminiNano',
    category: 'ai',
    chipBadge: 'AICore · ML Kit Prompt API',
    badgeColor: AI,
    summary: 'Gemini Nano running on the phone, with no network and no API key.',
    plain:
      'Chat with a model that runs entirely on the device. Nothing leaves the phone and it works offline, but the model is small and the context is short. Check status first: the weights are managed by the system and may need downloading once.',
    description:
      'Wraps the ML Kit GenAI Prompt API on AICore through the pixel-nano module. The model is owned by the system, not bundled with the app, so checkStatus can report that a download is required; download reports progress as it runs. AICore keeps no conversation history, so each turn re-sends a capped transcript built by buildNanoTurn. Latency and time to first token are measured around the native call, and output token counts come from the on-device tokenizer, so the performance figures are real rather than estimated. There is no cloud fallback: if the model is unavailable, sendMessage appends an error entry.',
    signature: 'useGeminiNano(): GeminiNanoState',
    params: [],
    returns: [
      { name: 'status', type: "'available' | 'downloadable' | 'downloading' | 'unavailable'", desc: 'Model readiness. Gate every call on this.' },
      { name: 'isAvailable', type: 'boolean', desc: 'Convenience for status === "available".' },
      { name: 'info', type: 'NanoModelInfo | null', desc: 'Base model name, token limit, and which features this build supports (system prompt, thinking mode, structured output, caching).' },
      { name: 'messages', type: 'AIMessage[]', desc: 'Conversation so far. Entries with role system are local errors, not model output.' },
      { name: 'partial', type: 'string', desc: 'Text streamed so far for the in-flight reply. Render this for a live typing effect.' },
      { name: 'thoughts', type: 'string[]', desc: 'Reasoning steps when thinking mode is enabled and supported.' },
      { name: 'isGenerating', type: 'boolean', desc: 'True while a reply is being produced.' },
      { name: 'downloadedBytes', type: 'number | null', desc: 'Progress while the model downloads.' },
      { name: 'isDownloading', type: 'boolean', desc: 'True during download.' },
      { name: 'warmupMs', type: 'number | null', desc: 'How long the last warm-up took to load the model into memory.' },
      { name: 'lastLatencyMs', type: 'number | null', desc: 'Wall time of the last call, measured natively.' },
      { name: 'lastFirstTokenMs', type: 'number | null', desc: 'Time to the first streamed token, which is what perceived responsiveness depends on.' },
      { name: 'lastOutputTokens', type: 'number | null', desc: 'Tokens produced, counted by the on-device tokenizer.' },
      { name: 'lastDecodeTokensPerSec', type: 'number | null', desc: 'Generation speed after the first token. Derived from the two figures above.' },
      { name: 'error', type: 'string | null', desc: 'Last failure message, for example a busy model or a request over the token limit.' },
      { name: 'temperature', type: 'number', desc: 'Sampling temperature applied to every turn, 0.7 by default. Lower is more deterministic.' },
      { name: 'topK', type: 'number', desc: 'Top-k sampling cutoff, 40 by default.' },
      { name: 'candidateCount', type: 'number', desc: 'How many candidates the model generates, 1 by default. Each one costs latency.' },
      { name: 'maxOutputTokens', type: 'number', desc: 'Ceiling on the reply, 1024 by default. It shares info.tokenLimit with the prompt and the re-sent transcript.' },
      { name: 'thinkingMode', type: 'boolean', desc: 'Whether thinking is requested. Only honoured when info.thinkingModeAvailable is true; elsewhere thoughts comes back empty.' },
      { name: 'systemInstruction', type: 'string', desc: 'The standing instruction. Sent as a SystemInstruction part when AICore supports one, otherwise prefixed to the prompt — either way it is re-sent every turn, because AICore keeps no history.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'setSystemInstruction(text)',
        type: '(text: string) => void',
        desc: 'Sets the standing instruction used by every later turn.',
        inputs: [{ name: 'text', type: 'string', desc: 'How the model should behave. It counts against info.tokenLimit on every turn, so keep it short.' }],
        output: 'Returns nothing; the next sendMessage uses it.',
      },
      {
        name: 'setTemperature(n) / setTopK(n) / setCandidateCount(n) / setMaxOutputTokens(n)',
        type: '(value: number) => void',
        desc: 'Generation parameters applied to every later turn.',
        inputs: [{ name: 'value', type: 'number', desc: 'Temperature 0 to 1, top-k a positive integer, candidate count how many replies to generate, max output tokens the reply ceiling within info.tokenLimit.' }],
        output: 'Returns nothing; the values are read on the next call.',
      },
      {
        name: 'setThinkingMode(on)',
        type: '(on: boolean) => void',
        desc: 'Requests thinking mode. Check info.thinkingModeAvailable first; where it is false the request is dropped and thoughts stays empty.',
        inputs: [{ name: 'on', type: 'boolean', desc: 'Whether to ask the model to think before answering.' }],
        output: 'Returns nothing.',
      },
      {
        name: 'download()',
        type: '() => Promise<NanoStatus>',
        desc: 'Asks AICore to fetch the model weights.',
        output: 'Resolves with the status after the attempt, or "unavailable" when it failed. Progress arrives in downloadedBytes while it runs.',
      },
      {
        name: 'warmup()',
        type: '() => Promise<number | null>',
        desc: 'Loads the model into AICore ahead of the first prompt so the first reply is not slow.',
        output: 'Resolves with the wall time in milliseconds, or null when the warm-up failed. The same value lands in warmupMs.',
      },
      {
        name: 'sendMessage(text)',
        type: '(prompt: string) => Promise<void>',
        desc: 'Sends a chat turn with streaming, appending both the question and the reply to messages.',
        inputs: [{ name: 'prompt', type: 'string', desc: "The user's turn. Blank or whitespace-only input is ignored." }],
        output: 'Resolves when the reply is complete. Tokens accumulate in partial while it streams; failures arrive as a system-role entry in messages, never as a rejection.',
      },
      {
        name: 'generate(prompt, options?)',
        type: '(prompt: string, options?: NanoOptions) => Promise<NanoResult>',
        desc: 'One-shot generation outside the conversation, with optional per-call parameters.',
        inputs: [
          { name: 'prompt', type: 'string', desc: 'The complete prompt; no history is added.' },
          { name: 'options', type: 'NanoOptions | undefined', desc: 'Per-call overrides: systemInstruction, temperature, topK, candidateCount, maxOutputTokens, seed, thinking, imageBase64 for a multimodal turn.' },
        ],
        output: 'Resolves with { text, finishReason, thoughts, latencyMs, firstTokenMs }. Throws E_NANO_* on failure; there is no fallback.',
      },
      {
        name: 'countTokens(prompt, options?)',
        type: '(prompt: string, options?: NanoOptions) => Promise<number | null>',
        desc: 'Measures a prompt with the on-device tokenizer before sending it.',
        inputs: [
          { name: 'prompt', type: 'string', desc: 'Text exactly as it would be sent.' },
          { name: 'options', type: 'NanoOptions | undefined', desc: 'The same options the real call would use, since they affect the count.' },
        ],
        output: 'Resolves with the token count, or null when the tokenizer is unavailable. Compare it against info.tokenLimit.',
      },
      {
        name: 'setSafety(threshold)',
        type: "(threshold: 'default' | HarmBlockThreshold) => void",
        desc: 'Sets one blocking threshold across all four harm categories (harassment, hate speech, sexually explicit, dangerous content) and resets the chat session.',
        inputs: [{ name: 'threshold', type: "'default' | HarmBlockThreshold", desc: "'default' sends no safetySettings at all. Otherwise BLOCK_NONE, BLOCK_ONLY_HIGH, BLOCK_MEDIUM_AND_ABOVE or BLOCK_LOW_AND_ABOVE from @google/genai." }],
        output: 'Returns nothing; the next turn starts a fresh session carrying that threshold.',
      },
      {
        name: 'setSearchGroundingEnabled(enabled)',
        type: '(enabled: boolean) => void',
        desc: 'Attaches or removes the googleSearch tool, letting the model search the web before answering. Resets the chat session.',
        inputs: [{ name: 'enabled', type: 'boolean', desc: 'True to ground replies in Google Search. The model decides per turn whether to actually search.' }],
        output: 'Returns nothing. When a turn does search, lastGrounding carries the queries and source URIs.',
      },
      {
        name: 'countTokens(text)',
        type: '(text: string) => Promise<number | null>',
        desc: 'Asks the API how many tokens a prompt costs on the selected model, before you send it.',
        inputs: [{ name: 'text', type: 'string', desc: 'The prompt to measure. Blank input returns null without a network call.' }],
        output: 'Resolves to the token count, or null without a key or when the call fails. Also written to lastPromptTokens.',
      },
      {
        name: 'clearMessages()',
        type: '() => void',
        desc: 'Empties the conversation and the thinking output.',
        output: 'Returns nothing. AICore keeps no history of its own, so this is the whole reset.',
      },
      {
        name: 'setModelConfig(stage, preference)',
        type: "(stage: 'stable' | 'preview', preference: 'full' | 'fast') => Promise<void>",
        desc: 'Chooses the model track AICore serves. The next call creates a new client.',
        inputs: [
          { name: 'stage', type: "'stable' | 'preview'", desc: 'Production build or the Developer Preview track. Preview models are slower and refuse more often.' },
          { name: 'preference', type: "'full' | 'fast'", desc: 'Full favours quality, fast favours latency.' },
        ],
        output: 'Resolves once the config is applied and status and info have been re-read.',
      },
      {
        name: 'refresh()',
        type: '() => Promise<void>',
        desc: 'Re-reads status and model facts from AICore.',
        output: 'Resolves once status and info have been updated. On failure status becomes unavailable and error is set.',
      },
    ],
    example: `import { useGeminiNano } from 'pixelkit';

function OnDeviceChat() {
  const nano = useGeminiNano();
  if (nano.status === 'downloadable') return <Button title="Download model" onPress={() => nano.download()} />;
  return (
    <View>
      <Button title="Ask" onPress={() => nano.sendMessage('Summarise the thermal state')} disabled={!nano.isAvailable} />
      <Text>{nano.partial || nano.messages.at(-1)?.content}</Text>
      <Text>{nano.lastLatencyMs ?? '—'} ms · {nano.lastDecodeTokensPerSec ?? '—'} tok/s</Text>
    </View>
  );
}`,
    agentNote:
      'Always branch on status before calling. The model is foreground-only and single-turn, so keep the transcript short and send long or background work to the cloud hook.',
  },
  {
    id: 'useGemini',
    name: 'useGemini',
    category: 'ai',
    chipBadge: 'gemini-3.8-flash · ai.chats',
    badgeColor: AI,
    summary: 'Cloud Gemini chat with real multi-turn history.',
    plain:
      'Talks to the full Gemini model over the network. Much more capable than the on-device model, but it needs an API key and a connection. Replies carry real token counts and timings from the API.',
    description:
      'Wraps ai.chats.create from @google/genai on gemini-3.8-flash with a system instruction, so history is maintained by the SDK rather than re-sent by hand. Token counts come from the response usageMetadata and latency is measured around the call. Replies stream through sendMessageStream, so partial fills in as chunks arrive and lastFirstChunkMs records time to first token. There is no simulated fallback: without a key, sendMessage appends a system-role message explaining how to configure one. The key is read from SecureStore, never from source.',
    signature: 'useGemini(): GeminiState',
    params: [],
    returns: [
      { name: 'messages', type: 'AIMessage[]', desc: 'Conversation so far. Role system means a local error, not model output.' },
      { name: 'isLoading', type: 'boolean', desc: 'True while a reply is in flight.' },
      { name: 'hasApiKey', type: 'boolean', desc: 'Whether a key is configured. Check this before offering cloud features.' },
      { name: 'model', type: 'string', desc: 'Model id in use, gemini-3.8-flash.' },
      { name: 'partial', type: 'string', desc: 'Text streamed so far for the in-flight reply. Empty between turns; render it for a live typing effect.' },
      { name: 'lastFirstChunkMs', type: 'number | null', desc: 'Time to the first streamed chunk of the last reply, in ms. Null before the first reply.' },
      { name: 'lastPromptTokens', type: 'number | null', desc: 'Token count returned by the last countTokens() call. Null until you call it.' },
      { name: 'lastGrounding', type: 'GroundingSummary | null', desc: 'What the last grounded reply searched for (queries) and which URIs it used (sources). Null when grounding was off or the model chose not to search.' },
      { name: 'safetyThreshold', type: "'default' | HarmBlockThreshold", desc: 'Blocking threshold applied to all four harm categories. Default leaves the API defaults in place.' },
      { name: 'searchGrounding', type: 'boolean', desc: 'Whether the googleSearch tool is attached to the session.' },
    ],
    actions: [
      {
        name: 'sendMessage(prompt)',
        type: '(prompt: string) => Promise<void>',
        desc: 'Sends a turn and appends the reply with its latency and token count.',
        inputs: [{ name: 'prompt', type: 'string', desc: "The user's turn. Blank input is ignored." }],
        output: 'Resolves when the reply arrives. Without an API key it appends a system-role message explaining that instead; API errors arrive the same way rather than as a rejection.',
      },
      {
        name: 'setSelectedModel(model)',
        type: '(model: string) => void',
        desc: 'Switches the cloud model and resets the chat session, because the model is fixed when the session is created.',
        inputs: [{ name: 'model', type: 'string', desc: 'An id from availableModels, which the API lists for your key.' }],
        output: 'Returns nothing; the next turn starts a new session on that model.',
      },
      {
        name: 'setTopP(n) / setTopK(n) / setTemperature(n) / setMaxOutputTokens(n)',
        type: '(value: number) => void',
        desc: 'Generation parameters. They are fixed when the session is created, so changing one starts a fresh session.',
        inputs: [{ name: 'value', type: 'number', desc: 'Top-p 0 to 1, top-k a positive integer, temperature typically 0 to 2, max output tokens the reply ceiling.' }],
        output: 'Returns nothing.',
      },
      {
        name: 'setThinkingBudget(tokens)',
        type: '(tokens: number) => void',
        desc: 'Thinking tokens requested from the model. Zero disables thinking, and only a value above zero is sent.',
        inputs: [{ name: 'tokens', type: 'number', desc: 'Token budget for reasoning before the reply. Costs latency and tokens.' }],
        output: 'Returns nothing; applied to the next session.',
      },
      {
        name: 'clearMessages()',
        type: '() => void',
        desc: 'Clears the history and resets the chat session, so the next turn starts with no context.',
        output: 'Returns nothing.',
      },
      {
        name: 'setApiKey(key)',
        type: '(key: string | null) => void',
        desc: 'Swaps the key in memory and resets the chat session.',
        inputs: [{ name: 'key', type: 'string | null', desc: "The Gemini API key, or null to clear it. Persisting it is the job of saveApiKey()." }],
        output: 'Returns nothing. hasApiKey updates immediately and availableModels is refreshed in the background.',
      },
    ],
    example: `import { useGemini } from 'pixelkit';

function Assistant() {
  const { messages, sendMessage, isLoading, hasApiKey } = useGemini();
  if (!hasApiKey) return <Text>Configure a Gemini API key first</Text>;
  return <Button title="Ask" onPress={() => sendMessage('Analyse current telemetry')} disabled={isLoading} />;
}`,
    agentNote:
      'Keys come from saveApiKey and live in SecureStore. Never hardcode one, and never fabricate a reply when the key is missing.',
  },
  {
    id: 'useSpeechAI',
    name: 'useSpeechAI',
    category: 'ai',
    chipBadge: 'Offline ASI · Gemini audio',
    badgeColor: AI,
    summary: 'Turning speech into text, on the device or in the cloud.',
    plain:
      'Records the user talking and returns what they said. It can work offline using the phone\'s own recogniser, or send the clip to Gemini for higher accuracy. Offline is faster and private; cloud handles harder audio.',
    description:
      'Capture runs through useAudio at 16 kHz mono on the voice_recognition source, which is the path that applies the platform noise suppression. In offline mode the native module drives Android System Intelligence streaming recognition and emits partial results as the user speaks. In cloud mode the finished clip is sent to Gemini audio understanding. Neither path fabricates a transcript: without a key, cloud mode keeps the recording and returns an error.',
    signature: 'useSpeechAI(): SpeechState',
    params: [],
    returns: [
      { name: 'isListening', type: 'boolean', desc: 'True while the microphone is capturing.' },
      { name: 'isTranscribing', type: 'boolean', desc: 'True while audio is being converted to text.' },
      { name: 'recognitionMode', type: "'offline' | 'cloud'", desc: 'Which engine will handle the next transcription.' },
      { name: 'isOfflineAvailable', type: 'boolean', desc: 'Whether on-device recognition is installed for the current language.' },
      { name: 'streamingPartial', type: 'string', desc: 'Live text as the user is still speaking, offline mode only.' },
      { name: 'voiceDecibels', type: 'number', desc: 'Current input level, for a meter or a speaking indicator.' },
      { name: 'lastTranscript', type: 'SpeechTranscriptionResult | null', desc: 'Final text with confidence, audio duration and latency.' },
      { name: 'lastRecordingUri', type: 'string | null', desc: 'File of the last capture, kept even when transcription fails.' },
      { name: 'error', type: 'string | null', desc: 'Why the last attempt failed.' },
      { name: 'model', type: 'string', desc: 'Engine used for the last cloud transcription.' },
    ],
    actions: [
      {
        name: 'startListening()',
        type: '() => Promise<boolean>',
        desc: 'Opens the microphone using the current recognitionMode: the on-device recognizer, or a recording for cloud transcription.',
        output: 'Resolves true when the microphone opened, false with the reason in error when permission was denied or the recognizer refused.',
      },
      {
        name: 'stopListeningAndTranscribe()',
        type: '() => Promise<SpeechTranscriptionResult | null>',
        desc: 'Closes the microphone and returns what was heard.',
        output: 'Resolves with { transcript, confidence, durationSeconds, latencyMs, language } — confidence is null for cloud transcripts — or null when nothing was captured or transcription failed. In cloud mode the audio file is kept in lastRecordingUri either way.',
      },
      {
        name: 'setRecognitionMode(mode)',
        type: "(mode: 'on-device' | 'cloud') => void",
        desc: 'Chooses the engine for the next run.',
        inputs: [{ name: 'mode', type: "'on-device' | 'cloud'", desc: 'On-device keeps audio on the phone and streams partials; cloud records first and needs an API key.' }],
        output: 'Returns nothing. model updates to name the engine that will be used.',
      },
    ],
    example: `import { useSpeechAI } from 'pixelkit';

function VoiceButton() {
  const speech = useSpeechAI();
  const toggle = async () => {
    if (speech.isListening) {
      const result = await speech.stopListeningAndTranscribe();
      console.log(result?.transcript);
    } else {
      await speech.startListening();
    }
  };
  return <Button title={speech.isListening ? 'Stop' : 'Speak'} onPress={toggle} />;
}`,
    agentNote:
      'Prefer offline mode when isOfflineAvailable is true: it is lower latency and keeps audio on the device. Show streamingPartial so the user knows they are being heard.',
  },
  {
    id: 'useGenAITasks',
    name: 'useGenAITasks',
    category: 'ai',
    chipBadge: 'ML Kit GenAI · on-device',
    badgeColor: AI,
    summary: 'Four focused text tasks that run locally: summarise, proofread, rewrite, describe.',
    plain:
      'Purpose-built text helpers that run on the phone. Each does one job well and is faster and more reliable than prompting a general model for the same thing. No network, no key.',
    description:
      'Wraps the ML Kit GenAI task modules on AICore through pixel-nano: genai-summarization, genai-proofreading and genai-rewriting, plus image description. Because each task ships a tuned model rather than a free-form prompt, the output is more consistent than asking a chat model, and it works on more devices. Every call reports its own measured latency and the engine that served it.',
    signature: 'useGenAITasks(): GenAITasksState',
    params: [],
    returns: [
      { name: 'isRunning', type: 'boolean', desc: 'True while any task is executing.' },
      { name: 'summaryResult', type: 'SummarizeResult | null', desc: 'Bullet summary with latency and engine name.' },
      { name: 'proofreadResult', type: 'ProofreadResult | null', desc: 'Corrected text plus the individual suggestions.' },
      { name: 'rewriteResult', type: 'RewriteResult | null', desc: 'Rewritten text in the requested tone.' },
      { name: 'imageDescriptionResult', type: 'ImageDescriptionResult | null', desc: 'Generated description of a supplied image.' },
      { name: 'error', type: 'string | null', desc: 'Why the last task failed, for example the model not being downloaded.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'summarize(text, options?)',
        type: '(text: string, options?: SummarizeOptions) => Promise<SummarizeResult | null>',
        desc: 'Condenses an article or a conversation on-device. Nothing leaves the phone.',
        inputs: [
          { name: 'text', type: 'string', desc: 'The article or transcript to condense.' },
          { name: 'options', type: 'SummarizeOptions | undefined', desc: "inputType: 'article' or 'conversation' tells the model how to read it; outputType: 'one_bullet', 'two_bullets' or 'three_bullets' sets the length." },
        ],
        output: 'Resolves with { summary, latencyMs, engine, source }, or null on failure with the reason in error.',
      },
      {
        name: 'proofread(text)',
        type: '(text: string) => Promise<ProofreadResult | null>',
        desc: 'Fixes grammar, punctuation and wording. Good for cleaning up dictated text.',
        inputs: [{ name: 'text', type: 'string', desc: 'The text to correct.' }],
        output: 'Resolves with { correctedText, suggestions, latencyMs, engine, source } — suggestions lists the individual changes — or null on failure.',
      },
      {
        name: 'rewrite(text, tone?)',
        type: "(text: string, tone?: TaskTone) => Promise<RewriteResult | null>",
        desc: 'Rewrites text in a different tone or length while keeping the meaning.',
        inputs: [
          { name: 'text', type: 'string', desc: 'The text to transform.' },
          { name: 'tone', type: 'TaskTone | undefined', desc: "One of elaborate, emojify, shorten, friendly, professional, rephrase. Defaults to professional." },
        ],
        output: 'Resolves with { rewrittenText, suggestions, latencyMs, engine, source }, or null on failure.',
      },
      {
        name: 'describeImage(input, style?)',
        type: "(imageInput: string, style?: 'detailed' | 'caption' | 'labels' | 'concise') => Promise<ImageDescriptionResult | null>",
        desc: 'Describes an image locally. Useful for alt text without a network round-trip.',
        inputs: [
          { name: 'imageInput', type: 'string', desc: 'A file URI or a base64 image.' },
          { name: 'style', type: 'string | undefined', desc: 'detailed, caption, labels or concise. Defaults to concise.' },
        ],
        output: 'Resolves with { description, finishReason, latencyMs, engine, source }, or null on failure.',
      },
    ],
    example: `import { useGenAITasks } from 'pixelkit';

async function tidy(dictated: string, tasks) {
  const fixed = await tasks.proofread(dictated);
  const short = await tasks.summarize(fixed.correctedText, { outputType: 'two_bullets' });
  return short.summary;
}`,
    agentNote:
      'Reach for these before prompting a chat model for the same job: they are faster, run offline and give steadier output. Handle the model-not-downloaded error.',
  },
  {
    id: 'useNaturalLanguageAI',
    name: 'useNaturalLanguageAI',
    category: 'ai',
    chipBadge: 'ML Kit NLP · 58 languages',
    badgeColor: AI,
    summary: 'Translation, language detection, smart replies and entity extraction, all offline.',
    plain:
      'Language tools that work without a connection: translate between 58 languages, work out what language some text is in, suggest replies to a conversation, and pull out things like dates, addresses and tracking numbers.',
    description:
      'Wraps the ML Kit language stack through pixel-nano: language-id, translate, smart-reply and entity-extraction. Translation models download per language pair on first use and then run entirely offline, which is why the first call for a new pair is slower. Smart reply takes a short conversation history and proposes replies. Entity extraction returns typed spans with their positions in the original string.',
    signature: 'useNaturalLanguageAI(): NaturalLanguageState',
    params: [],
    returns: [
      { name: 'isProcessing', type: 'boolean', desc: 'True while any language operation runs.' },
      { name: 'languageResult', type: 'LanguageIdResult | null', desc: 'Detected BCP-47 code plus alternatives with confidence scores.' },
      { name: 'translationResult', type: 'TranslationResult | null', desc: 'Translated text with the source and target languages.' },
      { name: 'smartReplyResult', type: 'SmartReplyResult | null', desc: 'Suggested replies for the supplied conversation.' },
      { name: 'entityResult', type: 'EntityExtractionResult | null', desc: 'Typed entities with their start and end offsets.' },
      { name: 'error', type: 'string | null', desc: 'Why the last operation failed.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'identifyLanguage(text)',
        type: '(text: string) => Promise<LanguageIdResult | null>',
        desc: 'Detects the language of a sample. Run it before translating when the source is unknown.',
        inputs: [{ name: 'text', type: 'string', desc: 'A sample; a few words is usually enough.' }],
        output: 'Resolves with { languageCode, possibleLanguages, latencyMs, source } — languageCode is null when nothing was confident enough — or null on failure.',
      },
      {
        name: 'translate(text, from?, to?)',
        type: '(text: string, sourceLang?: string, targetLang?: string) => Promise<TranslationResult | null>',
        desc: 'Translates offline. The first call for a language pair downloads that model, so it is slower than the ones after it.',
        inputs: [
          { name: 'text', type: 'string', desc: 'The text to translate.' },
          { name: 'sourceLang', type: 'string | undefined', desc: "BCP-47 language code of the input. Defaults to 'en'." },
          { name: 'targetLang', type: 'string | undefined', desc: "BCP-47 language code to translate into. Defaults to 'es'." },
        ],
        output: 'Resolves with { translatedText, sourceLanguage, targetLanguage, latencyMs, source }, or null on failure.',
      },
      {
        name: 'suggestReplies(history)',
        type: '(history: { text: string; timestamp?: number; isLocalUser?: boolean; sender?: string }[]) => Promise<SmartReplyResult | null>',
        desc: 'Proposes short replies for the end of a conversation.',
        inputs: [{ name: 'history', type: 'Array<{ text, timestamp?, isLocalUser?, sender? }>', desc: "Messages in order. isLocalUser marks this user's own messages, so the model replies to the other party." }],
        output: 'Resolves with { suggestions, status, latencyMs, source }. suggestions is empty when the model has nothing confident to offer; null on failure.',
      },
      {
        name: 'extractEntities(text)',
        type: '(text: string) => Promise<EntityExtractionResult | null>',
        desc: 'Finds dates, addresses, money, phone numbers, flight numbers and tracking codes.',
        inputs: [{ name: 'text', type: 'string', desc: 'The text to scan.' }],
        output: 'Resolves with { entities, latencyMs, source }; each entity carries type, text and the start and end offsets into your input. Null on failure.',
      },
    ],
    example: `import { useNaturalLanguageAI } from 'pixelkit';

async function localise(text: string, nlp) {
  const { languageCode } = await nlp.identifyLanguage(text);
  if (!languageCode || languageCode === 'en') return text;
  const out = await nlp.translate(text, languageCode, 'en');
  return out.translatedText;
}`,
    agentNote:
      'Warn the user that a first translation for a new language pair downloads a model. Do not assume identifyLanguage succeeds; languageCode can be null for very short input.',
  },
  {
    id: 'useVisionAI',
    name: 'useVisionAI',
    category: 'ai',
    chipBadge: 'ML Kit Vision + Gemini multimodal',
    badgeColor: AI,
    summary: 'Nine on-device vision capabilities, plus cloud scene understanding.',
    plain:
      'Everything image-related in one hook. Locally it can read text, scan barcodes, find faces and poses, label objects and cut out the subject. For open-ended questions about a picture it can also send the image to Gemini.',
    description:
      'The on-device half wraps the ML Kit vision models through pixel-nano and runs without a network: barcode scanning, text recognition v2, face detection with landmarks and head angles, 468-point face mesh, image labelling, object detection with tracking, 33-point pose detection, selfie and subject segmentation, and digital ink recognition. The cloud half sends a captured or picked image to Gemini and asks for a description plus structured labels. Each on-device call reports its own latency.',
    signature: 'useVisionAI(): VisionState',
    params: [],
    returns: [
      { name: 'selectedImageUri', type: 'string | null', desc: 'Image currently loaded, from the camera or the picker.' },
      { name: 'analysis', type: 'VisionAnalysisResult | null', desc: 'Cloud description and labels with latency.' },
      { name: 'isAnalyzing', type: 'boolean', desc: 'True during a cloud call.' },
      { name: 'isOnDeviceProcessing', type: 'boolean', desc: 'True during any local vision call.' },
      { name: 'ocrResult', type: 'TextRecognitionResult | null', desc: 'Recognised text with per-block bounding boxes.' },
      { name: 'barcodeResult', type: 'BarcodeScanResult | null', desc: 'Decoded barcodes with format and position.' },
      { name: 'facesResult', type: 'FaceDetectionResult | null', desc: 'Faces with head angles, smile and eye-open probabilities.' },
      { name: 'faceMeshResult', type: 'FaceMeshResult | null', desc: '468-point mesh for close-range faces.' },
      { name: 'labelsResult', type: 'ImageLabelResult | null', desc: 'Concept labels with confidence.' },
      { name: 'objectsResult', type: 'ObjectDetectionResult | null', desc: 'Detected objects with tracking ids across frames.' },
      { name: 'poseResult', type: 'PoseDetectionResult | null', desc: '33 skeletal landmarks with in-frame likelihood.' },
      { name: 'selfieResult', type: 'SelfieSegmentationResult | null', desc: 'Person-versus-background mask dimensions.' },
      { name: 'subjectResult', type: 'SubjectSegmentationResult | null', desc: 'Foreground subject cut-out result.' },
      { name: 'digitalInkResult', type: 'DigitalInkResult | null', desc: 'Handwriting candidates from stroke input.' },
      { name: 'error', type: 'string | null', desc: 'Why the last call failed.' },
      { name: 'model', type: 'string', desc: 'Cloud model used for scene analysis.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'captureAndAnalyze(useCamera?)',
        type: '(useCamera?: boolean) => Promise<VisionAnalysisResult | null>',
        desc: 'Takes or picks a photo and sends it to Gemini for a description and labels.',
        inputs: [{ name: 'useCamera', type: 'boolean | undefined', desc: 'True opens the camera and asks for permission, false opens the library. Defaults to true.' }],
        output: 'Resolves with { description, labels, latencyMs, timestamp }, or null when the user cancelled, no API key is configured, or the call failed.',
      },
      {
        name: 'pickImage(useCamera?)',
        type: '(useCamera?: boolean) => Promise<{ uri: string; base64?: string } | null>',
        desc: 'Opens the camera or the library and loads an image without analysing it.',
        inputs: [{ name: 'useCamera', type: 'boolean | undefined', desc: 'True for the camera, false for the library. Defaults to true.' }],
        output: 'Resolves with the file URI and base64 copy, also stored in selectedImageUri and selectedImageBase64. Null when cancelled or permission was refused.',
      },
      {
        name: 'recognizeText(image)',
        type: '(imageInput: string) => Promise<TextRecognitionResult | null>',
        desc: 'Reads text from an image, on the device.',
        inputs: [{ name: 'imageInput', type: 'string', desc: 'A file URI or a base64 image.' }],
        output: 'Resolves with { text, blocks, latencyMs, source }; blocks keep the line and bounding-box structure. Null on failure.',
      },
      {
        name: 'scanBarcodes(image)',
        type: '(imageInput: string) => Promise<BarcodeScanResult | null>',
        desc: 'Finds and decodes 1D and 2D codes, including QR.',
        inputs: [{ name: 'imageInput', type: 'string', desc: 'A file URI or a base64 image.' }],
        output: 'Resolves with { barcodes, latencyMs, source }; each barcode carries rawValue, displayValue, format, valueType and a bounding box. Null on failure.',
      },
      {
        name: 'detectFaces(image)',
        type: '(imageInput: string) => Promise<FaceDetectionResult | null>',
        desc: 'Locates faces and their attributes.',
        inputs: [{ name: 'imageInput', type: 'string', desc: 'A file URI or a base64 image.' }],
        output: 'Resolves with { faces, latencyMs, source }; each face carries a tracking id, head Euler angles, a bounding box, and smile and eye-open probabilities that are null when classification is off. Null on failure.',
      },
      {
        name: 'detectObjects(image)',
        type: '(imageInput: string) => Promise<ObjectDetectionResult | null>',
        desc: 'Detects and tracks objects with labels.',
        inputs: [{ name: 'imageInput', type: 'string', desc: 'A file URI or a base64 image.' }],
        output: 'Resolves with { objects, latencyMs, source }; each object carries a tracking id, a bounding box and labels with confidences. Null on failure.',
      },
      {
        name: 'detectPose(image)',
        type: '(imageInput: string) => Promise<PoseDetectionResult | null>',
        desc: 'Estimates body pose landmarks.',
        inputs: [{ name: 'imageInput', type: 'string', desc: 'A file URI or a base64 image.' }],
        output: 'Resolves with { landmarks, latencyMs, source } — 33 landmarks, each with a type, x, y and an in-frame likelihood. Null on failure.',
      },
      {
        name: 'segmentSubject(image)',
        type: '(imageInput: string) => Promise<SubjectSegmentationResult | null>',
        desc: 'Separates the main subject from the background.',
        inputs: [{ name: 'imageInput', type: 'string', desc: 'A file URI or a base64 image.' }],
        output: 'Resolves with { subjectsCount, foregroundConfidence, latencyMs, source }. Null on failure.',
      },
    ],
    example: `import { useVisionAI } from 'pixelkit';

async function readLabel(uri: string, vision) {
  const ocr = await vision.recognizeText(uri);   // stays on the device
  return ocr.text;
}`,
    agentNote:
      'Prefer the on-device calls: they are faster, work offline and never send the image anywhere. Only use captureAndAnalyze when the question is genuinely open-ended.',
  },
];
