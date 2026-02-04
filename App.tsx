import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Upload, Play, Pause, Download, Wand2, Type, Music, Video, Loader2, Grid, Zap, Smile, Sparkles, Maximize2, ArrowUpDown, Palette, ToggleLeft, ToggleRight, Camera, Move, Volume2, Scissors, Globe, AlignLeft, AlignCenter, AlignRight, Square, Layers, MousePointer2 } from 'lucide-react';
import { Caption, CaptionStyle, ProcessingStatus, ProcessingStats, StyleConfig, DisplayMode, LanguageMode, TextAlign } from './types';
import { STYLES_CONFIG } from './constants';
import { generateCaptionsFromVideo } from './services/geminiService';
import ProjectSpecs from './components/ProjectSpecs';
import ProcessingChart from './components/ProcessingChart';
import lottie from 'lottie-web';

// --- ANIMATION UTILS ---
const pulse = (x: number): number => Math.sin(x * Math.PI);
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

// --- SOUND ENGINE (Web Audio API) ---
class SoundEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  noiseBuffer: AudioBuffer | null = null;
  initialized = false;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3;
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      this.initialized = true;
    } catch (e) { console.error(e); }
  }
  setVolume(val: number) { if (this.masterGain) this.masterGain.gain.value = val; }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  playWhoosh() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.linearRampToValueAtTime(800, t + 0.1);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    src.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    src.start(t); src.stop(t + 0.3);
  }
  playPop() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.15);
  }
}

