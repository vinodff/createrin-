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
import { Caption, LanguageMode, ViralHookResponse, SeoResult, SocialPlatform, ThumbnailConceptsResponse } from "../types";

// Helper to retrieve API Key (Environment or LocalStorage for testing)
const getApiKey = (): string => {
  let envKey = undefined;
  try {
    envKey = process.env.API_KEY;
  } catch (e) {
    // process not defined in some browser envs
  }
  const key = envKey || localStorage.getItem('createrin_api_key');
  if (!key) {
    throw new Error("API Key not found. Please select a key.");
  }
  return key;
};

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
  const apiKey = getApiKey();
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
    
    // SAFETY REINFORCEMENT: Ensure Compression doesn't override Language Mode
    if (languageMode === 'TELGLISH') {
      finalInstruction += `\n\nIMPORTANT: You must rewrite content in TELGLISH (Telugu Grammar + English Script). Do NOT translate to pure English.`;
    } else if (languageMode === 'PURE_TELUGU') {
      finalInstruction += `\n\nIMPORTANT: You must rewrite content in TELUGU SCRIPT. Do NOT translate to English.`;
    }
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

export const generateViralHooks = async (captions: Caption[]): Promise<ViralHookResponse> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    // Combine full transcript for context
    const transcript = captions.map(c => c.text).join(" ");

    const systemInstruction = `
      You are a Viral Marketing Expert for YouTube Shorts, Reels, and TikTok.
      Analyze the provided video transcript.
      Generate 5 highly clickable, curiosity-inducing THUMBNAIL TEXT hooks.
      
      RULES:
      1. Max 3-4 words per hook.
      2. Must be punchy, shocking, or create a knowledge gap.
      3. Examples: "Don't Do This", "Big Mistake ❌", "Secret Revealed", "I Was Wrong", "Money Hack 💰".
      4. Return ONLY a JSON object.
    `;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
            parts: [{ text: `TRANSCRIPT: ${transcript}` }]
        },
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    hooks: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });

    const text = response.text || '{"hooks": []}';
    return JSON.parse(text) as ViralHookResponse;
};

export const generateThumbnailConcepts = async (captions: Caption[]): Promise<ThumbnailConceptsResponse> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    // Truncate transcript to ~15k characters to avoid 500 RPC Payload Errors on client-side
    const transcript = captions.map(c => c.text).join(" ").substring(0, 15000);

    const systemInstruction = `
        Act as a world-class YouTube and Short-form thumbnail designer who specializes in viral, high-CTR thumbnails.
        Your task is to automatically generate eye-catching, trend-aligned thumbnails that force users to click.

        CORE OBJECTIVE:
        Generate thumbnails that Stop scrolling, Trigger curiosity, and Maximize click-through rate.

        VISUAL DESIGN RULES:
        1. Text Generation: Automatically generate 2-5 word viral text.
           - Curiosity-driven, Emotion-based, Incomplete sentence.
           - Examples: "BIG MISTAKE", "THIS WORKS", "STOP DOING THIS".
        2. Color Psychology:
           - Yellow + Black (Benefit/Urgency)
           - Red + White (Shock/Negative)
           - White + Dark Gradient (Story/Mystery)
        3. Graphic Elements:
           - Suggest arrows, circles, or warning tape if helpful to focus attention.

        OUTPUT:
        Generate 3 distinct concepts based on the transcript content.
        For each concept, provide the Hook Text, Category, Color Vibe, Explanation, and Suggested Elements.
    `;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: { parts: [{ text: `TRANSCRIPT: ${transcript}` }] },
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    concepts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                hook: { type: Type.STRING },
                                category: { type: Type.STRING, enum: ['SHOCK', 'NEGATIVE', 'BENEFIT', 'STORY', 'URGENCY'] },
                                colorVibe: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                suggestedElements: { 
                                  type: Type.ARRAY, 
                                  items: { type: Type.STRING, enum: ['ARROW', 'CIRCLE', 'WARNING_TAPE', 'GLOW'] } 
                                },
                                faceFocus: { type: Type.STRING, enum: ['ZOOM', 'NORMAL'] }
                            }
                        }
                    }
                }
            }
        }
    });

    const text = response.text || '{"concepts": []}';
    return JSON.parse(text) as ThumbnailConceptsResponse;
};

