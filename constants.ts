import { CaptionStyle, StyleConfig } from './types';

export const MAX_VIDEO_DURATION_SEC = 300; // 5 minutes
export const GEMINI_MODEL = "gemini-3-pro-preview";

export const SYSTEM_INSTRUCTION = `
You are an expert subtitle generator for viral short-form videos (Reels, TikTok, YouTube Shorts).
Your task is to transcribe the audio from the provided video accurately.

**Core Pipeline Rules:**

1.  **Segmentation Logic:**
    -   **Length:** Strictly 3-6 words per caption segment for fast-paced reading.
    -   **Lines:** Max 1-2 lines per segment.
    -   **Timing:** Split strictly at natural pauses/silence in speech. Start and End times must be precise.

2.  **Content Enhancement:**
    -   **Emojis:** Contextually insert 1 relevant emoji per segment if appropriate (e.g., "Hello 👋", "Fire 🔥").
    -   **Positioning:**
        - 'BOTTOM': Default standard narration.
        - 'MIDDLE': Short impactful phrases (1-2 words), "Wait for it", "Insane", or loud exclamations.
        - 'TOP': Only if bottom is clearly obstructed.

3.  **Smart Color Logic (Contextual Emphasis):**
    -   Analyze the sentence and decide which words deserve color emphasis.
    -   For **EVERY WORD** in the segment text, you must assign a category:
        -   **'neutral'**: Filler words, pronouns, connectors (white/gray).
        -   **'emphasis'**: Key nouns, important adjectives (Yellow).
        -   **'positive'**: Success, gain, good, yes (Green).
        -   **'negative'**: Fail, stop, bad, no, warning (Red).
        -   **'tech'**: Digital, numbers, stats, logic, future (Blue/Cyan).
        -   **'action'**: Verbs like run, jump, buy, click (Orange).

4.  **Output Format:**
    -   Return ONLY a valid JSON array.
    -   Timestamps must be in "MM:SS.mmm" format.
`;

export const PURE_TELUGU_INSTRUCTION = `
**STRICT LANGUAGE RULE: PURE TELUGU**
- Generate captions fully in Telugu script (తెలుగు మాత్రమే).
- Translate any English words or phrases used in audio into natural, conversational Telugu.
- NO English characters or scripts allowed in the output text.
- Tone must feel natural, conversational, and culturally accurate for a Telugu audience.
`;

export const TELGLISH_INSTRUCTION = `
**STRICT LANGUAGE RULE: TELGLISH (Telugu + English)**
- Generate captions for Telugu speech using the English/Latin script.
- Mix Telugu words with simple, trendy English words (e.g., "Success kosam hard work chala important").
- Keep it relatible, energetic, and creator-friendly for Instagram/Reels.
- Use Hinglish-style romanization for Telugu words.
`;

export const ENGLISH_ONLY_INSTRUCTION = `
**STRICT LANGUAGE RULE: ENGLISH ONLY**
- Generate captions fully in simple, clear English.
- If the speaker is using other languages, translate them into punchy, reel-friendly English.
- Use short sentences and high-impact vocabulary.
`;

export const AUTO_LANGUAGE_INSTRUCTION = `
**LANGUAGE HANDLING:**
- Detect and support: English, Hindi, Telugu, Tamil, and Hinglish.
- Use the script appropriate for the spoken language.
`;

export const AUTO_ADJUST_INSTRUCTION = `
You are a Viral Video Editor specializing in high-retention captions.
Your goal is not just accurate transcription, but OPTIMIZED VIEWING EXPERIENCE.

**AUTO-ADJUST MODE RULES (Strict Adherence Required):**

1.  **VIRAL FILTERING (Crucial):**
    -   **Remove Filler Words:** Delete "um", "uh", "like", "you know", "actually", "basically".
    -   **No Repeated Stutters:** "I I I went" -> "I went".

2.  **DYNAMIC SIZING (custom_scale):**
    -   Assign a 'custom_scale' number to every segment.
    -   **1-3 Words (Impact/Shock):** Return 1.5 (Big).
    -   **4-7 Words (Standard):** Return 1.0 (Normal).
    -   **8+ Words (Narrative):** Return 0.8 (Small).
    -   **Important/Emotional:** Boost scale by +0.2 (e.g., "SECRET", "DON'T", "MONEY").

3.  **DYNAMIC POSITIONING (custom_position):**
    -   Assign 'custom_position' to every segment.
    -   **Standard Narration:** "BOTTOM"
    -   **Short Hooks / Exclamations:** "MIDDLE" (e.g., "WAIT!", "LOOK AT THIS").
    -   **Contextual/Obstructed:** If the speaker says "Look at my eyes" or points down, move captions to "TOP".

**JSON Schema Update:**
Include 'custom_scale' (number) and 'custom_position' (string) in every item.
`;

