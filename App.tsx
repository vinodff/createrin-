import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Upload, Play, Pause, Download, Wand2, Type, Music, Video, Loader2, Grid, Zap, Smile, Sparkles, Maximize2, ArrowUpDown, Palette, ToggleLeft, ToggleRight, Camera, Move, Volume2, Scissors, Globe, AlignLeft, AlignCenter, AlignRight, Square, Layers, MousePointer2, RefreshCw, ChevronRight, Check, Image as ImageIcon, Share2, UploadCloud, Key } from 'lucide-react';
import { Caption, CaptionStyle, ProcessingStatus, ProcessingStats, StyleConfig, DisplayMode, LanguageMode, TextAlign } from './types';
import { STYLES_CONFIG } from './constants';
import { generateCaptionsFromVideo } from './services/geminiService';
import ProjectSpecs from './components/ProjectSpecs';
import ProcessingChart from './components/ProcessingChart';
import ThumbnailEditor from './components/ThumbnailEditor';
import SeoGenerator from './components/SeoGenerator';
import SocialPublisher from './components/SocialPublisher';
import ApiKeySelector from './components/ApiKeySelector';
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
  // API Key State
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('createrin_api_key'));

  // Video & Process States
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>('IDLE');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  // UI Tabs & Modals
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'DESIGN'>('PRESETS');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isThumbnailEditorOpen, setIsThumbnailEditorOpen] = useState(false);
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [isPublisherOpen, setIsPublisherOpen] = useState(false);

  // Feature Toggles
  const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(true);
  const [autoMotionEnabled, setAutoMotionEnabled] = useState(false);
  const [autoSfxEnabled, setAutoSfxEnabled] = useState(false);
  const [smartCompressionEnabled, setSmartCompressionEnabled] = useState(false);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('AUTO');
  const [sfxVolume, setSfxVolume] = useState<'LOW' | 'MED' | 'HIGH'>('MED');

  // CUSTOM DESIGN OVERRIDES
  const [currentStyle, setCurrentStyle] = useState<CaptionStyle>(CaptionStyle.DEFAULT);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontWeight, setFontWeight] = useState<string | number>(800);
  const [fontScale, setFontScale] = useState(1);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textAlign, setTextAlign] = useState<TextAlign>('center');
  const [verticalPos, setVerticalPos] = useState(70); // Default safer position (70%)
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

  const resetApiKey = () => {
    localStorage.removeItem('createrin_api_key');
    setApiKey(null);
  };

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
      setVerticalPos(70);
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
        a.download = `createrin-export-${Date.now()}.${ext}`;
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
        // Adjusted Bottom position to 70% to prevent overflow
        if (activeCaption.customPosition === 'TOP') finalVPos = 15;
        else if (activeCaption.customPosition === 'MIDDLE') finalVPos = 50;
        else if (activeCaption.customPosition === 'BOTTOM') finalVPos = 70; 
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
        
        // Rotation for specific styles
        if (style.rotationVariance && style.rotationVariance > 0) {
            const rot = (idx % 2 === 0 ? 1 : -1) * style.rotationVariance * (Math.PI / 180);
            ctx.rotate(rot);
        }

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
        // --- SAFE WRAPPING LOGIC (BLOCK MODE) ---
        const maxWidth = canvas.width * 0.8; // 80% safe width
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
        
        // --- VERTICAL CLAMPING (SMART SAFETY ZONE) ---
        // 25% padding from bottom (Safe for Reels/TikTok UI)
        // 15% padding from top (Safe for status bar/camera)
        const safeBottom = canvas.height * 0.75; 
        const safeTop = canvas.height * 0.15;

        let effectiveY = anchorY;
        
        // Check projected bounds
        const projectedBottom = effectiveY + (totalHeight / 2);
        const projectedTop = effectiveY - (totalHeight / 2);

        // Shift if out of bounds
        if (projectedBottom > safeBottom) {
            effectiveY = safeBottom - (totalHeight / 2);
        } else if (projectedTop < safeTop) {
            effectiveY = safeTop + (totalHeight / 2);
        }

        let startY = effectiveY - (totalHeight / 2) + (lineHeight / 2);

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
       const logoText = "createrin.com";
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

  if (!apiKey) {
    return <ApiKeySelector onSelect={(k) => {
      localStorage.setItem('createrin_api_key', k);
      setApiKey(k);
    }} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#121212] text-white font-sans overflow-hidden">
      
      {/* MODALS */}
      {isThumbnailEditorOpen && videoSrc && (
          <ThumbnailEditor 
            videoSrc={videoSrc}
            captions={captions}
            onClose={() => setIsThumbnailEditorOpen(false)}
          />
      )}
      
      {isSeoModalOpen && (
          <SeoGenerator 
            captions={captions}
            onClose={() => setIsSeoModalOpen(false)}
          />
      )}

      {isPublisherOpen && videoSrc && (
          <SocialPublisher
            videoSrc={videoSrc}
            onClose={() => setIsPublisherOpen(false)}
            captions={captions}
          />
      )}

      {/* Simplified Header */}
      <header className="border-b border-gray-800 p-4 flex justify-between items-center bg-[#1a1a1a] z-50 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center">
            {/* Logo Image */}
            <img 
              src="https://createrin.com/wp-content/uploads/2025/03/createrin_logo.jpg" 
              alt="Createrin" 
              className="h-10 w-auto rounded-lg object-contain bg-white"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                // Show text fallback when image fails
                const fallback = document.getElementById('logo-fallback-text');
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
            {/* Text Fallback (Hidden by default, shown via onError) */}
            <h1 id="logo-fallback-text" className="hidden text-3xl font-black tracking-tight text-[#009ca6] leading-none">
              createrin
            </h1>
          </div>
          <button 
            onClick={resetApiKey}
            className="p-1.5 bg-gray-800 hover:bg-red-900/50 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
            title="Reset API Key"
          >
            <Key size={12} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {status === 'READY' && (
            <>
              <button 
                onClick={() => setIsThumbnailEditorOpen(true)}
                className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-700 px-4 py-2.5 rounded-full font-bold transition-all text-xs border border-gray-700"
              >
                <ImageIcon size={16} /> <span className="hidden sm:inline">Thumbnail</span>
              </button>
              <button 
                onClick={() => setIsSeoModalOpen(true)}
                className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-700 px-4 py-2.5 rounded-full font-bold transition-all text-xs border border-gray-700"
              >
                <Share2 size={16} /> <span className="hidden sm:inline">SEO</span>
              </button>
              <button 
                onClick={() => setIsPublisherOpen(true)}
                className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-500 px-4 py-2.5 rounded-full font-bold transition-all text-xs border border-blue-500 shadow-lg shadow-blue-600/20"
              >
                <UploadCloud size={16} /> <span className="hidden sm:inline">Publish</span>
              </button>
              <button 
                onClick={handleExport} 
                className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-full font-black transition-all text-sm shadow-xl active:scale-95"
              >
                <Download size={18} /> <span className="hidden sm:inline">Export</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Main Preview Area */}
        <div className="flex-1 flex items-center justify-center bg-[#050505] relative overflow-hidden p-4 lg:p-8">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          {!videoSrc ? (
            <div className="z-10 w-full max-w-md aspect-[3/4] border-2 border-dashed border-gray-800 rounded-[2rem] flex flex-col items-center justify-center text-gray-500 bg-[#151515]/50 backdrop-blur-sm group transition-all hover:border-blue-500/50 hover:bg-[#151515]">
              <div className="w-24 h-24 bg-gradient-to-tr from-gray-800 to-gray-900 rounded-full flex items-center justify-center mb-8 border border-gray-700 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <Upload size={40} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Upload Video</h2>
              <p className="text-sm text-gray-500 mb-8 px-12 text-center leading-relaxed">
                Drag & drop or select a vertical video (9:16) for Reels, TikTok, or Shorts.
              </p>
              <label className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold cursor-pointer active:scale-95 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
                <Video size={18} />
                Select File
                <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="relative h-full max-h-[85vh] aspect-[9/16] bg-black rounded-[2rem] shadow-2xl overflow-hidden border-[6px] border-[#222] ring-1 ring-white/10 z-20">
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
              
              {/* Overlay Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 transition-opacity hover:opacity-100 opacity-0 group-hover:opacity-100">
                 <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                 </button>
              </div>

              {(status === 'UPLOADING' || status === 'TRANSCRIBING' || status === 'EXPORTING') && (
                <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-center p-8 backdrop-blur-md">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                    <Loader2 size={56} className="animate-spin text-blue-500 relative z-10" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">
                    {status === 'EXPORTING' ? 'Finalizing Video...' : (status === 'UPLOADING' ? 'Uploading Media...' : 'AI Transcribing...')}
                  </h3>
                  <p className="text-gray-400 text-xs font-medium max-w-[200px]">
                    {status === 'EXPORTING' ? `Burning captions: ${exportProgress}%` : 'Analyzing speech patterns and generating viral captions.'}
                  </p>
                </div>
              )}
              
              {status === 'READY' && !isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-2xl animate-pulse">
                    <Play size={36} className="text-white fill-white ml-2" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-[420px] bg-[#161616] border-l border-gray-800 flex flex-col z-30 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          
          {/* Initial Generation State */}
          {videoSrc && status === 'IDLE' && (
             <div className="flex-1 p-8 flex flex-col justify-center space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                     <Globe size={14} className="text-blue-500" /> Source Language
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'AUTO', label: 'Auto Detect', desc: 'Best for mixed audio' },
                      { id: 'ENGLISH', label: 'English Only', desc: 'Strict English output' },
                      { id: 'PURE_TELUGU', label: 'Pure Telugu', desc: 'Telugu script only' },
                      { id: 'TELGLISH', label: 'Telglish', desc: 'Telugu + English script' }
                    ].map(m => (
                      <button 
                        key={m.id} 
                        onClick={() => setLanguageMode(m.id as any)} 
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${languageMode === m.id ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
                      >
                        <div className={`font-bold text-sm mb-1 ${languageMode === m.id ? 'text-white' : 'text-gray-300'}`}>{m.label}</div>
                        <div className={`text-[10px] ${languageMode === m.id ? 'text-blue-200' : 'text-gray-600'}`}>{m.desc}</div>
                        {languageMode === m.id && <div className="absolute top-2 right-2"><Check size={14} /></div>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                      <Sparkles size={14} className="text-purple-500" /> AI Enhancements
                   </div>
                   <div className="space-y-3">
                     {[
                       { id: 'adj', label: 'Auto Framing', icon: <Wand2 size={18}/>, state: autoAdjustEnabled, toggle: setAutoAdjustEnabled, desc: 'Smartly positions text to avoid faces' },
                       { id: 'comp', label: 'Smart Brevity', icon: <Scissors size={18}/>, state: smartCompressionEnabled, toggle: setSmartCompressionEnabled, desc: 'Shortens sentences for higher retention' }
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
                  className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl hover:bg-gray-200"
                >
                  <Sparkles size={20} className="text-yellow-500 fill-yellow-500" /> 
                  Generate Captions
                </button>
             </div>
          )}

          {status === 'READY' && (
            <div className="flex flex-col h-full">
              {/* Tab Header */}
              <div className="flex border-b border-gray-800 bg-[#161616] sticky top-0 z-10">
                 <button onClick={() => setActiveTab('PRESETS')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'PRESETS' ? 'text-white border-blue-500 bg-gray-800' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Templates</button>
                 <button onClick={() => setActiveTab('DESIGN')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'DESIGN' ? 'text-white border-blue-500 bg-gray-800' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Customize</button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#121212]">
                {activeTab === 'PRESETS' ? (
                  <div className="space-y-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {['ALL', 'BOLD', 'NEON', 'MINIMAL', 'ART', 'GLOW', 'HIGHLIGHT', 'KINETIC', 'VIRAL'].map(cat => (
                        <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${filterCategory === cat ? 'bg-white text-black border-white' : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500'}`}>{cat}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(STYLES_CONFIG)
                        .filter(([_, config]) => filterCategory === 'ALL' || config.category === filterCategory)
                        .map(([key, config]) => (
                        <button key={key} onClick={() => selectPreset(key as CaptionStyle)} className={`p-4 rounded-2xl border transition-all text-left group relative overflow-hidden ${currentStyle === key ? 'bg-gray-800 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
                          <div className="w-full aspect-[2/1] rounded-lg flex items-center justify-center text-2xl font-black mb-3 bg-[#000000]" style={{ background: config.gradientColors ? `linear-gradient(45deg, ${config.gradientColors.join(',')})` : '#000', color: config.textColor, fontFamily: config.fontFamily }}>
                             <span style={{ 
                                textShadow: config.shadowBlur ? `0 0 ${config.shadowBlur}px ${config.shadowColor}` : 'none',
                                WebkitTextStroke: config.strokeWidth ? `${config.strokeWidth/2}px ${config.strokeColor}` : 'none'
                             }}>Aa</span>
                          </div>
                          <p className={`text-[11px] font-bold uppercase truncate ${currentStyle === key ? 'text-white' : 'text-gray-400'}`}>{config.name}</p>
                          <div className="mt-2 flex gap-1">
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/40 text-gray-500 font-bold uppercase">{config.displayMode}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 pb-10">
                    {/* Typography Group */}
                    <section className="space-y-4">
                       <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2"><Type size={14} className="text-blue-500" /> Typography</div>
                       <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-bold text-gray-500 uppercase">Font Family</label>
                             <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-gray-900 border border-gray-800 p-3 rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none text-white">
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
                                <select value={fontWeight} onChange={e => setFontWeight(e.target.value)} className="w-full bg-gray-900 border border-gray-800 p-2 rounded-lg text-xs font-bold outline-none text-white">
                                   {[400, 600, 800, 900].map(w => <option key={w} value={w}>{w}</option>)}
                                </select>
                             </div>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => setUppercase(!uppercase)} className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${uppercase ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>ABC</button>
                             <div className="flex flex-[2] rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
                                {[
                                   { id: 'left', icon: <AlignLeft size={16}/> },
                                   { id: 'center', icon: <AlignCenter size={16}/> },
                                   { id: 'right', icon: <AlignRight size={16}/> }
                                ].map(a => (
                                   <button key={a.id} onClick={() => setTextAlign(a.id as any)} className={`flex-1 flex items-center justify-center transition-colors ${textAlign === a.id ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{a.icon}</button>
                                ))}
                             </div>
                          </div>
                       </div>
                    </section>

                    {/* Colors & Appearance */}
                    <section className="space-y-4">
                       <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2"><Palette size={14} className="text-pink-500" /> Appearance</div>
                       <div className="space-y-4 bg-gray-800/30 p-4 rounded-2xl border border-gray-800/50">
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] font-bold text-gray-400 uppercase">Text Color</span>
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full border border-gray-600 overflow-hidden relative">
                                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 cursor-pointer" />
                                </div>
                                <span className="text-[10px] font-mono text-gray-500 uppercase">{textColor}</span>
                             </div>
                          </div>
                          <div className="space-y-3 pt-2 border-t border-gray-700/50">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Stroke Width</span>
                                <input type="range" min="0" max="15" step="1" value={strokeWidth} onChange={e => setStrokeWidth(parseInt(e.target.value))} className="w-32 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                             </div>
                             {strokeWidth > 0 && (
                               <div className="flex items-center justify-between pl-2">
                                  <span className="text-[10px] text-gray-500 uppercase">Stroke Color</span>
                                  <div className="w-6 h-6 rounded border border-gray-600 overflow-hidden relative">
                                     <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 cursor-pointer" />
                                  </div>
                               </div>
                             )}
                          </div>
                       </div>
                    </section>

                    {/* Background */}
                    <section className="space-y-4">
                       <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                          <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest"><Square size={14} className="text-green-500" /> Background</div>
                          <button onClick={() => setBgEnabled(!bgEnabled)}>{bgEnabled ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-700" />}</button>
                       </div>
                       {bgEnabled && (
                         <div className="space-y-4 bg-gray-800/30 p-4 rounded-2xl border border-gray-800/50 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between">
                               <span className="text-[10px] font-bold text-gray-400 uppercase">BG Color</span>
                               <div className="w-8 h-8 rounded border border-gray-600 overflow-hidden relative">
                                   <input type="color" value={bgColor.startsWith('rgba') ? '#000000' : bgColor} onChange={e => setBgColor(e.target.value)} className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 cursor-pointer" />
                               </div>
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
                       <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2"><MousePointer2 size={14} className="text-purple-500" /> Layout</div>
                       <div className="space-y-4 bg-gray-800/30 p-4 rounded-2xl border border-gray-800/50">
                          <div className="space-y-2">
                             <label className="flex justify-between text-[10px] text-gray-500">Vertical Position <span>{verticalPos}%</span></label>
                             <input type="range" min="10" max="90" step="1" value={verticalPos} onChange={e => setVerticalPos(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg accent-purple-500 cursor-pointer" />
                             <div className="flex justify-between text-[9px] text-gray-600 px-1">
                                <span>Top</span>
                                <span>Center</span>
                                <span>Bottom</span>
                             </div>
                          </div>
                          <div className="space-y-2 mt-4">
                             <label className="flex justify-between text-[10px] text-gray-500">Horizontal Offset <span>{horizontalPos}%</span></label>
                             <input type="range" min="10" max="90" step="1" value={horizontalPos} onChange={e => setHorizontalPos(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg accent-purple-500 cursor-pointer" />
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