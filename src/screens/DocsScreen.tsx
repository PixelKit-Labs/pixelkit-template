/**
 * @file DocsScreen.tsx
 * @description On-device API reference. Presentation only; the content lives in `docsData.ts`.
 *
 * Each module opens to a plain-language summary of what it is for, how it works underneath, its
 * inputs, everything it returns, the functions it exposes, a copyable example, and a note for
 * coding agents. Styling comes from the shared design tokens, so this screen matches the rest of
 * the app rather than looking like a separate document viewer.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useHaptics } from 'pixelkit';
import { Colors, Fonts, Radius, Type } from '../theme/colors';
import { HapticButton } from '../components/HapticButton';
import { ScreenHeader } from '../components/ScreenScaffold';
import { SectionHeader } from '../components/Decor';
import { DOC_MODULES, type DocField, type DocModule } from './docsData';
import { whereToTry } from '../core/surface';

type CategoryFilter = 'all' | 'primer' | DocModule['category'];

const countOf = (c: DocModule['category']) => DOC_MODULES.filter((m) => m.category === c).length;

/** Filter chips. Counts derive from the data so they cannot drift out of date. */
const CATEGORIES: { key: CategoryFilter; label: string; count: number | null }[] = [
  { key: 'all', label: 'All', count: DOC_MODULES.length },
  { key: 'primer', label: 'AI primer', count: null },
  { key: 'silicon', label: 'Silicon', count: countOf('silicon') },
  { key: 'pro', label: 'Pro', count: countOf('pro') },
  { key: 'ai', label: 'Neural & AI', count: countOf('ai') },
  { key: 'sensors', label: 'Sensors', count: countOf('sensors') },
  { key: 'radios', label: 'Radios', count: countOf('radios') },
  { key: 'system', label: 'System', count: countOf('system') },
];

const GOLDEN_RULES: { title: string; text: string }[] = [
  { title: 'Single import', text: "Import every hook and component from 'pixelkit'. Never re-implement a raw listener." },
  { title: 'Provenance, not guesses', text: 'Read source on every hook. Render null as an em dash and never substitute a plausible default.' },
  { title: 'Tactile feedback', text: 'Attach useHaptics to every touchable, through HapticButton where possible.' },
  { title: 'Thermal and frame budget', text: 'Check useADPF() before heavy work and respect the 8.33 ms budget at 120 Hz.' },
  { title: 'Secure storage', text: 'Persist secrets only through useSecurity().saveSecureItem(), backed by the Android Keystore.' },
];

const SYSTEM_PROMPT_DIRECTIVE = `You are building an application with the PixelKit SDK on a Google Pixel 11 Pro.

1. Import every hardware and AI hook from 'pixelkit'.
2. Call useCapabilities() before offering any Pro-exclusive feature; never hardcode a device assumption.
3. Read each hook's source field. Render an unreadable value as "—" and never substitute a default.
4. Attach haptic feedback to every touchable, preferably via HapticButton.
5. Check useADPF().thermalHeadroom before sustained work and respect the 8.33 ms frame budget at 120 Hz.
6. Prefer on-device AI (useGeminiNano, useGenAITasks, useNaturalLanguageAI, useVisionAI) over the cloud when it can do the job.
7. Store secrets only through useSecurity().saveSecureItem().`;

/**
 * One documented field: name, type, and what it means. For a callable it also renders each
 * argument it takes and what the call gives back, so a caller never has to guess either side.
 */
const FieldRow: React.FC<{ field: DocField }> = ({ field }) => (
  <View style={styles.fieldRow}>
    <View style={styles.fieldHead}>
      <Text style={styles.fieldName}>{field.name}</Text>
      <Text style={styles.fieldType}>{field.type}</Text>
    </View>
    <Text style={styles.fieldDesc}>{field.desc}</Text>

    {field.inputs && field.inputs.length > 0 && (
      <View style={styles.fieldIo}>
        <Text style={styles.fieldIoLabel}>TAKES</Text>
        {field.inputs.map((input) => (
          <View key={input.name} style={styles.fieldIoRow}>
            <Text style={styles.fieldIoName}>
              {input.name}
              <Text style={styles.fieldIoType}>{` ${input.type}`}</Text>
            </Text>
            <Text style={styles.fieldDesc}>{input.desc}</Text>
          </View>
        ))}
      </View>
    )}

    {field.output ? (
      <View style={styles.fieldIo}>
        <Text style={styles.fieldIoLabel}>GIVES BACK</Text>
        <Text style={styles.fieldDesc}>{field.output}</Text>
      </View>
    ) : null}
  </View>
);

