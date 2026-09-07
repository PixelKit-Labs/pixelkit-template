/**
 * @file colors.ts
 * @description PixelKit design tokens, aligned with the Delta console design system.
 *
 * Rules carried over from Delta:
 * - Colour carries meaning. Cyan is the one accent (the thing to press, the user). Green = well,
 *   red = wrong, amber = a human or a tool has to act, violet = external streams and the model.
 * - Near-black field with a blue cast; depth from hairlines and washes, not shadows or gradients.
 * - Geist for language, Geist Mono for every number and label. Numerals are tabular.
 * - Exactly one element is allowed to glow: the reactor on the dashboard.
 *
 * Primary tokens are 6-digit hex so callers can append a 2-digit alpha (`${primary}22`).
 */

import { Platform } from 'react-native';

export const Colors = {
  dark: {
    /** Page field: near-black with a blue cast (Delta --background) */
    background: '#0E1119',
    /** Opaque panel face (Delta --panel-solid) */
    surface: '#151925',
    /** Secondary surface: inputs, secondary buttons (white 8%) */
    surfaceVariant: 'rgba(255,255,255,0.08)',
    /** Panel wash (white 5.5%) */
    card: 'rgba(255,255,255,0.055)',
    /** Hairline (white 10%) */
    cardBorder: 'rgba(255,255,255,0.10)',
    /** The accent: cyan. Interactive, "you", the thing to press */
    primary: '#6FDCF2',
    /** Text that sits on a solid accent fill */
    onPrimary: '#101826',
    /** Low-alpha accent container (user bubbles, selected rows) */
    primaryContainer: '#123842',
    /** Violet: external streams and the model (Gemini) */
    secondary: '#A18BF6',
    /** Amber: a human or a tool must act */
    tertiary: '#F0BE4F',
    /** Alias of the accent for legacy callers */
    accent: '#6FDCF2',
    /** Body text */
    text: '#F4F5F8',
    /** Secondary text; clears 4.5:1 on the field */
    textMuted: '#A8ADB8',
    /** Well: connected, succeeded, within budget */
    success: '#46D786',
    /** Amber: caution, gated, tool activity */
    warning: '#F0BE4F',
    /** Wrong: failed, refused, over a limit */
    error: '#F25C55',
    /** The model / AI stack (violet, same as secondary) */
    tensorGlow: '#A18BF6',
    /** PixelKit itself (Delta --hud-persona) */
    persona: '#F09AC1',
    /** Specular hairline on panels (white 16%) */
    specular: 'rgba(255,255,255,0.16)',
  },
  light: {
    background: '#ECEEF3',
    surface: '#F5F6F9',
    surfaceVariant: 'rgba(0,0,0,0.06)',
    card: 'rgba(255,255,255,0.78)',
    cardBorder: 'rgba(0,0,0,0.10)',
    primary: '#1F7A9C',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D7EEF6',
    secondary: '#5B44C9',
    tertiary: '#9A6B00',
    accent: '#1F7A9C',
    text: '#171A22',
    textMuted: '#5E6472',
    success: '#1E8E4E',
    warning: '#9A6B00',
    error: '#C62842',
    tensorGlow: '#5B44C9',
    persona: '#B03A72',
    specular: 'rgba(255,255,255,0.95)',
  },
};

/** Scrims that give the glass something to refract. Vertical fades only; no gradient buttons. */
export const Gradients = {
  scrimCyan: ['rgba(111,220,242,0.10)', 'rgba(111,220,242,0.0)'] as const,
  scrimViolet: ['rgba(161,139,246,0.08)', 'rgba(161,139,246,0.0)'] as const,
  /** Kept for callers that still reference them; render as flat accent fills */
  primary: ['#6FDCF2', '#6FDCF2'] as const,
  danger: ['#F25C55', '#F25C55'] as const,
  hero: ['rgba(111,220,242,0.10)', 'rgba(111,220,242,0.0)'] as const,
  card: ['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.0)'] as const,
  glow: ['rgba(111,220,242,0.14)', 'rgba(111,220,242,0.0)'] as const,
};

/** Radii step down as elements nest. Panels 12, small boxes 8, pills only for real pills. */
export const Radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Font family names as registered with expo-font (see App.tsx). Android falls back silently until loaded. */
export const Fonts = {
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  sansSemi: 'Geist_600SemiBold',
  sansBold: 'Geist_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
  monoSemi: 'GeistMono_600SemiBold',
} as const;

/** Type scale. Language in Geist, machine output and labels in Geist Mono. */
export const Type = {
  display: { fontFamily: Fonts.sansSemi, fontSize: 30, letterSpacing: -0.6 },
  title: { fontFamily: Fonts.sansSemi, fontSize: 22, letterSpacing: -0.3 },
  heading: { fontFamily: Fonts.sansSemi, fontSize: 16 },
  body: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17 },
  /** Headline number on a tile: sans, proportional figures */
  value: { fontFamily: Fonts.sansSemi, fontSize: 28, letterSpacing: -0.5 },
  /** Section label: mono, 11px, semibold, 0.14em tracking */
  label: { fontFamily: Fonts.monoSemi, fontSize: 11, letterSpacing: Platform.OS === 'android' ? 0.6 : 1.5 },
  /** Machine output in lists and chips */
  mono: { fontFamily: Fonts.mono, fontSize: 12, fontVariant: ['tabular-nums'] as ['tabular-nums'] },
  micro: { fontFamily: Fonts.monoSemi, fontSize: 10, letterSpacing: Platform.OS === 'android' ? 0.4 : 0.8 },
};

/** Shape of the active theme color palette. */
export type ThemeColors = typeof Colors.dark;
