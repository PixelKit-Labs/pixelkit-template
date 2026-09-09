/**
 * @file HapticButton.tsx
 * @description Button with haptic feedback. Two weights, per the design system: solid (accent or
 * danger) for the one affirmative action in a group, outlined for everything secondary. `ghost` is
 * text-only. Hit target is at least 44 dp.
 */

import React from 'react';
import { Pressable, Text, StyleSheet, View, ViewStyle, TextStyle, StyleProp, Platform } from 'react-native';
import { HapticType, useHaptics } from '@pixelkit-labs/sdk';
import { Colors, Fonts, Radius } from '../theme/colors';

/** `primary` and `cta` are solid accent; `secondary` and `outline` are outlined; `danger` is solid red. */
export type HapticButtonVariant = 'primary' | 'cta' | 'secondary' | 'outline' | 'danger' | 'ghost';

export interface HapticButtonProps {
  title?: string;
  onPress: () => void;
  /** Haptic pattern played on tap (default: 'light') */
  hapticType?: HapticType;
  variant?: HapticButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  /** Rendered before the label, or alone if title is omitted */
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  numberOfLines?: number;
}

const SIZES = {
  sm: { minHeight: 36, paddingHorizontal: 12, fontSize: 12 },
  md: { minHeight: 44, paddingHorizontal: 16, fontSize: 14 },
  lg: { minHeight: 52, paddingHorizontal: 20, fontSize: 15 },
};

export const HapticButton: React.FC<HapticButtonProps> = ({
  title,
  onPress,
  hapticType = 'light',
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  disabled = false,
  icon,
  accessibilityLabel,
  numberOfLines,
}) => {
  const { triggerHaptic } = useHaptics();
  const s = SIZES[size];
  const solidAccent = variant === 'primary' || variant === 'cta';
  const solidDanger = variant === 'danger';

  const handlePress = () => {
    if (disabled) return;
    void triggerHaptic(hapticType);
    onPress();
  };

  const surface: ViewStyle = disabled
    ? { backgroundColor: Colors.dark.surfaceVariant, opacity: 0.5 }
    : solidAccent
      ? { backgroundColor: Colors.dark.primary }
      : solidDanger
        ? { backgroundColor: Colors.dark.error }
        : variant === 'ghost'
          ? { backgroundColor: 'transparent' }
          : { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.dark.cardBorder };

  const color = disabled
    ? Colors.dark.textMuted
    : solidAccent || solidDanger
      ? Colors.dark.onPrimary
      : variant === 'ghost'
        ? Colors.dark.primary
        : Colors.dark.text;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        { minHeight: s.minHeight, paddingHorizontal: s.paddingHorizontal },
        surface,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon}
        {title ? (
          <Text
            style={[styles.text, { color, fontSize: s.fontSize, marginLeft: icon ? 8 : 0 }, textStyle]}
            numberOfLines={numberOfLines}
          >
            {title}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: Fonts.sansSemi,
    letterSpacing: Platform.OS === 'android' ? 0 : 0.1,
  },
});