export const generateSeoMetadata = async (captions: Caption[], platform: SocialPlatform): Promise<SeoResult> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const transcript = captions.map(c => c.text).join(" ").substring(0, 15000);

    let platformRules = "";
    
    switch (platform) {
        case 'YOUTUBE':
            platformRules = `
            - TITLE: Searchable + Curiosity. 50-60 chars.
            - DESCRIPTION: Detailed, structured, timestamps potential. 
            - KEYWORDS: Mix of high volume and niche long-tail.
            - HASHTAGS: Minimal (3-5), highly relevant.
            - ALGO: Optimize for CTR and Session Time.
            `;
            break;
        case 'SHORTS':
            platformRules = `
            - TITLE: Short, punchy, loop-focused.
            - DESCRIPTION: Very short. First sentence is the hook.
            - KEYWORDS: Trend-based.
            - HASHTAGS: #Shorts plus niche tags.
            - ALGO: Optimize for Retention and Looping.
            `;
            break;
        case 'INSTAGRAM':
            platformRules = `
            - TITLE: (Caption Headline) Aesthetic, hook-based.
            - DESCRIPTION: Conversational, "Read Caption" prompts, use line breaks.
            - HASHTAGS: Mix of Reach (High vol) and Niche (Specific). 15-20 tags.
            - ALGO: Optimize for Saves and Shares.
            `;
            break;
        case 'TIKTOK':
            platformRules = `
            - TITLE: (Video Overlay Text logic).
            - DESCRIPTION: Extremely short, slang-friendly, question for engagement.
            - KEYWORDS: Spoken natural language queries.
            - HASHTAGS: #FYP + Trending + Niche.
            - ALGO: Optimize for First 3s Hook and Completion Rate.
            `;
            break;
        case 'FACEBOOK':
            platformRules = `
            - TITLE: Storytelling headline.
            - DESCRIPTION: Longer form, emotional connection, storytelling.
            - KEYWORDS: Broad interest groups.
            - ALGO: Optimize for Shares and Comments.
            `;
            break;
    }

    const systemInstruction = `
        Act as a senior growth strategist and platform algorithm specialist.
        Analyze the transcript and generate SEO metadata.
        
        PLATFORM TARGET: ${platform}
        
        PLATFORM RULES:
        ${platformRules}

        OUTPUT REQUIREMENTS:
        - Return a strictly valid JSON object matching the schema.
        - Ensure tone matches the platform culture.
        - Avoid spammy behavior.
    `;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
            parts: [{ text: `TRANSCRIPT: ${transcript}` }]
        },
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    audienceTargeting: { type: Type.STRING },
                    algorithmNotes: { type: Type.STRING }
                },
                required: ["title", "description", "keywords", "hashtags", "audienceTargeting", "algorithmNotes"]
            }
        }
    });

    const text = response.text || '{}';
    return JSON.parse(text) as SeoResult;
}

export const generateInstagramDm = async (
  captions: Caption[],
  automationType: 'COMMENT' | 'STORY' | 'WELCOME',
  triggerType?: 'KEYWORDS' | 'AI_INTENT'
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const transcript = captions.map(c => c.text).join(" ").substring(0, 5000);
  
  let specificPrompt = "";
  
  if (automationType === 'COMMENT') {
    if (triggerType === 'KEYWORDS') {
      specificPrompt = `
      SCENARIO: Comment → DM (Keyword Trigger)
      CONTEXT: The user commented with a keyword like "link" or "price".
      TASK: Generate a friendly DM reply that acknowledges the comment and offers the info.
      `;
    } else {
       specificPrompt = `
       SCENARIO: Comment → DM (AI Intent Detection)
       CONTEXT: The user posted a comment showing interest or curiosity.
       TASK: Generate a short DM that naturally continues the conversation.
       `;
    }
  } else if (automationType === 'STORY') {
     specificPrompt = `
     SCENARIO: Story Reply → DM
     CONTEXT: The user replied to a story about this video topic.
     TASK: Generate a friendly follow-up DM that feels natural and welcoming.
     `;
  } else if (automationType === 'WELCOME') {
     specificPrompt = `
     SCENARIO: Welcome DM
     CONTEXT: A new follower just engaged with this content.
     TASK: Send a warm welcome DM. Keep it short, friendly, and non-salesy.
     `;
  }

  const systemInstruction = `
    Act as a friendly, human Instagram creator replying in DMs.
    Your job is to send short, natural, trust-building messages triggered by comments or interactions.
    
    TRANSCRIPT OF VIDEO: "${transcript}..."

    UNIVERSAL RULES:
    - Use simple, friendly language.
    - Be 1-2 lines only.
    - Avoid sales pressure.
    - Max 1-2 emojis.
    - Sound conversational, not professional.
    - NO hashtags.
    - Never mention "AI" or "Automation".
    
    ${specificPrompt}
    
    OUTPUT:
    Return ONLY the message text string. No quotes, no markdown, no JSON.
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: { parts: [{ text: "Generate the DM message." }] },
    config: {
      systemInstruction: systemInstruction,
    }
  });

  return response.text || "";
};

export const analyzeCommentIntent = async (comment: string, videoContext: string): Promise<{ intent: 'INTERESTED' | 'QUESTION' | 'SPAM' | 'NEUTRAL', confidence: number }> => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
      Act as a Community Manager Bot.
      Analyze the incoming comment on an Instagram Post.
      Video Context: "${videoContext.substring(0, 500)}..."
      
      Classify the user intent into one of:
      - 'INTERESTED': Wants product, link, price, or more info.
      - 'QUESTION': Asking a specific question about content.
      - 'SPAM': Bot comments, self-promo, hate speech, or irrelevant.
      - 'NEUTRAL': Generic praise ("nice", "cool") or emojis only.

      Return JSON.
    `;

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: { parts: [{ text: `COMMENT: "${comment}"` }] },
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    intent: { type: Type.STRING, enum: ['INTERESTED', 'QUESTION', 'SPAM', 'NEUTRAL'] },
                    confidence: { type: Type.INTEGER, description: "0-100" }
                }
            }
        }
    });

    const text = response.text || '{"intent": "NEUTRAL", "confidence": 0}';
    return JSON.parse(text);
};