/**
 * Fallback cover metadata.
 *
 * Phase 1 intentionally does not download remote branded cover assets.
 */

export interface CoverMeta {
  hue: string;
  tone: string;
  mood: string;
}

export const COVER_PALETTE: Record<string, CoverMeta> = {
  'blue-clouds-oil': {
    hue: 'blue', tone: 'warm', mood: 'artistic',
  },
  'blue-light-wave': {
    hue: 'blue', tone: 'cool', mood: 'tech',
  },
  'city-skyline-painting': {
    hue: 'warm', tone: 'warm', mood: 'atmospheric',
  },
  'cyan-gradient': {
    hue: 'cyan', tone: 'cool', mood: 'clean',
  },
  'green-gradient': {
    hue: 'green', tone: 'cool', mood: 'fresh',
  },
  'lavender-silk': {
    hue: 'purple', tone: 'cool', mood: 'elegant',
  },
  'orange-warm': {
    hue: 'orange', tone: 'warm', mood: 'energetic',
  },
  'pink-blue-diagonal': {
    hue: 'pink', tone: 'cool', mood: 'modern',
  },
  'purple-teal-diagonal': {
    hue: 'purple', tone: 'cool', mood: 'tech',
  },
  'sunset-watercolor': {
    hue: 'orange', tone: 'warm', mood: 'artistic',
  },
  'warm-colorful-blur': {
    hue: 'warm', tone: 'warm', mood: 'energetic',
  },
};

export const COLOR_HUE_MAP: Record<string, string> = {
  '#3498db': 'blue', '#2980b9': 'blue', '#1abc9c': 'cyan',
  '#e74c3c': 'warm', '#c0392b': 'warm', '#e91e63': 'pink',
  '#2ecc71': 'green', '#27ae60': 'green',
  '#9b59b6': 'purple', '#8e44ad': 'purple',
  '#f39c12': 'orange', '#f1c40f': 'orange',
  '#34495e': 'blue', '#2c3e50': 'blue',
};
