import { GoogleGenAI, Type } from "@google/genai";
import { 
  GEMINI_MODEL, 
  SYSTEM_INSTRUCTION, 
  AUTO_ADJUST_INSTRUCTION, 
  SMART_COMPRESSION_INSTRUCTION,
  PURE_TELUGU_INSTRUCTION,
  TELGLISH_INSTRUCTION,
  ENGLISH_ONLY_INSTRUCTION,
  AUTO_LANGUAGE_INSTRUCTION
} from "../constants";
import { Caption, LanguageMode } from "../types";

// Helper to parse time string "MM:SS.mmm" to seconds
const parseTime = (timeStr: string): number => {
  try {
    const [minutes, seconds] = timeStr.split(':');
    return parseFloat(minutes) * 60 + parseFloat(seconds);
  } catch (e) {
    return 0;
  }
};

// Map AI categories to Hex colors
const COLOR_MAP: Record<string, string> = {
  'neutral': '#FFFFFF',   // White
  'emphasis': '#FACC15',  // Yellow
  'positive': '#4ADE80',  // Green
  'negative': '#EF4444',  // Red
  'tech': '#60A5FA',      // Blue
  'action': '#FB923C'     // Orange
};

export const generateCaptionsFromVideo = async (
  base64Video: string, 
  mimeType: string, 
  autoAdjust: boolean,
  smartCompression: boolean,
  languageMode: LanguageMode = 'AUTO'
): Promise<{ captions: Caption[], language: string }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  // The prompt is minimal because the heavy lifting is done in SYSTEM_INSTRUCTION
  const prompt = "Transcribe audio. Adhere strictly to the JSON schema.";
  
  // Combine base instruction with language mode
  let finalInstruction = SYSTEM_INSTRUCTION;
  
  switch (languageMode) {
    case 'PURE_TELUGU':
      finalInstruction += `\n\n${PURE_TELUGU_INSTRUCTION}`;
      break;
    case 'TELGLISH':
      finalInstruction += `\n\n${TELGLISH_INSTRUCTION}`;
      break;
    case 'ENGLISH':
      finalInstruction += `\n\n${ENGLISH_ONLY_INSTRUCTION}`;
      break;
    default:
      finalInstruction += `\n\n${AUTO_LANGUAGE_INSTRUCTION}`;
      break;
  }

  if (autoAdjust) {
    finalInstruction += `\n\n${AUTO_ADJUST_INSTRUCTION}`;
  }
  if (smartCompression) {
    finalInstruction += `\n\n${SMART_COMPRESSION_INSTRUCTION}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Video
            }
          },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: finalInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: { type: Type.STRING },
              end: { type: Type.STRING },
              text: { type: Type.STRING },
              language: { type: Type.STRING, description: "Language code" },
              confidence: { type: Type.INTEGER, description: "Confidence score 0-100" },
              highlight_indices: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "Indices of key words to emphasize" },
              position: { type: Type.STRING, description: "Position: TOP, MIDDLE, BOTTOM" },
              sentiment: { type: Type.STRING },
              // Auto Adjust Fields
              custom_scale: { type: Type.NUMBER, description: "Font scale multiplier (1.0 = normal)" },
              custom_position: { type: Type.STRING, description: "AI suggested position (TOP/MIDDLE/BOTTOM)" },
              // Smart Color Fields
              word_categories: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: "Array of categories strictly matching the number of words in 'text'. Categories: neutral, emphasis, positive, negative, tech, action" 
              }
            },
            required: ["start", "end", "text", "language", "confidence"]
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    let rawData;
    try {
      rawData = JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON Parse Error", jsonText);
      rawData = [];
    }

    // Map AI response to internal Caption type
    const captions: Caption[] = rawData.map((item: any, index: number) => {
      // Map Categories to Hex Colors
      let wordColors: string[] = [];
      if (item.word_categories && Array.isArray(item.word_categories)) {
        wordColors = item.word_categories.map((cat: string) => COLOR_MAP[cat] || COLOR_MAP['neutral']);
      }

      return {
        id: `cap-${index}`,
        startTime: parseTime(item.start),
        endTime: parseTime(item.end),
        text: item.text,
        language: item.language || 'en',
        confidence: item.confidence || 0,
        highlightIndices: item.highlight_indices,
        position: item.position || 'BOTTOM',
        sentiment: item.sentiment,
        customScale: item.custom_scale,
        customPosition: item.custom_position,
        wordColors: wordColors
      };
    });

    // Calculate dominant language from AI results
    const languageCounts: Record<string, number> = {};
    captions.forEach(c => {
      const lang = c.language || 'en';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    const dominantLanguage = Object.keys(languageCounts).reduce((a, b) => 
      languageCounts[a] > languageCounts[b] ? a : b
    , "en");

    // Format display name
    const langMap: Record<string, string> = {
      'en': 'English',
      'hi': 'Hindi',
      'te': 'Telugu',
      'ta': 'Tamil',
      'hinglish': 'Hinglish',
      'tanglish': 'Tanglish'
    };

    return { 
      captions, 
      language: langMap[dominantLanguage.toLowerCase()] || dominantLanguage 
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};