export const DocsScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const { selection, success, light } = useHaptics();

  const handleCopy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    await success();
    setCopiedNotification(`Copied ${label}`);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DOC_MODULES.filter((mod) => {
      const matchesCategory = selectedCategory === 'all' || mod.category === selectedCategory;
      if (!matchesCategory) return false;
      if (q === '') return true;
      const haystack = [
        mod.name,
        mod.summary,
        mod.plain,
        mod.chipBadge,
        mod.agentNote,
        ...mod.returns.map((r) => r.name),
        ...mod.actions.map((a) => a.name),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery, selectedCategory]);

  const toggleExpand = (id: string) => {
    light();
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ScreenHeader
        title="Docs"
        subtitle={`${DOC_MODULES.length} hooks · every input, output and function · each one says where to try it`}
      />

      {copiedNotification && (
        <View style={styles.toast}>
          <View style={styles.toastDot} />
          <Text style={styles.toastText}>{copiedNotification}</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchPanel}>
        <View style={styles.specular} />
        <Text style={styles.searchLabel}>FIND</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="hook, field or keyword"
          placeholderTextColor={Colors.dark.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => {
              setSearchQuery('');
              selection();
            }}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearButtonText}>CLEAR</Text>
          </Pressable>
        )}
      </View>

      {/* Category filter. One accent: selected is cyan, everything else is muted. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              onPress={() => {
                setSelectedCategory(cat.key);
                selection();
              }}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
              {cat.count != null && (
                <Text style={[styles.chipCount, active && styles.chipCountActive]}>{cat.count}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* AI primer. Violet: this panel is about the model, not about hardware. */}
      {(selectedCategory === 'primer' || (selectedCategory === 'all' && searchQuery === '')) && (
        <View style={styles.primerPanel}>
          <View style={styles.specular} />
          <View style={styles.primerHeaderRow}>
            <Text style={styles.primerTitle}>Working in this SDK</Text>
            <View style={styles.primerBadge}>
              <Text style={styles.primerBadgeText}>AGENT GUIDE</Text>
            </View>
          </View>

          <Text style={styles.primerBody}>
            Five rules an agent follows when writing code against this device.
          </Text>

          <View style={styles.rulesList}>
            {GOLDEN_RULES.map((rule, idx) => (
              <View key={rule.title} style={styles.ruleRow}>
                <Text style={styles.ruleNum}>{String(idx + 1).padStart(2, '0')}</Text>
                <View style={styles.ruleBody}>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                  <Text style={styles.ruleText}>{rule.text}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.promptBox}>
            <Text style={styles.blockLabel}>SYSTEM PROMPT</Text>
            <Text style={styles.promptBoxCode}>{SYSTEM_PROMPT_DIRECTIVE}</Text>
            <HapticButton
              title="Copy system prompt"
              onPress={() => handleCopy(SYSTEM_PROMPT_DIRECTIVE, 'system prompt')}
              variant="outline"
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      )}

      {/* Modules */}
      {selectedCategory !== 'primer' && (
        <View style={styles.modulesSection}>
          <SectionHeader title="Modules" hint={`${filteredModules.length} of ${DOC_MODULES.length}`} />

          {filteredModules.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nothing matches “{searchQuery}”</Text>
            </View>
          ) : (
            filteredModules.map((mod) => {
              const isExpanded = expandedId === mod.id;
              return (
                <View key={mod.id} style={[styles.moduleCard, isExpanded && styles.moduleCardOpen]}>
                  <View style={styles.specular} />
                  <Pressable
                    onPress={() => toggleExpand(mod.id)}
                    style={styles.moduleCardHeader}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                  >
                    <View style={styles.moduleNameRow}>
                      <Text style={styles.moduleName}>{mod.name}</Text>
                      <View style={[styles.moduleBadge, { borderColor: `${mod.badgeColor}66` }]}>
                        <Text style={[styles.moduleBadgeText, { color: mod.badgeColor }]}>
                          {mod.chipBadge}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.moduleSummary}>{mod.summary}</Text>
                    <View style={styles.expandRow}>
                      <Text style={styles.expandGlyph}>{isExpanded ? '−' : '+'}</Text>
                      <Text style={styles.expandText}>
                        {isExpanded
                          ? 'Hide details'
                          : `${mod.returns.length} returns · ${mod.actions.length} actions`}
                      </Text>
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {/* Where the reader can actually try it, from the surface map. */}
                      {whereToTry(mod.id) ? (
                        <>
                          <Text style={styles.blockLabel}>WHERE TO TRY IT</Text>
                          <Text style={styles.whereText}>{whereToTry(mod.id)}</Text>
                        </>
                      ) : null}

                      {/* What it does, in plain language */}
                      <Text style={[styles.blockLabel, styles.blockSpaced]}>WHAT IT DOES</Text>
                      <Text style={styles.plainText}>{mod.plain}</Text>

                      {/* How it works underneath */}
                      <Text style={[styles.blockLabel, styles.blockSpaced]}>HOW IT WORKS</Text>
                      <Text style={styles.expandedDesc}>{mod.description}</Text>

                      <Text style={[styles.blockLabel, styles.blockSpaced]}>SIGNATURE</Text>
                      <Text style={styles.signatureValue}>{mod.signature}</Text>

                      {/* Inputs */}
                      <Text style={[styles.blockLabel, styles.blockSpaced]}>
                        {mod.params.length === 0 ? 'INPUTS · none' : 'INPUTS'}
                      </Text>
                      {mod.params.length === 0 ? (
                        <Text style={styles.noneText}>Takes no arguments.</Text>
                      ) : (
                        mod.params.map((p) => <FieldRow key={p.name} field={p} />)
                      )}

                      {/* Returns */}
                      <Text style={[styles.blockLabel, styles.blockSpaced]}>
                        {`RETURNS · ${mod.returns.length}`}
                      </Text>
                      {mod.returns.map((r) => (
                        <FieldRow key={r.name} field={r} />
                      ))}

                      {/* Actions */}
                      {mod.actions.length > 0 && (
                        <>
                          <Text style={[styles.blockLabel, styles.blockSpaced]}>
                            {`ACTIONS · ${mod.actions.length}`}
                          </Text>
                          {mod.actions.map((a) => (
                            <FieldRow key={a.name} field={a} />
                          ))}
                        </>
                      )}

                      {/* Example */}
                      <View style={styles.codeBlock}>
                        <View style={styles.codeHeaderRow}>
                          <Text style={styles.blockLabel}>EXAMPLE</Text>
                          <Pressable
                            onPress={() => handleCopy(mod.example, `${mod.name} example`)}
                            style={styles.copyButton}
                            accessibilityRole="button"
                            accessibilityLabel={`Copy ${mod.name} example`}
                          >
                            <Text style={styles.copyButtonText}>COPY</Text>
                          </Pressable>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <Text style={styles.codeText}>{mod.example}</Text>
                        </ScrollView>
                      </View>

                      <View style={styles.agentNote}>
                        <Text style={styles.agentNoteLabel}>AGENT NOTE</Text>
                        <Text style={styles.agentNoteText}>{mod.agentNote}</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          PixelKit · Expo SDK 57 · React Native 0.86 · Google Pixel 11 Pro
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

  /** 1px top highlight that gives every panel its edge. */
  specular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.dark.specular,
  },

  header: {
    marginBottom: 18,
  },
  headerTitle: {
    ...Type.title,
    color: Colors.dark.text,
  },
  headerSubtitle: {
    ...Type.mono,
    color: Colors.dark.textMuted,
    marginTop: 4,
  },

  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.success}1A`,
    borderWidth: 1,
    borderColor: `${Colors.dark.success}59`,
    borderRadius: Radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  toastDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.success,
    marginRight: 8,
  },
  toastText: {
    ...Type.micro,
    color: Colors.dark.success,
  },

  searchPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  searchLabel: {
    ...Type.micro,
    color: Colors.dark.textMuted,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 46,
    ...Type.mono,
    fontSize: 13,
    color: Colors.dark.text,
    padding: 0,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  clearButtonText: {
    ...Type.micro,
    color: Colors.dark.textMuted,
  },

  chipsRow: {
    marginBottom: 18,
    marginHorizontal: -16,
  },
  chipsContent: {
    paddingHorizontal: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Colors.dark.primaryContainer,
    borderColor: `${Colors.dark.primary}80`,
  },
  chipText: {
    ...Type.micro,
    color: Colors.dark.textMuted,
  },
  chipTextActive: {
    color: Colors.dark.primary,
  },
  chipCount: {
    ...Type.micro,
    color: Colors.dark.textMuted,
    opacity: 0.6,
    marginLeft: 6,
  },
  chipCountActive: {
    color: Colors.dark.primary,
    opacity: 0.8,
  },

  primerPanel: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${Colors.dark.tensorGlow}59`,
    padding: 16,
    marginBottom: 22,
    overflow: 'hidden',
  },
  primerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  primerTitle: {
    ...Type.heading,
    color: Colors.dark.text,
    flexShrink: 1,
  },
  primerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: `${Colors.dark.tensorGlow}66`,
    backgroundColor: `${Colors.dark.tensorGlow}1A`,
  },
  primerBadgeText: {
    ...Type.micro,
    color: Colors.dark.tensorGlow,
  },
  primerBody: {
    ...Type.caption,
    color: Colors.dark.textMuted,
    marginBottom: 14,
  },
  rulesList: {
    marginBottom: 16,
  },
  ruleRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  ruleNum: {
    ...Type.micro,
    color: Colors.dark.primary,
    width: 24,
    marginTop: 2,
  },
  ruleBody: {
    flex: 1,
  },
  ruleTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  ruleText: {
    ...Type.caption,
    color: Colors.dark.textMuted,
  },

  promptBox: {
    backgroundColor: Colors.dark.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 12,
  },
  promptBoxCode: {
    ...Type.mono,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.dark.textMuted,
    marginTop: 8,
  },

  blockLabel: {
    ...Type.label,
    color: Colors.dark.textMuted,
  },
  blockSpaced: {
    marginTop: 18,
  },

  modulesSection: {
    marginBottom: 8,
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    ...Type.caption,
    color: Colors.dark.textMuted,
  },

  moduleCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    marginBottom: 10,
    overflow: 'hidden',
  },
  moduleCardOpen: {
    borderColor: `${Colors.dark.primary}4D`,
  },
  moduleCardHeader: {
    padding: 14,
  },
  moduleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  moduleName: {
    fontFamily: Fonts.monoSemi,
    fontSize: 15,
    color: Colors.dark.text,
    flexShrink: 1,
  },
  moduleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  moduleBadgeText: {
    ...Type.micro,
  },
  moduleSummary: {
    ...Type.caption,
    color: Colors.dark.textMuted,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  expandGlyph: {
    fontFamily: Fonts.monoSemi,
    fontSize: 13,
    color: Colors.dark.primary,
    width: 14,
  },
  expandText: {
    ...Type.micro,
    color: Colors.dark.primary,
  },

  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  /** Plain-language explanation: larger and in body text, because it is read first. */
  whereText: {
    ...Type.caption,
    color: Colors.dark.primary,
    marginTop: 3,
  },
  plainText: {
    ...Type.body,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.dark.text,
    marginTop: 8,
  },
  expandedDesc: {
    ...Type.caption,
    color: Colors.dark.textMuted,
    marginTop: 8,
  },
  signatureValue: {
    ...Type.mono,
    color: Colors.dark.primary,
    marginTop: 8,
  },
  noneText: {
    ...Type.caption,
    color: Colors.dark.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },

  /** One documented field. */
  fieldRow: {
    marginTop: 12,
    borderLeftWidth: 1,
    borderLeftColor: Colors.dark.cardBorder,
    paddingLeft: 12,
  },
  fieldHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 8,
  },
  fieldName: {
    fontFamily: Fonts.monoSemi,
    fontSize: 12,
    color: Colors.dark.text,
  },
  fieldType: {
    ...Type.mono,
    fontSize: 11,
    color: Colors.dark.primary,
    opacity: 0.85,
    flexShrink: 1,
  },
  fieldDesc: {
    ...Type.caption,
    color: Colors.dark.textMuted,
    marginTop: 3,
  },
  /** Inputs and output of a callable, nested under it. */
  fieldIo: {
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: Colors.dark.cardBorder,
  },
  fieldIoLabel: {
    ...Type.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.dark.textMuted,
    opacity: 0.7,
  },
  fieldIoRow: {
    marginTop: 4,
  },
  fieldIoName: {
    fontFamily: Fonts.monoSemi,
    fontSize: 11,
    color: Colors.dark.text,
  },
  fieldIoType: {
    ...Type.mono,
    fontSize: 10,
    color: Colors.dark.primary,
    opacity: 0.85,
  },

  codeBlock: {
    backgroundColor: Colors.dark.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 12,
    marginTop: 20,
  },
  codeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  copyButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: `${Colors.dark.primary}59`,
  },
  copyButtonText: {
    ...Type.micro,
    color: Colors.dark.primary,
  },
  codeText: {
    ...Type.mono,
    fontSize: 11,
    lineHeight: 17,
    color: Colors.dark.text,
  },

  agentNote: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.dark.warning,
    paddingLeft: 12,
    marginTop: 18,
  },
  agentNoteLabel: {
    ...Type.micro,
    color: Colors.dark.warning,
    marginBottom: 4,
  },
  agentNoteText: {
    ...Type.caption,
    color: Colors.dark.textMuted,
  },

  footer: {
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    ...Type.micro,
    color: Colors.dark.textMuted,
    opacity: 0.7,
    textAlign: 'center',
  },
});