const App: React.FC = () => {
  // Video & Process States
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>('IDLE');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  // UI Tabs
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'DESIGN'>('PRESETS');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Feature Toggles
  const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(true);
  const [autoMotionEnabled, setAutoMotionEnabled] = useState(false);
  const [autoSfxEnabled, setAutoSfxEnabled] = useState(false);
  const [smartCompressionEnabled, setSmartCompressionEnabled] = useState(false);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('AUTO');
  const [isAnimatedEmoji, setIsAnimatedEmoji] = useState(false);
  const [sfxVolume, setSfxVolume] = useState<'LOW' | 'MED' | 'HIGH'>('MED');

  // CUSTOM DESIGN OVERRIDES
  const [currentStyle, setCurrentStyle] = useState<CaptionStyle>(CaptionStyle.DEFAULT);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontWeight, setFontWeight] = useState<string | number>(800);
  const [fontScale, setFontScale] = useState(1);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textAlign, setTextAlign] = useState<TextAlign>('center');
  const [verticalPos, setVerticalPos] = useState(75);
  const [horizontalPos, setHorizontalPos] = useState(50);
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(4);
  const [shadowOffset, setShadowOffset] = useState(2);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, setBgColor] = useState('rgba(0,0,0,0.5)');
  const [bgPadding, setBgPadding] = useState(12);
  const [bgRadius, setBgRadius] = useState(8);
  const [uppercase, setUppercase] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundEngine = useRef(new SoundEngine());
  const currentZoomRef = useRef(1.0);
  const lastPlayedCaptionId = useRef<string | null>(null);
  const emojiCache = useRef<Record<string, any>>({});

  // Memoized Active Configuration (Preset + Overrides)
  const activeConfig = useMemo(() => {
    const preset = STYLES_CONFIG[currentStyle] || STYLES_CONFIG[CaptionStyle.DEFAULT];
    // If not in AUTO ADJUST mode, we prioritize user overrides
    if (!autoAdjustEnabled || currentStyle === CaptionStyle.CUSTOM) {
        return {
            ...preset,
            fontFamily,
            fontWeight,
            textColor,
            textAlign,
            strokeWidth,
            strokeColor,
            shadowBlur,
            shadowOffsetY: shadowOffset,
            shadowColor: 'rgba(0,0,0,0.8)',
            backgroundColor: bgEnabled ? bgColor : undefined,
            backgroundPadding: bgPadding,
            backgroundBorderRadius: bgRadius,
            uppercase
        };
    }
    return preset;
  }, [currentStyle, autoAdjustEnabled, fontFamily, fontWeight, textColor, textAlign, strokeWidth, strokeColor, shadowBlur, shadowOffset, bgEnabled, bgColor, bgPadding, bgRadius, uppercase]);

  // Sync design state when a preset is selected
  const selectPreset = (key: CaptionStyle) => {
    const p = STYLES_CONFIG[key];
    setCurrentStyle(key);
    setFontFamily(p.fontFamily);
    setFontWeight(p.fontWeight);
    setTextColor(p.textColor);
    setStrokeWidth(p.strokeWidth || 0);
    setStrokeColor(p.strokeColor || '#000000');
    setBgEnabled(!!p.backgroundColor);
    if (p.backgroundColor) setBgColor(p.backgroundColor);
    setBgPadding(p.backgroundPadding || 12);
    setBgRadius(p.backgroundBorderRadius || 8);
    setUppercase(!!p.uppercase);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoFile(file);
      setCaptions([]); setStatus('IDLE'); setStats(null);
      setExportProgress(0);
      
      // Reset defaults on new video
      setFontScale(1);
      setVerticalPos(75);
      setHorizontalPos(50);
      setCurrentStyle(CaptionStyle.DEFAULT);
    }
  };

  const handleGenerateCaptions = async () => {
    if (!videoFile) return;
    setStatus('UPLOADING');
    const startTime = Date.now();
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      try {
        setStatus('TRANSCRIBING');
        const { captions: genCaps, language } = await generateCaptionsFromVideo(base64String, videoFile.type, autoAdjustEnabled, smartCompressionEnabled, languageMode);
        setCaptions(genCaps);
        setStats({ transcriptionTime: Date.now() - startTime, wordCount: genCaps.reduce((acc, c) => acc + c.text.split(' ').length, 0), confidenceScore: 92, languageDetected: language });
        setStatus('READY');
        soundEngine.current.init();
      } catch (error) { setStatus('IDLE'); alert("Processing Failed."); }
    };
    reader.readAsDataURL(videoFile);
  };

  const togglePlay = () => {
    if (videoRef.current) {
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play().catch(e => console.error(e));
            soundEngine.current.resume();
        }
        setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        if (status === 'EXPORTING' && videoRef.current.duration > 0) {
            setExportProgress(Math.round((videoRef.current.currentTime / videoRef.current.duration) * 100));
        }
    }
  };

  const handleExport = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // 1. Setup State
    setStatus('EXPORTING');
    setIsPlaying(false);
    setExportProgress(0);
    
    // 2. Prepare Video - Force Seek to Start
    video.pause();
    
    // Explicitly wait for seek to complete
    await new Promise<void>((resolve) => {
        const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = 0;
    });

    // Small buffer to ensure canvas is ready
    await new Promise(r => setTimeout(r, 200));

    // 3. Capture Streams
    const canvasStream = canvas.captureStream(30); // 30 FPS
    
    let audioStream: MediaStream | null = null;
    try {
        const vidAny = video as any;
        if (vidAny.captureStream) {
            audioStream = vidAny.captureStream();
        } else if (vidAny.mozCaptureStream) {
            audioStream = vidAny.mozCaptureStream();
        }
    } catch (e) {
        console.warn("Audio capture not supported on this browser:", e);
    }

    // Compose final stream
    const finalStream = new MediaStream();
    canvasStream.getVideoTracks().forEach(track => finalStream.addTrack(track));
    if (audioStream) {
        audioStream.getAudioTracks().forEach(track => finalStream.addTrack(track));
    }

    // 4. Determine Codec
    const mimeTypes = [
        'video/webm;codecs=vp9,opus', 
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm', 
        'video/mp4'
    ];
    const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

    if (!mimeType) {
      alert("Your browser does not support video export. Please use Chrome or Edge.");
      setStatus('READY');
      return;
    }

    // 5. Setup Recorder
    const mediaRecorder = new MediaRecorder(finalStream, { 
        mimeType, 
        videoBitsPerSecond: 8000000 // 8 Mbps
    });
    
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `capgen-export-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        setStatus('READY');
        video.currentTime = 0;
        setIsPlaying(false);
    };

    mediaRecorder.onerror = (e) => {
        console.error("Recording failed", e);
        setStatus('READY');
        alert("Export failed. Please reload and try again.");
    };

    // 6. Start Recording
    mediaRecorder.start();
    
    // 7. Play Video
    video.onended = () => {
        mediaRecorder.stop();
        video.onended = null;
    };

    try {
        await video.play();
    } catch (e) {
        console.error("Export playback failed", e);
        mediaRecorder.stop();
        setStatus('READY');
    }
  };

  const drawCanvas = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderTime = video.currentTime;
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    }

    const activeCaption = captions.find(c => renderTime >= c.startTime && renderTime <= c.endTime);
    
    // Zoom Logic
    let targetZoom = 1.0;
    if (autoMotionEnabled && activeCaption) {
      targetZoom = activeCaption.customScale && activeCaption.customScale > 1.2 ? 1.15 : 1.05;
      const progress = (renderTime - activeCaption.startTime) / (activeCaption.endTime - activeCaption.startTime);
      targetZoom += progress * 0.05;
    }
    currentZoomRef.current = lerp(currentZoomRef.current, targetZoom, 0.05);

    // SFX Trigger
    if (autoSfxEnabled && isPlaying && activeCaption && lastPlayedCaptionId.current !== activeCaption.id) {
        soundEngine.current.playWhoosh();
        if (activeCaption.customScale! > 1.2) setTimeout(() => soundEngine.current.playPop(), 100);
        lastPlayedCaptionId.current = activeCaption.id;
    } else if (!activeCaption) { lastPlayedCaptionId.current = null; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(currentZoomRef.current, currentZoomRef.current);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (activeCaption) {
      const style = activeConfig;
      let finalFontScale = fontScale;
      let finalVPos = verticalPos;
      let finalHPos = horizontalPos;

      if (autoAdjustEnabled) {
        if (activeCaption.customScale) finalFontScale *= activeCaption.customScale;
        if (activeCaption.customPosition === 'TOP') finalVPos = 15;
        else if (activeCaption.customPosition === 'MIDDLE') finalVPos = 50;
        else if (activeCaption.customPosition === 'BOTTOM') finalVPos = 85;
      }

      const scaleFactor = (canvas.height / 1000) * finalFontScale;
      const fontSize = style.fontSize * scaleFactor;
      const spaceWidth = fontSize * 0.3;
      const anchorY = canvas.height * (finalVPos / 100);
      const anchorX = canvas.width * (finalHPos / 100);

      ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      ctx.textAlign = style.textAlign || 'center';
      ctx.textBaseline = 'middle';

      const rawText = style.uppercase ? activeCaption.text.toUpperCase() : activeCaption.text;
      const words = rawText.split(' ');
      const wordCount = words.length;
      const activeWordIndex = Math.min(Math.floor(((renderTime - activeCaption.startTime) / (activeCaption.endTime - activeCaption.startTime)) * wordCount), wordCount - 1);

      const drawWord = (word: string, x: number, y: number, active: boolean, idx: number) => {
        ctx.save();
        ctx.translate(x, y);
        if (active && style.animation === 'POP') ctx.scale(1.15, 1.15);
        
        if (style.backgroundColor) {
          const w = ctx.measureText(word).width;
          const p = style.backgroundPadding! * scaleFactor;
          ctx.fillStyle = style.backgroundColor;
          ctx.beginPath();
          ctx.roundRect(-w/2 - p, -fontSize/2 - p, w + p*2, fontSize + p*2, style.backgroundBorderRadius! * scaleFactor);
          ctx.fill();
        }

        if (style.shadowColor) {
          ctx.shadowColor = style.shadowColor; ctx.shadowBlur = style.shadowBlur! * scaleFactor; ctx.shadowOffsetY = style.shadowOffsetY! * scaleFactor;
        }

        if (style.strokeWidth && style.strokeWidth > 0) {
          ctx.strokeStyle = style.strokeColor!; ctx.lineWidth = style.strokeWidth * scaleFactor; ctx.strokeText(word, 0, 0);
        }

        // Color Logic
        let fill = active && style.activeTextColor ? style.activeTextColor : style.textColor;
        
        // Smart Color Override (Applies to all styles in VIRAL category)
        if (activeConfig.category === 'VIRAL' && activeCaption.wordColors && activeCaption.wordColors[idx]) {
           fill = activeCaption.wordColors[idx];
        }

        ctx.fillStyle = fill;
        ctx.fillText(word, 0, 0);
        ctx.restore();
      };

      if (style.displayMode === 'WORD') {
        drawWord(words[activeWordIndex], anchorX, anchorY, true, activeWordIndex);
      } else {
        // --- SAFE WRAPPING LOGIC ---
        const maxWidth = canvas.width * 0.85; // 85% safe area
        const lines: { text: string; words: string[]; startIndex: number }[] = [];
        let currentLineWords: string[] = [];
        let currentLineWidth = 0;
        let currentLineStartIndex = 0;

        words.forEach((word, index) => {
           const wWidth = ctx.measureText(word).width;
           const newWidth = currentLineWidth + wWidth + (currentLineWords.length > 0 ? spaceWidth : 0);
           
           if (newWidth > maxWidth && currentLineWords.length > 0) {
              lines.push({ text: currentLineWords.join(' '), words: currentLineWords, startIndex: currentLineStartIndex });
              currentLineWords = [word];
              currentLineWidth = wWidth;
              currentLineStartIndex = index;
           } else {
              currentLineWords.push(word);
              currentLineWidth = newWidth;
           }
        });
        if (currentLineWords.length > 0) {
           lines.push({ text: currentLineWords.join(' '), words: currentLineWords, startIndex: currentLineStartIndex });
        }

        const lineHeight = fontSize * 1.3;
        const totalHeight = lines.length * lineHeight;
        let startY = anchorY - (totalHeight / 2) + (lineHeight / 2);

        lines.forEach((line) => {
           const lineWidth = ctx.measureText(line.text).width;
           let curX = anchorX - (style.textAlign === 'center' ? lineWidth / 2 : style.textAlign === 'right' ? lineWidth : 0);
           
           line.words.forEach((w, i) => {
              const globalIndex = line.startIndex + i;
              const wWidth = ctx.measureText(w).width;
              drawWord(w, curX + wWidth / 2, startY, globalIndex === activeWordIndex, globalIndex);
              curX += wWidth + spaceWidth;
           });
           startY += lineHeight;
        });
      }
    }
    
    // Draw Export Watermark
    if (status === 'EXPORTING') {
       ctx.save();
       const logoText = "capgen.ai";
       const logoFontSize = Math.max(24, canvas.height * 0.04); 
       const padding = Math.max(20, canvas.height * 0.03);
       ctx.font = `900 ${logoFontSize}px 'Inter', sans-serif`;
       ctx.textAlign = 'right';
       ctx.textBaseline = 'top';
       ctx.shadowColor = "rgba(0,0,0,0.5)";
       ctx.shadowBlur = 4;
       ctx.shadowOffsetY = 2;
       ctx.fillStyle = "#3b82f6";
       ctx.globalAlpha = 0.8;
       ctx.fillText(logoText, canvas.width - padding, padding);
       ctx.restore();
    }

  }, [captions, activeConfig, fontScale, verticalPos, horizontalPos, autoAdjustEnabled, isPlaying, autoMotionEnabled, autoSfxEnabled, status, currentStyle]);

  useEffect(() => {
    const loop = () => { drawCanvas(); requestAnimationFrame(loop); };
    loop();
  }, [drawCanvas]);

  return (
    <div className="min-h-screen flex flex-col bg-[#121212] text-white font-sans overflow-hidden">
      <ProjectSpecs />
      
      <header className="border-b border-gray-800 p-4 flex justify-between items-center bg-[#1a1a1a] z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Type size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">CapGen <span className="text-blue-500">AI</span></h1>
        </div>
        {status === 'READY' && (
          <button onClick={handleExport} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-bold transition-all text-sm shadow-lg shadow-blue-500/20">
            <Download size={16} /> Export
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 p-8 flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
          {!videoSrc ? (
            <div className="w-full max-w-md h-[500px] border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center text-gray-500 bg-[#151515] group transition-all hover:border-blue-500/50">
              <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800 group-hover:bg-blue-500/10 group-hover:border-blue-500/30">
                <Upload size={32} className="text-gray-600 group-hover:text-blue-400" />
              </div>
              <p className="text-xl font-bold text-white mb-2">Upload Short Video</p>
              <p className="text-sm text-gray-600 mb-8 px-10 text-center">Drag and drop or click to select a vertical video for reels/shorts</p>
              <label className="bg-white text-black px-8 py-3 rounded-full font-black cursor-pointer hover:bg-gray-200 active:scale-95 transition-all shadow-xl">
                Choose Video
                <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="relative w-full max-w-[360px] aspect-[9/16] bg-black rounded-[32px] shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden border-[8px] border-[#1a1a1a]">
              <video 
                ref={videoRef} 
                src={videoSrc} 
                className="absolute inset-0 w-full h-full object-cover hidden" 
                onTimeUpdate={handleTimeUpdate} 
                crossOrigin="anonymous"
                playsInline
              />
              <canvas 
                ref={canvasRef} 
                className="w-full h-full object-contain cursor-pointer" 
                onClick={togglePlay} 
              />
              
              {(status === 'UPLOADING' || status === 'TRANSCRIBING' || status === 'EXPORTING') && (
                <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center text-center p-8 backdrop-blur-xl">
                  <div className="relative mb-8">
                    <Loader2 size={64} className="animate-spin text-blue-500" />
                    <Zap size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-300" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">
                    {status === 'EXPORTING' ? `Rendering ${exportProgress}%` : (status === 'UPLOADING' ? 'Uploading...' : 'AI Transcribing...')}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {status === 'EXPORTING' ? 'Burning captions and optimizing...' : 'Processing audio and optimizing for viral reach.'}
                  </p>
                </div>
              )}
              
              {status === 'READY' && !isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20">
                    <Play size={40} className="text-white fill-white ml-2" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Control Sidebar */}
        <div className="w-full lg:w-[480px] bg-[#1a1a1a] border-l border-gray-800 flex flex-col shadow-2xl z-40">
          {videoSrc && status === 'IDLE' && (
             <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest"><Globe size={14} className="text-blue-500" /> Language Style</div>
                  <div className="grid grid-cols-2 gap-2">
                    {['AUTO', 'ENGLISH', 'PURE_TELUGU', 'TELGLISH'].map(m => (
                      <button key={m} onClick={() => setLanguageMode(m as any)} className={`p-3 rounded-xl border text-[10px] font-bold transition-all ${languageMode === m ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}>
                        {m === 'AUTO' ? 'Auto (All)' : m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                   {[
                     { id: 'adj', label: 'Auto Adjust', icon: <Wand2 size={16}/>, state: autoAdjustEnabled, toggle: setAutoAdjustEnabled, desc: 'Optimized sizing & position' },
                     { id: 'comp', label: 'Smart Compression', icon: <Scissors size={16}/>, state: smartCompressionEnabled, toggle: setSmartCompressionEnabled, desc: 'Shorter, punchy sentences' }
                   ].map(f => (
                     <div key={f.id} className="bg-gray-900 border border-gray-800 p-4 rounded-2xl flex items-center justify-between hover:border-gray-700 transition-all">
                       <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.state ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>{f.icon}</div>
                         <div><p className="text-sm font-bold text-white">{f.label}</p><p className="text-[10px] text-gray-500">{f.desc}</p></div>
                       </div>
                       <button onClick={() => f.toggle(!f.state)}>{f.state ? <ToggleRight size={36} className="text-blue-500" /> : <ToggleLeft size={36} className="text-gray-700" />}</button>
                     </div>
                   ))}
                </div>
                <button onClick={handleGenerateCaptions} className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl hover:bg-gray-100">
                  <Sparkles size={20} /> Generate Captions
                </button>
             </div>
          )}

          {status === 'READY' && (
            <div className="flex flex-col h-full">
              {/* Tab Header */}
              <div className="flex border-b border-gray-800">
                 <button onClick={() => setActiveTab('PRESETS')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'PRESETS' ? 'text-blue-500 border-blue-500 bg-blue-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Presets</button>
                 <button onClick={() => setActiveTab('DESIGN')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'DESIGN' ? 'text-blue-500 border-blue-500 bg-blue-500/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Design</button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'PRESETS' ? (
                  <div className="space-y-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {['ALL', 'BOLD', 'NEON', 'MINIMAL', 'ART', 'GLOW', 'VIRAL'].map(cat => (
                        <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${filterCategory === cat ? 'bg-white text-black border-white' : 'bg-gray-900 text-gray-500 border-gray-800 hover:border-gray-600'}`}>{cat}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(STYLES_CONFIG)
                        .filter(([_, config]) => filterCategory === 'ALL' || config.category === filterCategory)
                        .map(([key, config]) => (
                        <button key={key} onClick={() => selectPreset(key as CaptionStyle)} className={`p-4 rounded-2xl border transition-all text-left group relative overflow-hidden ${currentStyle === key ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/50' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-black mb-3" style={{ background: config.gradientColors ? `linear-gradient(45deg, ${config.gradientColors.join(',')})` : (config.backgroundColor || '#333'), color: config.textColor, fontFamily: config.fontFamily }}>Aa</div>
                          <p className="text-[10px] font-black uppercase text-gray-300 truncate">{config.name}</p>
                          <div className="mt-2 flex gap-1">
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 font-bold uppercase">{config.displayMode}</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 font-bold uppercase">{config.animation}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 pb-10">
                    {/* Typography Group */}
                    <section className="space-y-4">
                       <div className="flex items-center gap-2 text-xs font-black text-blue-500 uppercase tracking-widest"><Type size={14} /> Typography</div>
                       <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-bold text-gray-500 uppercase">Font Family</label>
                             <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-gray-900 border border-gray-800 p-3 rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none">
                                <option value="Inter, sans-serif">Modern Sans (Inter)</option>
                                <option value="Montserrat, sans-serif">Bold Dynamic (Montserrat)</option>
                                <option value="Bangers, cursive">Comic/Hero (Bangers)</option>
                                <option value="Orbitron, sans-serif">Sci-Fi (Orbitron)</option>
                                <option value="Caveat, cursive">Handwritten (Caveat)</option>
                                <option value="'Titan One', cursive">Bubble/3D (Titan One)</option>
                             </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">Size <span>{Math.round(fontScale*100)}%</span></label>
                                <input type="range" min="0.5" max="2.5" step="0.1" value={fontScale} onChange={e => setFontScale(parseFloat(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                             </div>
                             <div className="space-y-2">
                                <label className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">Weight <span>{fontWeight}</span></label>
                                <select value={fontWeight} onChange={e => setFontWeight(e.target.value)} className="w-full bg-gray-900 border border-gray-800 p-2 rounded-lg text-xs font-bold outline-none">
                                   {[400, 600, 800, 900].map(w => <option key={w} value={w}>{w}</option>)}
                                </select>
                             </div>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => setUppercase(!uppercase)} className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${uppercase ? 'bg-blue-500 border-blue-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>UPPERCASE</button>
                             <div className="flex rounded-xl overflow-hidden border border-gray-800">
                                {[
                                   { id: 'left', icon: <AlignLeft size={14}/> },
                                   { id: 'center', icon: <AlignCenter size={14}/> },
                                   { id: 'right', icon: <AlignRight size={14}/> }
                                ].map(a => (
                                   <button key={a.id} onClick={() => setTextAlign(a.id as any)} className={`p-2 flex-1 flex justify-center ${textAlign === a.id ? 'bg-white text-black' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}>{a.icon}</button>
                                ))}
                             </div>
                          </div>
                       </div>
                    </section>

                    {/* Colors & Appearance */}
                    <section className="space-y-4">
                       <div className="flex items-center gap-2 text-xs font-black text-pink-500 uppercase tracking-widest"><Palette size={14} /> Colors & Visuals</div>
                       <div className="space-y-4 bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] font-bold text-gray-400 uppercase">Text Color</span>
                             <div className="flex items-center gap-3">
                                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded-full border-2 border-white/20 p-0 overflow-hidden bg-transparent" />
                                <span className="text-[10px] font-mono text-gray-500 uppercase">{textColor}</span>
                             </div>
                          </div>
                          <div className="space-y-3">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Stroke / Outline</span>
                                <input type="range" min="0" max="15" step="1" value={strokeWidth} onChange={e => setStrokeWidth(parseInt(e.target.value))} className="w-32 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                             </div>
                             {strokeWidth > 0 && (
                               <div className="flex items-center justify-between pl-4">
                                  <span className="text-[10px] text-gray-500 uppercase">Color</span>
                                  <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} className="w-6 h-6 rounded-md bg-transparent border border-white/10" />
                               </div>
                             )}
                          </div>
                       </div>
                    </section>

                    {/* Background */}
                    <section className="space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-black text-green-500 uppercase tracking-widest"><Square size={14} /> Background</div>
                          <button onClick={() => setBgEnabled(!bgEnabled)}>{bgEnabled ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} className="text-gray-700" />}</button>
                       </div>
                       {bgEnabled && (
                         <div className="space-y-4 bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                            <div className="flex items-center justify-between">
                               <span className="text-[10px] font-bold text-gray-400 uppercase">BG Color</span>
                               <input type="color" value={bgColor.startsWith('rgba') ? '#000000' : bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded-lg" />
                            </div>
                            <div className="space-y-2">
                               <label className="flex justify-between text-[10px] text-gray-500">Padding <span>{bgPadding}px</span></label>
                               <input type="range" min="0" max="40" step="1" value={bgPadding} onChange={e => setBgPadding(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg accent-green-500" />
                            </div>
                            <div className="space-y-2">
                               <label className="flex justify-between text-[10px] text-gray-500">Radius <span>{bgRadius}px</span></label>
                               <input type="range" min="0" max="50" step="1" value={bgRadius} onChange={e => setBgRadius(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg accent-green-500" />
                            </div>
                         </div>
                       )}
                    </section>

                    {/* Position */}
                    <section className="space-y-4">
                       <div className="flex items-center gap-2 text-xs font-black text-purple-500 uppercase tracking-widest"><MousePointer2 size={14} /> Position</div>
                       <div className="space-y-4 bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                          <div className="space-y-2">
                             <label className="flex justify-between text-[10px] text-gray-500">Vertical <span>{verticalPos}%</span></label>
                             <input type="range" min="5" max="95" step="1" value={verticalPos} onChange={e => setVerticalPos(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg accent-purple-500" />
                          </div>
                          <div className="space-y-2">
                             <label className="flex justify-between text-[10px] text-gray-500">Horizontal <span>{horizontalPos}%</span></label>
                             <input type="range" min="5" max="95" step="1" value={horizontalPos} onChange={e => setHorizontalPos(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg accent-purple-500" />
                          </div>
                       </div>
                    </section>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;