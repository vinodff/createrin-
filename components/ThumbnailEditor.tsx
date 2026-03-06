import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Download, Wand2, Type, Image as ImageIcon, Sparkles, Sliders, Check, Layout, Palette, RefreshCw, Zap, TrendingUp, Info, Crown, ChevronLeft } from 'lucide-react';
import { Caption, ThumbnailTemplate, ThumbnailVariant, GraphicElement, ThumbnailConcept } from '../types';
import { generateThumbnailConcepts } from '../services/geminiService';

interface Props {
  videoSrc: string;
  captions: Caption[];
  onClose: () => void;
}

const TEMPLATES: ThumbnailTemplate[] = [
  { id: 'beast', name: 'Beast Mode', textColor: '#FFFFFF', fontFamily: 'Bangers', strokeColor: '#000000', strokeWidth: 10, shadowColor: '#000000', shadowBlur: 10, position: 'CENTER', filter: 'contrast(1.3) saturation(1.3) brightness(1.1)' },
  { id: 'warning', name: 'Warning', textColor: '#FFFF00', fontFamily: 'Montserrat', strokeColor: '#000000', strokeWidth: 8, backgroundColor: '#DC2626', position: 'TOP', filter: 'grayscale(100%) contrast(1.4)' },
  { id: 'minimal', name: 'Minimal', textColor: '#000000', fontFamily: 'Inter', backgroundColor: '#FFFFFF', position: 'BOTTOM', filter: 'brightness(1.1)' },
  { id: 'neon', name: 'Neon', textColor: '#FFFFFF', fontFamily: 'Orbitron', strokeColor: '#FF00FF', strokeWidth: 4, shadowColor: '#00FFFF', shadowBlur: 20, position: 'CENTER', filter: 'brightness(0.8) contrast(1.3)' },
  { id: 'urgency', name: 'Urgency', textColor: '#FFFFFF', fontFamily: 'Anton', strokeColor: '#000000', strokeWidth: 8, backgroundColor: '#F59E0B', position: 'BOTTOM', filter: 'contrast(1.2)' },
];