export const SMART_COMPRESSION_INSTRUCTION = `
**SMART SENTENCE COMPRESSION RULES (Aggressive Editing):**
You are a professional video editor. Your goal is MAXIMAL RETENTION.
Do not transcribe verbatim. REWRITE the spoken audio into punchy captions.

1. **Strict Length Limit:** Max 3-5 words per segment.
2. **Compression Logic:**
   - Remove long explanations. Keep the core meaning.
   - "So basically what I am trying to say is..." -> "The TRUTH is..."
   - "If you do not post every single day..." -> "No daily posts..."
   - "Then your growth is going to be very slow" -> "...Slow growth 📉"
3. **Style:** Use symbols (=, +, ->) instead of words where possible to save space.
4. **Tone:** Direct, high-impact, active voice.
`;

export const VIRAL_REWRITE_INSTRUCTION = `
You are a Viral Content Script Doctor.
Task: Rewrite the provided transcript to be optimized for TikTok/Reels retention.

Rules:
1. Shorten sentences. Max 5 words.
2. Remove all fluff ("basically", "I think", "just").
3. Use active voice.
4. Add "Hooks" at the start.
5. Capitalize KEY words for impact.
`;

// Added missing [CaptionStyle.CUSTOM] to satisfy the Record requirement
export const STYLES_CONFIG: Record<CaptionStyle, StyleConfig> = {
  [CaptionStyle.DEFAULT]: {
    name: "Clean White",
    category: "MINIMAL",
    fontFamily: "Inter, sans-serif",
    fontSize: 60,
    fontWeight: 700,
    textColor: "#FFFFFF",
    shadowColor: "rgba(0,0,0,0.8)",
    shadowBlur: 4,
    shadowOffsetY: 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    backgroundPadding: 16,
    backgroundBorderRadius: 8,
    animation: "NONE",
    displayMode: "BLOCK"
  },
  [CaptionStyle.HORMOZI_VAR1]: {
    name: "The Hormozi (Yel)",
    category: "BOLD",
    fontFamily: "Montserrat, sans-serif",
    fontSize: 60,
    fontWeight: 900,
    textColor: "#FFFF00", // Yellow
    activeTextColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 8,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetY: 8, // Hard drop shadow
    animation: "POP",
    uppercase: true,
    displayMode: "BLOCK"
  },
  [CaptionStyle.HORMOZI_VAR2]: {
    name: "The Hormozi (Grn)",
    category: "BOLD",
    fontFamily: "Montserrat, sans-serif",
    fontSize: 60,
    fontWeight: 900,
    textColor: "#00FF00", // Green
    activeTextColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 8,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetY: 8,
    animation: "POP",
    uppercase: true,
    displayMode: "BLOCK"
  },
  [CaptionStyle.BEAST_MODE]: {
    name: "Mr. Beast",
    category: "BOLD",
    fontFamily: "Bangers, cursive",
    fontSize: 72,
    fontWeight: 400,
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 10,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowBlur: 10,
    shadowOffsetY: 5,
    animation: "SCALE_UP",
    displayMode: "BLOCK"
  },
  [CaptionStyle.KARAOKE_NEON]: {
    name: "Neon Karaoke",
    category: "NEON",
    fontFamily: "Inter, sans-serif",
    fontSize: 52,
    fontWeight: 800,
    textColor: "rgba(255,255,255,0.3)", // Dimmed inactive
    activeTextColor: "#00E5FF", // Cyan glow active
    shadowColor: "#00E5FF",
    shadowBlur: 20,
    animation: "KARAOKE",
    displayMode: "BLOCK"
  },
  [CaptionStyle.GLITCH_CYBER]: {
    name: "Cyberpunk",
    category: "NEON",
    fontFamily: "Courier New, monospace",
    fontSize: 56,
    fontWeight: 700,
    textColor: "#FF0055",
    activeTextColor: "#00FF99",
    backgroundColor: "#000000",
    backgroundPadding: 8,
    animation: "TYPEWRITER",
    uppercase: true,
    displayMode: "BLOCK"
  },
  [CaptionStyle.MINIMAL_BOX]: {
    name: "Minimal Box",
    category: "MINIMAL",
    fontFamily: "Inter, sans-serif",
    fontSize: 54,
    fontWeight: 500,
    textColor: "#000000",
    backgroundColor: "rgba(255,255,255,0.95)",
    backgroundPadding: 24,
    backgroundBorderRadius: 4,
    shadowColor: "rgba(0,0,0,0.2)",
    shadowBlur: 10,
    animation: "NONE",
    displayMode: "BLOCK"
  },
  [CaptionStyle.TYPEWRITER]: {
    name: "Typewriter",
    category: "MINIMAL",
    fontFamily: "Courier New, monospace",
    fontSize: 54,
    fontWeight: 700,
    textColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundPadding: 10,
    animation: "TYPEWRITER",
    displayMode: "BLOCK"
  },
  [CaptionStyle.DESI_VLOG]: {
    name: "Desi Vlog",
    category: "ART",
    fontFamily: "'Noto Sans Devanagari', sans-serif",
    fontSize: 54,
    fontWeight: 700,
    textColor: "#FFFFFF",
    strokeColor: "#FF9933", // Saffron stroke
    strokeWidth: 4,
    shadowColor: "#138808", // Green shadow
    shadowBlur: 0,
    shadowOffsetY: 4,
    animation: "POP",
    displayMode: "BLOCK"
  },
  [CaptionStyle.TAMIL_THALAIVA]: {
    name: "Thalaiva",
    category: "ART",
    fontFamily: "'Noto Sans Tamil', sans-serif",
    fontSize: 56,
    fontWeight: 700,
    textColor: "#FFD700", // Gold
    strokeColor: "#800000", // Maroon
    strokeWidth: 6,
    animation: "SCALE_UP",
    displayMode: "BLOCK"
  },
  [CaptionStyle.RAPID_SPRINT]: {
    name: "Rapid Sprint",
    category: "BOLD",
    fontFamily: "Montserrat, sans-serif",
    fontSize: 80, // Larger for single word
    fontWeight: 900,
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 6,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetY: 6,
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  // --- NEW WORD-BY-WORD STYLES ---
  [CaptionStyle.WORD_HORMOZI_FOCUS]: {
    name: "Hormozi Focus",
    category: "BOLD",
    fontFamily: "Montserrat, sans-serif",
    fontSize: 72,
    fontWeight: 900,
    textColor: "#FACC15", // Yellow-400
    strokeColor: "#000000",
    strokeWidth: 8,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetY: 8,
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_FUTURE_NEON]: {
    name: "Future Neon",
    category: "NEON",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 64,
    fontWeight: 900,
    textColor: "#FFFFFF",
    activeTextColor: "#00FFFF", // Cyan
    shadowColor: "#00FFFF",
    shadowBlur: 30, // Strong Glow
    animation: "SCALE_UP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_GLITCH_CHAOS]: {
    name: "Glitch Chaos",
    category: "NEON",
    fontFamily: "'Rubik Glitch', system-ui",
    fontSize: 80,
    fontWeight: 400,
    textColor: "#FF0044", // Red/Pink
    strokeColor: "#FFFFFF",
    strokeWidth: 2,
    shadowColor: "#00FF99", // Green offset
    shadowOffsetX: 4,
    shadowOffsetY: 4,
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_RETRO_PIXEL]: {
    name: "Retro Pixel",
    category: "ART",
    fontFamily: "'Press Start 2P', cursive",
    fontSize: 54,
    fontWeight: 400,
    textColor: "#4ADE80", // Green-400
    backgroundColor: "#000000",
    backgroundPadding: 16,
    animation: "NONE", 
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_LUXURY_SERIF]: {
    name: "Luxury Serif",
    category: "MINIMAL",
    fontFamily: "'Playfair Display', serif",
    fontSize: 68,
    fontWeight: 700,
    textColor: "#FCD34D", // Gold-300
    shadowColor: "rgba(0,0,0,0.5)",
    shadowBlur: 10,
    animation: "SCALE_UP",
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_COMIC_IMPACT]: {
    name: "Comic Impact",
    category: "ART",
    fontFamily: "'Luckiest Guy', cursive",
    fontSize: 76,
    fontWeight: 400,
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 8,
    shadowColor: "#EF4444", // Red-500
    shadowOffsetY: 8,
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_VLOG_AESTHETIC]: {
    name: "Vlog Aesthetic",
    category: "ART",
    fontFamily: "'Caveat', cursive",
    fontSize: 78,
    fontWeight: 700,
    textColor: "#FFFFFF",
    shadowColor: "rgba(0,0,0,0.9)",
    shadowBlur: 4,
    shadowOffsetY: 4,
    animation: "SCALE_UP",
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_BOLD_SPORTS]: {
    name: "Sports Impact",
    category: "BOLD",
    fontFamily: "'Anton', sans-serif",
    fontSize: 86,
    fontWeight: 400, // Anton only has 400 but it looks bold
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 4,
    shadowColor: "#EF4444", // Red shadow
    shadowBlur: 0,
    shadowOffsetY: 8,
    shadowOffsetX: 4,
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_GAME_STREAMER]: {
    name: "Game Streamer",
    category: "HIGHLIGHT",
    fontFamily: "'Fredoka', sans-serif",
    fontSize: 74,
    fontWeight: 700,
    textColor: "#FFFFFF",
    strokeColor: "#9333EA", // Purple-600
    strokeWidth: 8,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetY: 6,
    animation: "POP",
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_NOIR_CRIME]: {
    name: "Noir Crime",
    category: "ART",
    fontFamily: "'Special Elite', cursive",
    fontSize: 64,
    fontWeight: 400,
    textColor: "#22C55E", // Green-500 (Hacker/Nightvision)
    backgroundColor: "#000000",
    backgroundPadding: 12,
    animation: "NONE",
    displayMode: "WORD"
  },
  // --- ADVANCED INSTAGRAM STYLES ---
  [CaptionStyle.WORD_INSTA_POP]: {
    name: "Insta Pop",
    category: "BOLD",
    fontFamily: "'Poppins', sans-serif",
    fontSize: 70,
    fontWeight: 800,
    textColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundPadding: 16,
    backgroundBorderRadius: 16,
    animation: "SCALE_UP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_GRADIENT_DREAM]: {
    name: "Gradient Dream",
    category: "GLOW",
    fontFamily: "'Poppins', sans-serif",
    fontSize: 76,
    fontWeight: 900,
    textColor: "#FFFFFF",
    gradientColors: ["#3B82F6", "#8B5CF6", "#EC4899"], // Blue -> Purple -> Pink
    shadowColor: "rgba(255,255,255,0.4)",
    shadowBlur: 15,
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_TAPE_HIGHLIGHT]: {
    name: "Tape Highlight",
    category: "HIGHLIGHT",
    fontFamily: "'Permanent Marker', cursive",
    fontSize: 68,
    fontWeight: 400,
    textColor: "#000000",
    backgroundColor: "#FACC15", // Yellow
    backgroundPadding: 12,
    rotationVariance: 4, // Messy rotation
    animation: "POP",
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_NEON_STORM]: {
    name: "Neon Storm",
    category: "NEON",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 72,
    fontWeight: 900,
    textColor: "#FFFFFF",
    strokeColor: "#06B6D4", // Cyan
    strokeWidth: 3,
    shadowColor: "#D946EF", // Fuchsia
    shadowBlur: 20,
    animation: "SCALE_UP",
    uppercase: true,
    displayMode: "WORD"
  },
  // --- ULTRA TRENDING NEW STYLES ---
  [CaptionStyle.WORD_SUPER_3D]: {
    name: "Super 3D",
    category: "ART",
    fontFamily: "'Titan One', cursive",
    fontSize: 80,
    fontWeight: 400,
    textColor: "#F97316", // Orange-500
    strokeColor: "#FFFFFF",
    strokeWidth: 4,
    shadowColor: "#7C2D12", // Dark Orange/Brown
    shadowBlur: 0,
    shadowOffsetY: 10, // Deep hard shadow
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_LYRICIST_OUTLINE]: {
    name: "Lyricist Outline",
    category: "NEON",
    fontFamily: "'Titan One', cursive",
    fontSize: 76,
    fontWeight: 400,
    textColor: "#34D399", // Green fill active
    strokeColor: "#34D399", // Green outline inactive
    strokeWidth: 2,
    useOutlineForInactive: true,
    animation: "SCALE_UP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.BLOCK_CLEAN_FOCUS]: {
    name: "Clean Focus",
    category: "HIGHLIGHT",
    fontFamily: "'Nunito', sans-serif",
    fontSize: 54,
    fontWeight: 800,
    textColor: "#9CA3AF", // Inactive Gray-400
    activeTextColor: "#FFFFFF", // Active White
    activeBackgroundColor: "#111827", // Active Black bg
    backgroundBorderRadius: 8,
    backgroundPadding: 8,
    animation: "SCALE_UP",
    displayMode: "BLOCK"
  },
  [CaptionStyle.BLOCK_CINEMATIC_FADE]: {
    name: "Cinematic Fade",
    category: "MINIMAL",
    fontFamily: "'Nunito', sans-serif",
    fontSize: 56,
    fontWeight: 800,
    textColor: "#FFFFFF",
    opacityInactive: 0.3, // Fade future words
    shadowColor: "rgba(0,0,0,0.5)",
    shadowBlur: 8,
    animation: "NONE",
    displayMode: "BLOCK"
  },
  // --- NEW REQUESTED STYLES ---
  [CaptionStyle.WORD_SOFT_GLOW]: {
    name: "Soft Glow",
    category: "GLOW",
    fontFamily: "'Poppins', sans-serif",
    fontSize: 74,
    fontWeight: 800,
    textColor: "#FFFFFF",
    shadowColor: "rgba(255, 255, 255, 0.9)", // Strong White Glow
    shadowBlur: 25,
    animation: "SCALE_UP",
    uppercase: false,
    displayMode: "WORD"
  },
  [CaptionStyle.WORD_ACTIVE_BOX]: {
    name: "Active Box",
    category: "HIGHLIGHT",
    fontFamily: "'Inter', sans-serif",
    fontSize: 70,
    fontWeight: 900,
    textColor: "#FFFFFF", // Inactive is white
    activeTextColor: "#000000", // Active is black
    activeBackgroundColor: "#FACC15", // Active is Yellow
    backgroundPadding: 12,
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  // --- VIRAL CATEGORY (SMART COLOR & VIBRANT) ---
  [CaptionStyle.COLOR_POP_VIRAL]: {
    name: "Standard Pop",
    category: "VIRAL",
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 72,
    fontWeight: 900,
    textColor: "#FFFFFF", 
    strokeColor: "#000000",
    strokeWidth: 6,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetY: 6,
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.VIRAL_COMIC]: {
    name: "Comic Loud",
    category: "VIRAL",
    fontFamily: "'Bangers', cursive",
    fontSize: 84,
    fontWeight: 400,
    textColor: "#FFD700", // Gold/Yellow Text
    strokeColor: "#000000",
    strokeWidth: 8,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetY: 8, // Deep hard shadow
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.VIRAL_PRO_CLEAN]: {
    name: "Pro Clean",
    category: "VIRAL",
    fontFamily: "'Inter', sans-serif",
    fontSize: 76,
    fontWeight: 900,
    textColor: "#FFFFFF", 
    shadowColor: "#3B82F6", // Bright Blue Shadow
    shadowBlur: 15,
    shadowOffsetY: 4,
    animation: "SCALE_UP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.VIRAL_LOUD_NEON]: {
    name: "Loud Neon",
    category: "VIRAL",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 70,
    fontWeight: 900,
    textColor: "#FFFFFF", 
    strokeColor: "#FF00FF", // Magenta Stroke
    strokeWidth: 4,
    shadowColor: "#00FFFF", // Cyan Glow
    shadowBlur: 25,
    animation: "SCALE_UP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.VIRAL_HYPER_BOLD]: {
    name: "Hyper Bold",
    category: "VIRAL",
    fontFamily: "'Anton', sans-serif",
    fontSize: 88,
    fontWeight: 400,
    textColor: "#FFFF00", // Bright Yellow Text
    strokeColor: "#000000",
    strokeWidth: 6,
    shadowColor: "#FF0000", // Bright Red Shadow
    shadowBlur: 0,
    shadowOffsetY: 10,
    animation: "POP",
    uppercase: true,
    displayMode: "WORD"
  },
  [CaptionStyle.CUSTOM]: {
    name: "Custom Style",
    category: "CUSTOM",
    fontFamily: "Inter, sans-serif",
    fontSize: 60,
    fontWeight: 800,
    textColor: "#FFFFFF",
    animation: "NONE",
    displayMode: "BLOCK"
  }
};