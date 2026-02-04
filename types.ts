export type CaptionPosition = 'TOP' | 'MIDDLE' | 'BOTTOM' | 'CUSTOM';
export type TextAlign = 'left' | 'center' | 'right';
export type LanguageMode = 'PURE_TELUGU' | 'TELGLISH' | 'ENGLISH' | 'AUTO';

export interface Caption {
  id: string;
  startTime: number; 
  endTime: number; 
  text: string;
  language?: string;
  confidence?: number;
  highlightIndices?: number[]; 
  sentiment?: 'energetic' | 'calm' | 'serious' | 'joyful';
  position?: CaptionPosition;
  customScale?: number; 
  customPosition?: CaptionPosition; 
  wordColors?: string[]; // Array of hex codes matching the word count
}

export enum CaptionStyle {
  DEFAULT = 'DEFAULT',
  HORMOZI_VAR1 = 'HORMOZI_VAR1',
  HORMOZI_VAR2 = 'HORMOZI_VAR2',
  BEAST_MODE = 'BEAST_MODE',
  KARAOKE_NEON = 'KARAOKE_NEON',
  GLITCH_CYBER = 'GLITCH_CYBER',
  MINIMAL_BOX = 'MINIMAL_BOX',
  TYPEWRITER = 'TYPEWRITER',
  DESI_VLOG = 'DESI_VLOG',
  TAMIL_THALAIVA = 'TAMIL_THALAIVA',
  RAPID_SPRINT = 'RAPID_SPRINT',
  WORD_HORMOZI_FOCUS = 'WORD_HORMOZI_FOCUS',
  WORD_FUTURE_NEON = 'WORD_FUTURE_NEON',
  WORD_GLITCH_CHAOS = 'WORD_GLITCH_CHAOS',
  WORD_RETRO_PIXEL = 'WORD_RETRO_PIXEL',
  WORD_LUXURY_SERIF = 'WORD_LUXURY_SERIF',
  WORD_COMIC_IMPACT = 'WORD_COMIC_IMPACT',
  WORD_VLOG_AESTHETIC = 'WORD_VLOG_AESTHETIC',
  WORD_BOLD_SPORTS = 'WORD_BOLD_SPORTS',
  WORD_GAME_STREAMER = 'WORD_GAME_STREAMER',
  WORD_NOIR_CRIME = 'WORD_NOIR_CRIME',
  WORD_INSTA_POP = 'WORD_INSTA_POP',
  WORD_GRADIENT_DREAM = 'WORD_GRADIENT_DREAM',
  WORD_TAPE_HIGHLIGHT = 'WORD_TAPE_HIGHLIGHT',
  WORD_NEON_STORM = 'WORD_NEON_STORM',
  WORD_SUPER_3D = 'WORD_SUPER_3D',
  WORD_LYRICIST_OUTLINE = 'WORD_LYRICIST_OUTLINE',
  BLOCK_CLEAN_FOCUS = 'BLOCK_CLEAN_FOCUS',
  BLOCK_CINEMATIC_FADE = 'BLOCK_CINEMATIC_FADE',
  WORD_SOFT_GLOW = 'WORD_SOFT_GLOW',
  WORD_ACTIVE_BOX = 'WORD_ACTIVE_BOX',
  COLOR_POP_VIRAL = 'COLOR_POP_VIRAL',
  VIRAL_COMIC = 'VIRAL_COMIC',
  VIRAL_PRO_CLEAN = 'VIRAL_PRO_CLEAN',
  VIRAL_LOUD_NEON = 'VIRAL_LOUD_NEON',
  VIRAL_HYPER_BOLD = 'VIRAL_HYPER_BOLD',
  CUSTOM = 'CUSTOM'
}

export type AnimationType = 'NONE' | 'POP' | 'SCALE_UP' | 'KARAOKE' | 'TYPEWRITER';
export type DisplayMode = 'BLOCK' | 'WORD';
export type StyleCategory = 'BOLD' | 'NEON' | 'MINIMAL' | 'ART' | 'GLOW' | 'HIGHLIGHT' | 'VIRAL' | 'CUSTOM';

export interface StyleConfig {
  name: string;
  category: StyleCategory;
  fontFamily: string;
  fontSize: number; 
  fontWeight: string | number;
  textColor: string;
  textAlign?: TextAlign;
  gradientColors?: string[]; 
  activeTextColor?: string; 
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundColor?: string;
  backgroundPadding?: number;
  backgroundBorderRadius?: number;
  activeBackgroundColor?: string; 
  rotationVariance?: number; 
  useOutlineForInactive?: boolean; 
  opacityInactive?: number; 
  animation: AnimationType;
  displayMode: DisplayMode;
  uppercase?: boolean;
}

export interface ProcessingStats {
  transcriptionTime: number;
  wordCount: number;
  confidenceScore: number;
  languageDetected: string;
}

export type ProcessingStatus = 'IDLE' | 'UPLOADING' | 'TRANSCRIBING' | 'READY' | 'EXPORTING';