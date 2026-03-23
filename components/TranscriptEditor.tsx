import React, { useRef } from 'react';
import { Caption } from '../types';

interface TranscriptEditorProps {
  captions: Caption[];
  updateCaption: (id: string, updates: Partial<Caption>) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ captions, updateCaption, videoRef }) => {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleInput = (id: string, text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text.trim()) updateCaption(id, { text: text.trim() });
    }, 250);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return `${m}:${parseFloat(sec) < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
      {captions.map((caption, index) => (
        <div
          key={caption.id}
          className="bg-[#1a1a1a] border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors"
        >
          {/* Timestamp */}
          <button
            onClick={() => seekTo(caption.startTime)}
            className="text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors mb-2 block"
          >
            {formatTime(caption.startTime)} → {formatTime(caption.endTime)}
          </button>

          {/* Directly editable text */}
          <div
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => handleInput(caption.id, (e.target as HTMLDivElement).innerText)}
            className="text-sm text-white/90 outline-none cursor-text leading-relaxed focus:text-white rounded px-1 -mx-1 focus:bg-white/5 transition-colors"
          >
            {caption.text}
          </div>
        </div>
      ))}

      {captions.length === 0 && (
        <div className="text-center text-gray-600 text-sm py-8">
          Generate captions to start editing.
        </div>
      )}
    </div>
  );
};

export default TranscriptEditor;