const ThumbnailEditor: React.FC<Props> = ({ videoSrc, captions, onClose }) => {
  // Modes: GENERATE (AI Grid) vs PREVIEW (High Res Download)
  const [viewMode, setViewMode] = useState<'GENERATE' | 'PREVIEW'>('GENERATE');
  
  // State for AI Generation
  const [variants, setVariants] = useState<ThumbnailVariant[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Selected state for Preview
  const [selectedVariant, setSelectedVariant] = useState<ThumbnailVariant | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Video
  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = 0;
    }
  }, [videoSrc]);

  // Draw Main Editor Canvas (High Res Preview for Download)
  const drawThumbnail = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !selectedVariant) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;

    const concept = selectedVariant.concept;
    const tmpl = TEMPLATES.find(t => t.id === selectedVariant.templateId) || TEMPLATES[0];

    // 1. Draw Video Frame (With Face Zoom if applicable)
    ctx.save();
    if (concept.faceFocus === 'ZOOM') {
        const zoom = 1.3;
        ctx.translate(canvas.width / 2, canvas.height / 3); // Pivot around upper center
        ctx.scale(zoom, zoom);
        ctx.translate(-canvas.width / 2, -canvas.height / 3);
    }
    
    ctx.filter = tmpl.filter || 'none';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    ctx.restore();

    // 2. Draw Graphics Layer (Behind Text)
    if (concept.suggestedElements) {
        drawGraphics(ctx, canvas.width, canvas.height, concept.suggestedElements);
    }

    // 3. Draw Text
    renderTextOnCanvas(ctx, canvas.width, canvas.height, concept.hook, tmpl);
    
    // 4. Draw Graphics Layer (Overlay - Arrows/Circles)
    if (concept.suggestedElements) {
        drawOverlayGraphics(ctx, canvas.width, canvas.height, concept.suggestedElements);
    }

  }, [selectedVariant]);

  const drawGraphics = (ctx: CanvasRenderingContext2D, w: number, h: number, elements: GraphicElement[]) => {
      if (elements.includes('WARNING_TAPE')) {
          const tapeHeight = h * 0.15;
          const y = h * 0.1;
          
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, y, w, tapeHeight);
          ctx.fillStyle = '#FACC15'; // Yellow
          ctx.fill();
          
          // Stripes
          ctx.beginPath();
          ctx.fillStyle = '#000000';
          for(let i = -w; i < w * 2; i += 60) {
              ctx.moveTo(i, y);
              ctx.lineTo(i + 30, y);
              ctx.lineTo(i - 30, y + tapeHeight);
              ctx.lineTo(i - 60, y + tapeHeight);
              ctx.closePath();
          }
          ctx.fill();
          ctx.restore();
      }
      
      if (elements.includes('GLOW')) {
          // Add a radial glow in center
          const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*0.6);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,0.6)');
          ctx.fillStyle = grad;
          ctx.fillRect(0,0,w,h);
      }
  };

  const drawOverlayGraphics = (ctx: CanvasRenderingContext2D, w: number, h: number, elements: GraphicElement[]) => {
       ctx.strokeStyle = '#EF4444'; // Red
       ctx.lineWidth = w * 0.015;
       ctx.lineCap = 'round';
       ctx.lineJoin = 'round';
       ctx.shadowColor = 'rgba(0,0,0,0.5)';
       ctx.shadowBlur = 10;

       if (elements.includes('ARROW')) {
           // Draw generic arrow pointing to face area
           const startX = w * 0.8;
           const startY = h * 0.6;
           const endX = w * 0.55;
           const endY = h * 0.4;
           
           ctx.beginPath();
           ctx.moveTo(startX, startY);
           ctx.quadraticCurveTo(w * 0.7, h * 0.5, endX, endY);
           // Arrowhead
           const angle = Math.atan2(endY - (h*0.5), endX - (w*0.7));
           ctx.lineTo(endX + 30 * Math.cos(angle - Math.PI/6), endY + 30 * Math.sin(angle - Math.PI/6));
           ctx.moveTo(endX, endY);
           ctx.lineTo(endX + 30 * Math.cos(angle + Math.PI/6), endY + 30 * Math.sin(angle + Math.PI/6));
           ctx.stroke();
       }

       if (elements.includes('CIRCLE')) {
           // Draw rough circle around typical face area
           ctx.beginPath();
           ctx.ellipse(w/2, h/3, w*0.25, h*0.15, 0, 0, 2 * Math.PI);
           ctx.stroke();
       }
  };

  // Helper: Render Text (Shared between Main Editor and Preview Cards)
  const renderTextOnCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number, txt: string, tmpl: ThumbnailTemplate) => {
    const fontSize = w * 0.15; // Increased for "Mobile 10% size" rule
    ctx.font = `900 ${fontSize}px ${tmpl.fontFamily}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let yPos = h / 2;
    if (tmpl.position === 'TOP') yPos = h * 0.25;
    if (tmpl.position === 'BOTTOM') yPos = h * 0.75;

    const words = txt.toUpperCase().split(' ');
    const lineHeight = fontSize * 1.1;
    const totalHeight = words.length * lineHeight;
    let startY = yPos - (totalHeight / 2) + (lineHeight / 2);

    words.forEach(word => {
        // Background Box
        if (tmpl.backgroundColor) {
            const metrics = ctx.measureText(word);
            const pad = fontSize * 0.2;
            const bgW = metrics.width + (pad * 2);
            
            ctx.save();
            ctx.fillStyle = tmpl.backgroundColor;
            // Slight tilt for viral effect
            const tilt = (Math.random() - 0.5) * 0.1;
            ctx.translate(w/2, startY);
            ctx.rotate(tilt);
            ctx.fillRect(-bgW/2, -fontSize/2 - pad/2, bgW, fontSize + pad);
            ctx.restore();
        }

        // Shadow
        if (tmpl.shadowColor) {
            ctx.shadowColor = tmpl.shadowColor;
            ctx.shadowBlur = tmpl.shadowBlur || 0;
            ctx.shadowOffsetY = 10;
        }

        // Stroke
        if (tmpl.strokeWidth) {
            ctx.strokeStyle = tmpl.strokeColor || '#000';
            ctx.lineWidth = tmpl.strokeWidth;
            ctx.strokeText(word, w / 2, startY);
        }

        // Fill
        ctx.fillStyle = tmpl.textColor;
        ctx.fillText(word, w / 2, startY);
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        startY += lineHeight;
    });
  };

  useEffect(() => {
    if (viewMode === 'PREVIEW' && selectedVariant) {
        const vid = videoRef.current;
        if(!vid) return;
        
        // Ensure we seek to the correct time before drawing
        const onSeeked = () => drawThumbnail();
        vid.currentTime = selectedVariant.frameTime;
        vid.addEventListener('seeked', onSeeked);
        
        return () => vid.removeEventListener('seeked', onSeeked);
    }
  }, [drawThumbnail, viewMode, selectedVariant]);

  // --- AI GENERATION LOGIC ---
  const handleMagicGenerate = async () => {
    if (captions.length === 0) {
        alert("Please generate captions first for context analysis!");
        return;
    }
    setIsGenerating(true);
    setVariants([]);

    try {
        // 1. Get Concepts
        const response = await generateThumbnailConcepts(captions);
        
        // 2. Determine Timepoints (Start, Middle, Peak)
        const timePoints = [duration * 0.1, duration * 0.5, duration * 0.8]; 

        const newVariants: ThumbnailVariant[] = [];
        const vid = videoRef.current;
        
        if (!vid) throw new Error("Video not loaded");
        
        // 3. Generate Variants (Capture Frames & Assign Templates)
        for (let i = 0; i < response.concepts.length; i++) {
            const concept = response.concepts[i];
            const time = timePoints[i % timePoints.length];
            
            // Map Concept Category to Template
            let tmplId = 'minimal';
            if (concept.category === 'SHOCK' || concept.category === 'NEGATIVE') tmplId = 'warning';
            else if (concept.category === 'BENEFIT') tmplId = 'beast';
            else if (concept.category === 'URGENCY') tmplId = 'urgency';
            else tmplId = 'neon';
            
            // Simulate CTR Score based on category heuristics
            let score = 85;
            if (concept.category === 'SHOCK') score += Math.floor(Math.random() * 10);
            if (concept.category === 'NEGATIVE') score += Math.floor(Math.random() * 8);
            
            // Capture Frame
            await new Promise<void>((resolve) => {
                const onSeek = () => {
                    vid.removeEventListener('seeked', onSeek);
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = vid.videoWidth;
                    tempCanvas.height = vid.videoHeight;
                    const ctx = tempCanvas.getContext('2d');
                    if (ctx) {
                        const tmpl = TEMPLATES.find(t => t.id === tmplId) || TEMPLATES[0];
                        
                        // --- RENDER PREVIEW ---
                        // 1. Base Image
                        ctx.filter = tmpl.filter || 'none';
                        if (concept.faceFocus === 'ZOOM') {
                             ctx.translate(tempCanvas.width / 2, tempCanvas.height / 3);
                             ctx.scale(1.3, 1.3);
                             ctx.translate(-tempCanvas.width / 2, -tempCanvas.height / 3);
                        }
                        ctx.drawImage(vid, 0, 0, tempCanvas.width, tempCanvas.height);
                        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
                        ctx.filter = 'none';

                        // 2. Graphics (Behind)
                        if (concept.suggestedElements) drawGraphics(ctx, tempCanvas.width, tempCanvas.height, concept.suggestedElements);

                        // 3. Text
                        renderTextOnCanvas(ctx, tempCanvas.width, tempCanvas.height, concept.hook, tmpl);

                        // 4. Graphics (Front)
                        if (concept.suggestedElements) drawOverlayGraphics(ctx, tempCanvas.width, tempCanvas.height, concept.suggestedElements);
                        
                        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);
                        
                        newVariants.push({
                            id: `var-${i}`,
                            concept,
                            frameTime: time,
                            frameImage: dataUrl,
                            templateId: tmplId,
                            ctrScore: score
                        });
                    }
                    resolve();
                };
                vid.currentTime = time;
                vid.addEventListener('seeked', onSeek);
            });
        }
        
        setVariants(newVariants.sort((a,b) => b.ctrScore - a.ctrScore)); // Sort by Score
    } catch (e) {
        console.error(e);
        alert("Generation failed. Please try again or check console.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSelectVariant = (v: ThumbnailVariant) => {
      setSelectedVariant(v);
      setViewMode('PREVIEW');
  };

  const downloadImage = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbnail-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Close after download? Optional.
      onClose(); 
  };
  
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
        const onLoadedMeta = () => setDuration(vid.duration);
        vid.addEventListener('loadedmetadata', onLoadedMeta);
        return () => vid.removeEventListener('loadedmetadata', onLoadedMeta);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      
      {/* Hidden Video Source for Capture */}
      <video ref={videoRef} src={videoSrc} className="hidden" crossOrigin="anonymous" />

      {/* Header */}
      <div className="border-b border-gray-800 p-4 flex justify-between items-center bg-[#101010]">
         <div className="flex items-center gap-3">
             <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg">
                 <Sparkles className="text-white" size={20} />
             </div>
             <div>
                 <h2 className="text-xl font-black text-white">Viral Thumbnail Lab</h2>
                 <p className="text-[10px] text-gray-500 font-medium">AI-Generated High CTR Designs</p>
             </div>
         </div>
         <button onClick={onClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-white transition-colors">
            <X size={20} />
         </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row items-center justify-center">
          
          {/* VIEW MODE: GENERATE (AI Grid) */}
          {viewMode === 'GENERATE' && (
              <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar flex flex-col items-center">
                  
                  {variants.length === 0 && !isGenerating && (
                      <div className="text-center mt-20 max-w-lg">
                          <Wand2 size={64} className="mx-auto text-gray-700 mb-6" />
                          <h3 className="text-2xl font-black text-white mb-4">One-Click Thumbnail Magic</h3>
                          <p className="text-gray-400 mb-8">
                              Our AI will analyze your video content, find the most engaging frames, 
                              generate psychological hooks, and design high-CTR thumbnails automatically.
                          </p>
                          <button 
                            onClick={handleMagicGenerate}
                            className="bg-white text-black px-8 py-4 rounded-full font-black text-lg hover:scale-105 transition-transform flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] mx-auto"
                          >
                             <Zap fill="black" size={20} /> Generate 3 Concepts
                          </button>
                      </div>
                  )}

                  {isGenerating && (
                      <div className="flex flex-col items-center justify-center h-full">
                          <Sparkles size={48} className="animate-spin text-yellow-500 mb-4" />
                          <h3 className="text-xl font-bold text-white">Designing Clickbait...</h3>
                          <p className="text-gray-500 mt-2">Analyzing psychology & frame composition</p>
                      </div>
                  )}

                  {variants.length > 0 && (
                      <div className="w-full max-w-6xl">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-lg font-bold text-white">Select a Design to Download</h3>
                              <button onClick={handleMagicGenerate} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white">
                                  <RefreshCw size={14} /> Regenerate
                              </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              {variants.map((v, idx) => (
                                  <div key={v.id} onClick={() => handleSelectVariant(v)} className="group relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-yellow-500 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl">
                                      <img src={v.frameImage} className="w-full h-full object-cover" alt="Generated Thumbnail" />
                                      
                                      {/* CTR Badge */}
                                      <div className={`absolute top-3 left-3 px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-lg ${idx === 0 ? 'bg-yellow-500 border-yellow-300 text-black' : 'bg-black/80 backdrop-blur border-green-500/50 text-white'}`}>
                                          {idx === 0 ? <Crown size={12} fill="black" /> : <TrendingUp size={12} className="text-green-500" />}
                                          <span className="text-xs font-black">{v.ctrScore} CTR</span>
                                      </div>

                                      {/* Hover Download Overlay */}
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                          <div className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform">
                                              <Download size={18} /> Preview & Download
                                          </div>
                                      </div>

                                      {/* Info Overlay */}
                                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 transform translate-y-2 group-hover:translate-y-10 transition-transform">
                                          <div className="flex items-center gap-2 mb-1">
                                             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-black ${
                                                 v.concept.category === 'SHOCK' ? 'bg-red-500' : 
                                                 v.concept.category === 'BENEFIT' ? 'bg-green-500' : 
                                                 v.concept.category === 'URGENCY' ? 'bg-yellow-500' : 'bg-blue-500'
                                             }`}>
                                                 {v.concept.category}
                                             </span>
                                          </div>
                                          <p className="text-xs text-gray-300 line-clamp-2">{v.concept.explanation}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          )}

          {/* VIEW MODE: PREVIEW (Final Download) */}
          {viewMode === 'PREVIEW' && selectedVariant && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#050505] relative w-full h-full">
                    <button onClick={() => setViewMode('GENERATE')} className="absolute top-6 left-6 flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-full z-10">
                        <ChevronLeft size={14} /> Back to Concepts
                    </button>

                    <div className="relative h-full max-h-[85vh] aspect-[9/16] shadow-2xl border-4 border-gray-800 rounded-2xl overflow-hidden bg-black">
                        <canvas ref={canvasRef} className="w-full h-full object-contain" />
                    </div>

                    <div className="absolute bottom-8 flex flex-col items-center gap-4">
                        <button 
                            onClick={downloadImage}
                            className="bg-white text-black px-8 py-4 rounded-full font-black text-lg hover:scale-105 transition-transform flex items-center gap-3 shadow-2xl"
                        >
                            <Download size={24} /> Download Final Image
                        </button>
                        <p className="text-gray-500 text-xs">High Resolution • PNG Format</p>
                    </div>
              </div>
          )}

      </div>
    </div>
  );
};

export default ThumbnailEditor;