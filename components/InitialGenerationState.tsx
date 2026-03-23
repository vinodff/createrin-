import React from 'react';
import { Globe, Sparkles, Wand2, Scissors, Check } from 'lucide-react';

type LangMode = 'AUTO' | 'ENGLISH' | 'PURE_TELUGU' | 'TELGLISH' | 'HINDI' | 'TAMIL' | 'KANNADA' | 'MARATHI' | 'HINGLISH';

interface InitialGenerationStateProps {
  languageMode: LangMode;
  setLanguageMode: (mode: LangMode) => void;
  autoAdjustEnabled: boolean;
  setAutoAdjustEnabled: (val: boolean) => void;
  smartCompressionEnabled: boolean;
  setSmartCompressionEnabled: (val: boolean) => void;
  handleGenerateCaptions: () => Promise<void>;
  /** Detected language from previous generation, used to filter options */
  detectedLanguage?: string;
}

const ALL_LANGUAGE_OPTIONS: { id: LangMode; label: string; desc: string; families: string[] }[] = [
  { id: 'AUTO',        label: 'Auto Detect',  desc: 'Best for mixed audio',       families: [] },
  { id: 'ENGLISH',     label: 'English Only', desc: 'Strict English output',      families: ['en', 'english'] },
  { id: 'HINGLISH',    label: 'Hinglish',     desc: 'Hindi + English mix',        families: ['hi', 'hindi', 'hinglish'] },
  { id: 'HINDI',       label: 'Hindi Only',   desc: 'Hindi script only',          families: ['hi', 'hindi', 'hinglish'] },
  { id: 'PURE_TELUGU', label: 'Pure Telugu',  desc: 'Telugu script only',         families: ['te', 'telugu', 'telglish'] },
  { id: 'TELGLISH',    label: 'Telglish',     desc: 'Telugu + English script',    families: ['te', 'telugu', 'telglish'] },
  { id: 'TAMIL',       label: 'Tamil Only',   desc: 'Tamil script only',          families: ['ta', 'tamil'] },
  { id: 'KANNADA',     label: 'Kannada Only', desc: 'Kannada script only',        families: ['kn', 'kannada'] },
  { id: 'MARATHI',     label: 'Marathi Only', desc: 'Marathi script only',        families: ['mr', 'marathi'] },
];

/** Given a detected language string, return the relevant option IDs to show */
function getFilteredOptions(detectedLanguage?: string): LangMode[] {
  if (!detectedLanguage) return ALL_LANGUAGE_OPTIONS.map(o => o.id);

  const lang = detectedLanguage.toLowerCase().trim();

  // Always show AUTO
  const relevant: Set<LangMode> = new Set(['AUTO', 'ENGLISH']);

  for (const opt of ALL_LANGUAGE_OPTIONS) {
    if (opt.id === 'AUTO' || opt.id === 'ENGLISH') continue;
    // Show if any family keyword is a substring of the detected language (or vice versa)
    if (opt.families.some(f => lang.includes(f) || f.includes(lang))) {
      relevant.add(opt.id);
    }
  }

  // Fallback: if no language-specific match, show all
  if (relevant.size <= 2) return ALL_LANGUAGE_OPTIONS.map(o => o.id);

  return ALL_LANGUAGE_OPTIONS.map(o => o.id).filter(id => relevant.has(id));
}

const InitialGenerationState: React.FC<InitialGenerationStateProps> = ({
  languageMode,
  setLanguageMode,
  autoAdjustEnabled,
  setAutoAdjustEnabled,
  smartCompressionEnabled,
  setSmartCompressionEnabled,
  handleGenerateCaptions,
  detectedLanguage,
}) => {
  const visibleIds = getFilteredOptions(detectedLanguage);
  const visibleOptions = ALL_LANGUAGE_OPTIONS.filter(o => visibleIds.includes(o.id));
  const isFiltered = detectedLanguage && visibleOptions.length < ALL_LANGUAGE_OPTIONS.length;

  return (
    <div className="flex-1 p-4 pb-28 md:p-8 flex flex-col justify-start md:justify-center space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar">
      <div className="space-y-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
          <Globe size={14} className="text-blue-500" />
          Source Language
          {isFiltered && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold uppercase tracking-wide normal-case">
              Filtered for: {detectedLanguage}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {visibleOptions.map(m => (
            <button
              key={m.id}
              onClick={() => setLanguageMode(m.id)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${languageMode === m.id ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
            >
              <div className={`font-bold text-sm mb-1 ${languageMode === m.id ? 'text-white' : 'text-gray-300'}`}>{m.label}</div>
              <div className={`text-[10px] ${languageMode === m.id ? 'text-blue-200' : 'text-gray-600'}`}>{m.desc}</div>
              {languageMode === m.id && <div className="absolute top-2 right-2"><Check size={14} /></div>}
            </button>
          ))}
        </div>
        {isFiltered && (
          <button
            onClick={() => setLanguageMode('AUTO')}
            className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors mt-1"
          >
            Show all languages →
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
          <Sparkles size={14} className="text-purple-500" /> AI Enhancements
        </div>
        <div className="space-y-3">
          {[
            { id: 'adj', label: 'Auto Framing', icon: <Wand2 size={18} />, state: autoAdjustEnabled, toggle: setAutoAdjustEnabled, desc: 'Smartly positions text to avoid faces' },
            { id: 'comp', label: 'Smart Brevity', icon: <Scissors size={18} />, state: smartCompressionEnabled, toggle: setSmartCompressionEnabled, desc: 'Shortens sentences for higher retention' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => f.toggle(!f.state)}
              className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${f.state ? 'bg-gray-800 border-blue-500/50' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.state ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-600'}`}>{f.icon}</div>
                <div className="text-left">
                  <p className={`text-sm font-bold ${f.state ? 'text-white' : 'text-gray-400'}`}>{f.label}</p>
                  <p className="text-[10px] text-gray-500">{f.desc}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${f.state ? 'bg-blue-500 border-blue-500' : 'border-gray-700'}`}>
                {f.state && <Check size={14} className="text-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerateCaptions}
        className="w-full flex-shrink-0 bg-white text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl hover:bg-gray-200 mt-auto md:mt-0 sticky bottom-0 z-10"
      >
        <Sparkles size={20} className="text-yellow-500 fill-yellow-500" />
        Generate Captions
      </button>
    </div>
  );
};

export default InitialGenerationState;
